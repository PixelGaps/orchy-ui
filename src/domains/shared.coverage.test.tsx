import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const queryState = vi.hoisted(() => ({
  value: {
    data: undefined as unknown,
    error: null as Error | null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  },
}))
const mutationState = vi.hoisted(() => ({
  pending: false,
  error: null as Error | null,
  successValue: undefined as unknown,
  calls: [] as unknown[],
}))
const apiMocks = vi.hoisted(() => ({
  getApi: vi.fn().mockResolvedValue([]),
  getConfiguration: vi.fn().mockResolvedValue({ fields: [] }),
  previewConfiguration: vi.fn().mockResolvedValue({}),
  applyConfiguration: vi.fn().mockResolvedValue({}),
  cancelExecution: vi.fn().mockResolvedValue({ status: "accepted" }),
}))

vi.mock("@/lib/api", () => apiMocks)

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((options: {
    queryFn?: () => unknown
    refetchInterval?: (query: { state: { data: unknown } }) => unknown
  }) => {
    void options.queryFn?.()
    options.refetchInterval?.({ state: { data: queryState.value.data } })
    return queryState.value
  }),
  useMutation: vi.fn((options: {
    mutationFn?: () => unknown
    onSuccess?: (value: unknown) => void
    onError?: (error: Error) => void
  }) => ({
    isPending: mutationState.pending,
    isSuccess: mutationState.successValue !== undefined && !mutationState.error,
    error: mutationState.error,
    mutate: vi.fn((value?: unknown) => {
      mutationState.calls.push(value)
      void options.mutationFn?.()
      if (mutationState.error) {
        options.onError?.(mutationState.error)
      } else if (mutationState.successValue !== undefined) {
        options.onSuccess?.(mutationState.successValue)
      }
    }),
  })),
}))

import {
  configurationInitialValue,
  DomainConfiguration,
  ExecutionPanel,
  JsonPanel,
  SectionTabs,
  useDomainTab,
} from "./shared"

function TabProbe() {
  const [active, setActive] = useDomainTab("runtime")
  return (
    <>
      <output>{active}</output>
      <button type="button" onClick={() => setActive("settings")}>settings</button>
    </>
  )
}

describe("configurationInitialValue", () => {
  it("covers configured, invalid-choice, null and secret initialization", () => {
    expect(configurationInitialValue({ choices: ["safe", "fast"], value: "safe", secret: false })).toBe("safe")
    expect(configurationInitialValue({ choices: ["safe", "fast"], value: "legacy", secret: false })).toBe("safe")
    expect(configurationInitialValue({ choices: [], value: null, secret: false })).toBe("")
    expect(configurationInitialValue({ choices: [], value: "configured", secret: true })).toBe("")
  })
})

describe("shared domain coverage", () => {
  beforeEach(() => {
    queryState.value = {
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }
    mutationState.pending = false
    mutationState.error = null
    mutationState.successValue = undefined
    mutationState.calls = []
    vi.clearAllMocks()
  })

  it("reads and replaces domain tab query state", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/llm?tab=models"]}>
        <TabProbe />
      </MemoryRouter>,
    )
    expect(container.querySelector("output")).toHaveTextContent("models")
    fireEvent.click(screen.getByRole("button", { name: "settings" }))
    expect(container.querySelector("output")).toHaveTextContent("settings")
  })

  it("renders rich running execution metadata, evidence, error output and cancellation", () => {
    queryState.value.data = [
      {
        execution_id: "exec-1",
        kind: "task",
        state: "running",
        activity: "Working",
        task: "Ship",
        phase: "qa",
        worker: "worker-a",
        model: "qwen",
        attempt: 2,
        max_attempts: 3,
        elapsed_ms: 1250,
        validation: { status: "PASS" },
        evidence: [{ class: "qa_gate", summary: "good" }],
        error: "boom",
        output_tail: "tail",
        metadata: {
          repository: {
            id: "orchy",
            remote_identity: "PixelGaps/orchy",
            additional: [{ repository_id: "secondary" }],
            preflight: { tracked_files: 42, writable: false },
          },
          machine_result: {
            outcome: "PASS",
            evidence: { summary: "certified" },
          },
        },
      },
    ]

    render(
      <MemoryRouter>
        <ExecutionPanel kind="task" />
      </MemoryRouter>,
    )

    expect(screen.getByText("Working")).toBeInTheDocument()
    expect(screen.getByText("PixelGaps/orchy")).toBeInTheDocument()
    expect(screen.getByText(/Additional: secondary/)).toBeInTheDocument()
    expect(screen.getByText(/42 tracked · read-only/)).toBeInTheDocument()
    expect(screen.getByTestId("execution-machine-result")).toHaveTextContent("PASS")
    expect(screen.getByTestId("execution-result-evidence")).toHaveTextContent("certified")
    expect(screen.getByText("qa gate")).toBeInTheDocument()
    expect(screen.getByText(/ERROR/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(mutationState.calls).toEqual([undefined])
  })

  it("selects fallback execution, hides output, and links to the full log", () => {
    queryState.value.data = [
      {
        execution_id: "exec-2",
        kind: "task",
        state: "completed",
        task: "Done task",
        activity: "",
        evidence: [],
        metadata: { repository: [], machine_result: [] },
      },
    ]

    render(
      <MemoryRouter>
        <ExecutionPanel kind="task" showOutput={false} />
      </MemoryRouter>,
    )

    expect(screen.getByText("Ready")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View full log/ })).toHaveAttribute(
      "href",
      "/logs?tab=executions&execution=exec-2",
    )
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument()
  })

  it("renders idle execution defaults when no execution exists", () => {
    queryState.value.data = []
    render(
      <MemoryRouter>
        <ExecutionPanel />
      </MemoryRouter>,
    )
    expect(screen.getByText("No active task")).toBeInTheDocument()
    expect(screen.getByText("Waiting for execution output…")).toBeInTheDocument()
  })

  it("covers empty repository scope and invalid initial choice fallback", async () => {
    queryState.value.data = [
      {
        execution_id: "exec-scope",
        kind: "task",
        state: "completed",
        metadata: {
          repository: {
            id: "orchy",
            additional: [],
          },
        },
      },
    ]
    const view = render(
      <MemoryRouter>
        <ExecutionPanel kind="task" />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Additional: none/)).toBeInTheDocument()
    view.unmount()

    queryState.value.data = {
      fields: [{
        name: "mode",
        value: "legacy",
        type: "string",
        secret: false,
        choices: ["safe", "fast"],
        category: "",
        description: "mode",
        restart_required: false,
        host_critical: false,
      }],
    }
    render(<DomainConfiguration section="llm" />)
    await waitFor(() => expect(screen.getByDisplayValue("safe")).toBeInTheDocument())
  })

  it("covers JsonPanel loading, error, success and refresh states", () => {
    queryState.value.isLoading = true
    const { rerender } = render(<JsonPanel endpoint="/api/validation" title="Validation" />)
    expect(screen.getByText("Loading…")).toBeInTheDocument()

    queryState.value = {
      ...queryState.value,
      isLoading: false,
      error: new Error("backend failed"),
    }
    rerender(<JsonPanel endpoint="/api/validation" title="Validation" kicker="STATE" />)
    expect(screen.getByText("backend failed")).toBeInTheDocument()

    queryState.value = {
      ...queryState.value,
      error: null,
      data: { status: "PASS" },
      isFetching: true,
      refetch: vi.fn(),
    }
    rerender(<JsonPanel endpoint="/api/validation" title="Validation" />)
    expect(screen.getByText(/"status": "PASS"/)).toBeInTheDocument()
    fireEvent.click(screen.getByTitle("Refresh"))
    expect(queryState.value.refetch).toHaveBeenCalledOnce()
  })

  it("covers global configuration grouping, field selection, preview, and host-required apply", async () => {
    queryState.value.data = {
      fields: [
        {
          name: "root",
          value: "/mnt/nvme",
          type: "string",
          secret: false,
          choices: [],
          category: "Storage roots",
          description: "root path",
          restart_required: false,
          host_critical: false,
          source: "environment",
          path_status: { exists: true },
        },
        {
          name: "enabled",
          value: true,
          type: "bool",
          secret: false,
          choices: [],
          category: "Models and caches",
          description: "toggle",
          restart_required: true,
          host_critical: true,
          source: "default",
          path_status: { exists: false },
        },
        {
          name: "mode",
          value: "legacy",
          type: "string",
          secret: false,
          choices: ["safe", "fast"],
          category: "Docker / system persistence",
          description: "mode",
          restart_required: false,
          host_critical: false,
          source: "default",
          path_status: { exists: true },
        },
        {
          name: "token",
          value: "configured",
          type: "string",
          secret: true,
          choices: [],
          category: "Agent workspace",
          description: "secret",
          restart_required: false,
          host_critical: false,
          source: "environment",
          path_status: { exists: true },
        },
        {
          name: "ratio",
          value: 1.5,
          type: "float",
          secret: false,
          choices: [],
          category: "Output, proof and temporary storage",
          description: "ratio",
          restart_required: false,
          host_critical: false,
          source: "default",
          path_status: { exists: true },
        },
      ],
    }
    mutationState.successValue = {
      current: true,
      allowed: false,
      host_apply_required: true,
    }

    render(<DomainConfiguration section="global" />)

    await waitFor(() => expect(screen.getByDisplayValue("/mnt/nvme")).toBeInTheDocument())
    expect(screen.getByText("Fields").parentElement).toHaveTextContent("5")
    expect(screen.getAllByText(/override · exists/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: /Models and caches/ }))
    fireEvent.click(screen.getByRole("button", { name: /enabled/ }))
    expect(screen.getByRole("radio", { name: "On" })).toBeChecked()
    fireEvent.click(screen.getByRole("radio", { name: "Off" }))
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))

    expect(await screen.findByRole("button", { name: "Requires host-side apply" })).toBeDisabled()
    expect(screen.getByText(/host-critical change is validated/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Docker \/ system persistence/ }))
    fireEvent.click(screen.getByRole("button", { name: /mode/ }))
    expect(screen.getByDisplayValue("safe")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Agent workspace/ }))
    fireEvent.click(screen.getByRole("button", { name: /token/ }))
    expect(screen.getByPlaceholderText("Enter replacement value")).toHaveAttribute("type", "password")
    fireEvent.click(screen.getByRole("button", { name: /Output, proof and temporary storage/ }))
    fireEvent.click(screen.getByRole("button", { name: /ratio/ }))
    expect(screen.getByDisplayValue("1.5")).toHaveAttribute("type", "number")
    expect(screen.getByDisplayValue("1.5")).toHaveAttribute("step", "any")
  })


  it("covers mutation error callbacks, semantic fallbacks and keyboard tab navigation", () => {
    mutationState.error = new Error("cancel failed")
    queryState.value.data = [
      {
        execution_id: "exec-error",
        kind: "task",
        state: "running",
        evidence: [{ class: "", summary: 7 }, { summary: true }],
        metadata: {
          repository: {
            id: 42,
            additional: [{ remote_identity: "PixelGaps/secondary" }, {}],
            preflight: { tracked_files: 0, writable: true },
          },
          machine_result: { category: "fallback", evidence: { evidence_outcome: "OK" } },
        },
      },
    ]
    const tabs = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ]
    const setActive = vi.fn()
    render(
      <MemoryRouter>
        <ExecutionPanel kind="task" />
        <SectionTabs tabs={tabs} active="a" setActive={setActive} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(apiMocks.cancelExecution).toHaveBeenCalledWith("exec-error")
    expect(screen.getAllByText("log").length).toBeGreaterThan(0)
    expect(screen.getByText(/Additional:/)).toBeInTheDocument()
    expect(screen.getByText(/0 tracked · writable/)).toBeInTheDocument()
    expect(screen.getByTestId("execution-machine-result")).toHaveTextContent("fallback")
    expect(screen.getByTestId("execution-result-evidence")).toHaveTextContent("OK")

    const first = screen.getByRole("tab", { name: "A" })
    fireEvent.keyDown(first, { key: "ArrowRight" })
    fireEvent.keyDown(first, { key: "ArrowLeft" })
    fireEvent.keyDown(first, { key: "Home" })
    fireEvent.keyDown(first, { key: "End" })
    fireEvent.keyDown(first, { key: "Escape" })
    expect(setActive).toHaveBeenCalled()
  })

  it("covers configuration retry and apply error callbacks", async () => {
    queryState.value = {
      data: {
        fields: [{
          name: "name",
          value: "a",
          type: "string",
          secret: false,
          choices: [],
          category: "",
          description: "name",
          restart_required: false,
          host_critical: false,
        }],
      },
      error: new Error("load failed"),
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }
    mutationState.successValue = {
      current: "a",
      proposed: "b",
      allowed: true,
      host_apply_required: false,
      host_critical: true,
      restart_required: false,
      affected_components: [],
    }
    const { rerender } = render(<DomainConfiguration section="llm" />)
    await waitFor(() => expect(screen.getByDisplayValue("a")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    fireEvent.change(screen.getByDisplayValue("a"), { target: { value: "b" } })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    const apply = await screen.findByRole("button", { name: "Apply high-impact change" })
    mutationState.error = new Error("apply failed")
    rerender(<DomainConfiguration section="llm" />)
    fireEvent.click(apply)
    expect(queryState.value.refetch).toHaveBeenCalled()
  })

  it("executes every configuration input callback and apply success", async () => {
    queryState.value.data = {
      fields: [
        { name: "choice", value: "a", type: "string", secret: false, choices: ["a", "b"], category: "", description: "choice", restart_required: false, host_critical: false },
        { name: "toggle", value: true, type: "bool", secret: false, choices: [], category: "", description: "toggle", restart_required: false, host_critical: false },
      ],
    }
    mutationState.error = null
    mutationState.successValue = { current: "a", proposed: "b", allowed: true, host_apply_required: false, restart_required: false, affected_components: [] }
    render(<DomainConfiguration section="llm" />)
    await waitFor(() => expect(screen.getByDisplayValue("a")).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue("a"), { target: { value: "b" } })
    fireEvent.click(screen.getByRole("button", { name: /toggle/ }))
    fireEvent.click(screen.getByRole("radio", { name: "Off" }))
    fireEvent.click(screen.getByRole("radio", { name: "On" }))
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    fireEvent.click(await screen.findByRole("button", { name: "Apply confirmed change" }))
    expect(queryState.value.refetch).toHaveBeenCalled()
  })

  it("covers non-global configuration and successful apply", async () => {
    queryState.value.data = {
      fields: [
        {
          name: "context",
          value: 16384,
          type: "int",
          secret: false,
          choices: [],
          category: "",
          description: "context",
          restart_required: true,
          host_critical: false,
        },
      ],
    }
    mutationState.successValue = {
      current: 16384,
      allowed: true,
      host_apply_required: false,
    }

    render(<DomainConfiguration section="llm" />)
    await waitFor(() => expect(screen.getByDisplayValue("16384")).toBeInTheDocument())
    expect(screen.getByText(/requires runtime restart/)).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue("16384"), { target: { value: "8192" } })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    const apply = await screen.findByRole("button", { name: "Apply confirmed change" })
    expect(apply).not.toBeDisabled()
    mutationState.successValue = { status: "applied" }
    fireEvent.click(apply)
    expect(queryState.value.refetch).toHaveBeenCalled()
  })

  it("covers execution diagnostics and cancellation success callback", () => {
    mutationState.successValue = { status: "accepted" }
    queryState.value.data = [{
      execution_id:"exec-diag", kind:"task", state:"running", activity:"Diagnosing",
      evidence:[], output_tail:"",
      metadata:{
        repository:{id:"orchy",additional:[],preflight:{}},
        machine_result:{
          outcome:"",
          category:"diagnostic",
          evidence:{summary:"",evidence_outcome:"retained"},
          metadata:{diagnostics:{
            failure_class:"validation",
            next_action:"repair",
            failed_checks:["lint","",7],
            attempted_repair:["rewrite",false],
          }},
        },
      },
    }]
    render(<MemoryRouter><ExecutionPanel kind="task" /></MemoryRouter>)
    expect(screen.getByTestId("execution-diagnostics")).toHaveTextContent("validation")
    expect(screen.getByTestId("execution-diagnostics")).toHaveTextContent("failed: lint, 7")
    expect(screen.getByTestId("execution-diagnostics")).toHaveTextContent("repair: rewrite, false")
    fireEvent.click(screen.getByRole("button",{name:"Cancel"}))
    expect(apiMocks.cancelExecution).toHaveBeenCalledWith("exec-diag")
  })



  it("selects an explicit execution id before kind/state fallback", () => {
    queryState.value.data = [
      { execution_id:"other",kind:"task",state:"running",activity:"Other",evidence:[],metadata:{} },
      { execution_id:"chosen",kind:"task",state:"completed",activity:"Chosen",evidence:[],metadata:{} },
    ]
    render(<MemoryRouter><ExecutionPanel executionId="chosen" /></MemoryRouter>)
    expect(screen.getByText("Chosen")).toBeInTheDocument()
    expect(screen.queryByText("Other")).not.toBeInTheDocument()
  })



  it("covers remaining shared fallback and pending branches", async () => {
    queryState.value = {
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }
    const idle = render(
      <MemoryRouter>
        <ExecutionPanel />
      </MemoryRouter>,
    )
    expect(screen.getByText("No active task")).toBeInTheDocument()
    idle.unmount()

    mutationState.pending = true
    queryState.value.data = [{
      execution_id: undefined,
      kind: "task",
      state: "running",
      activity: "",
      task: "",
      evidence: [],
      error: "failure",
      output_tail: "",
      metadata: {
        repository: { id: "", additional: [], preflight: {} },
        machine_result: {
          category: "",
          evidence: {},
          metadata: { diagnostics: { failed_checks: [], attempted_repair: [] } },
        },
      },
    }]
    const pending = render(
      <MemoryRouter>
        <ExecutionPanel kind="task" />
      </MemoryRouter>,
    )
    expect(screen.getByRole("button", { name: "Cancelling…" })).toBeDisabled()
    expect(screen.getByText(/ERROR/)).toBeInTheDocument()
    pending.unmount()
    mutationState.pending = false
    mutationState.successValue = { status: "accepted" }
    const view = render(
      <MemoryRouter>
        <ExecutionPanel kind="task" />
      </MemoryRouter>,
    )
    fireEvent.click(within(view.container).getByRole("button", { name: "Cancel" }))
    expect(apiMocks.cancelExecution).toHaveBeenCalledWith("")
    expect(screen.getByTestId("execution-diagnostics")).not.toHaveTextContent("failed:")
    expect(screen.getByTestId("execution-diagnostics")).not.toHaveTextContent("repair:")
  })

  it("covers null first configuration value without choices", async () => {
    queryState.value.data = {
      fields: [{
        name: "first-null",
        value: null,
        type: "string",
        secret: false,
        choices: [],
        category: "",
        description: "null",
        restart_required: false,
        host_critical: false,
      }],
    }
    render(<DomainConfiguration section="llm" />)
    await waitFor(() => expect(screen.getByDisplayValue("")).toBeInTheDocument())
  })

  it("covers null configuration values across initialization and field selection", async () => {
    queryState.value.data = {
      fields: [
        {
          name: "plain-start",
          value: "start",
          type: "string",
          secret: false,
          choices: [],
          category: "",
          description: "start",
          restart_required: false,
          host_critical: false,
        },
        {
          name: "choice-null",
          value: null,
          type: "string",
          secret: false,
          choices: ["safe"],
          category: "",
          description: "choice",
          restart_required: false,
          host_critical: false,
        },
        {
          name: "plain-null",
          value: null,
          type: "string",
          secret: false,
          choices: [],
          category: "",
          description: "plain",
          restart_required: false,
          host_critical: false,
        },
      ],
    }
    render(<DomainConfiguration section="llm" />)
    await waitFor(() => expect(screen.getByDisplayValue("start")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /choice-null/ }))
    expect(screen.getByDisplayValue("safe")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /plain-null/ }))
    expect(screen.getByDisplayValue("")).toBeInTheDocument()
  })

  it("covers default tab, empty configuration and secret display fallbacks", async () => {
    const tab = render(
      <MemoryRouter>
        <TabProbe />
      </MemoryRouter>,
    )
    expect(tab.container.querySelector("output")).toHaveTextContent("runtime")
    tab.unmount()

    queryState.value = {
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }
    const empty = render(<DomainConfiguration section="llm" />)
    expect(screen.getByText("Fields").parentElement).toHaveTextContent("Unavailable")
    empty.unmount()

    queryState.value.data = {
      fields: [{
        name: "secret",
        value: "",
        type: "string",
        secret: true,
        choices: [],
        category: "",
        description: "secret",
        restart_required: false,
        host_critical: false,
      }],
    }
    render(<DomainConfiguration section="llm" />)
    await waitFor(() => expect(screen.getByText("not configured")).toBeInTheDocument())
  })

  it("covers preview nullish and restart branches", async () => {
    queryState.value.data = {
      fields: [{
        name: "value",
        value: "",
        type: "string",
        secret: false,
        choices: [],
        category: "",
        description: "value",
        restart_required: false,
        host_critical: false,
      }],
    }
    mutationState.successValue = {
      current: null,
      proposed: null,
      allowed: false,
      reason: "",
      restart_required: true,
      host_apply_required: false,
      affected_components: [],
    }
    render(<DomainConfiguration section="llm" />)
    await waitFor(() => expect(screen.getByDisplayValue("")).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue(""), { target: { value: "next" } })
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    expect(await screen.findByText("blocked")).toBeInTheDocument()
    expect(screen.getByText("required")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

})
