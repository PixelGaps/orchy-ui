import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const sharedState = vi.hoisted(() => ({
  tab: "runtime",
  executions: [] as any[],
}))
const queryState = vi.hoisted(() => ({
  values: new Map<string, any>(),
}))
const mutationState = vi.hoisted(() => ({
  values: new Map<string, any>(),
  deepResearchOrdinal: 0,
}))
const apiMocks = vi.hoisted(() => ({
  getApi: vi.fn().mockResolvedValue({}),
  postApi: vi.fn().mockResolvedValue({ status: "accepted" }),
  postJSON: vi.fn().mockResolvedValue({ status: "accepted" }),
  runHealthcheck: vi.fn().mockResolvedValue({ status: "accepted" }),
}))

vi.mock("@/lib/api", () => apiMocks)

vi.mock("@/domains/shared", () => ({
  useDomainTab: () => [sharedState.tab, vi.fn()] as const,
  useExecutions: () => ({ data: sharedState.executions }),
  SectionTabs: ({ active }: { active: string }) => <div data-testid="tabs">{active}</div>,
  DomainConfiguration: ({ section }: { section: string }) => <div>config:{section}</div>,
  ExecutionPanel: ({ kind }: { kind?: string }) => <div>execution:{kind || "all"}</div>,
  JsonPanel: ({ title }: { title: string }) => <div>json:{title}</div>,
  SemanticEvents: ({ events }: { events: unknown[] }) => <div>events:{events.length}</div>,
  statusTone: (value?: string) => value === "completed" ? "live" : value === "failed" ? "danger" : "neutral",
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((options: {
    queryKey?: unknown[]
    queryFn?: () => unknown
    refetchInterval?: ((query: { state: { data: unknown } }) => unknown) | number | false
  }) => {
    const key = String(options.queryKey?.[0] ?? "")
    const value = queryState.values.get(key) ?? {
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }
    void options.queryFn?.()
    if (typeof options.refetchInterval === "function") {
      options.refetchInterval({ state: { data: value.data } })
    }
    return value
  }),
  useMutation: vi.fn((options: {
    mutationFn?: (...args: any[]) => unknown
    onSuccess?: (value: any, ...args: any[]) => void
    onError?: (error: Error) => void
  }) => {
    const source = String(options.mutationFn ?? "")
    const deepResearchKey = ["research", "runtime-start", "runtime-stop"][mutationState.deepResearchOrdinal % 3]
    const key =
      source.includes("runHealthcheck") ? "healthcheck"
        : source.includes("/api/tasks") ? "task"
          : deepResearchKey
    mutationState.deepResearchOrdinal += 1
    const value = mutationState.values.get(key) ?? {}
    return {
      isPending: Boolean(value.isPending),
      variables: value.variables,
      error: value.error ?? null,
      mutate: vi.fn((...args: any[]) => {
        value.mutated = true
        value.variables = args[0]
        void options.mutationFn?.(...args)
        if (value.error) options.onError?.(value.error)
        else if ("success" in value) options.onSuccess?.(value.success, ...args)
      }),
    }
  }),
}))

vi.mock("@/domains/comfyui/image-factory/page", () => ({
  ImageFactory: ({ embedded }: { embedded?: boolean }) => (
    <div>image-factory:{embedded ? "embedded" : "full"}</div>
  ),
}))

import { ComfyUIPage } from "@/domains/comfyui/page"
import { HealthcheckPage, healthcheckRunSummary } from "@/domains/healthcheck/page"
import { DeepResearchPage, authorityTone, runtimeSummary } from "@/domains/llm/deep-research/page"
import { LLMPage } from "@/domains/llm/page"
import { LogsPage, formatExecutionTimestamp, renderEvidenceValue } from "@/domains/logs/page"
import { GlobalSettingsPage } from "@/domains/settings/page"

function renderPage(node: React.ReactNode, route = "/") {
  return render(<MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>)
}

describe("top-level domain page coverage", () => {
  beforeEach(() => {
    sharedState.tab = "runtime"
    sharedState.executions = []
    queryState.values.clear()
    mutationState.values.clear()
    mutationState.deepResearchOrdinal = 0
    vi.clearAllMocks()
  })

  it("covers every LLM tab and runtime/model/capability branches", () => {
    queryState.values.set("llm-runtime", {
      data: {
        model: "qwen",
        base_url: "http://localhost",
        health_url: "http://localhost/health",
        containers: ["vllm"],
        models: { vllm: ["qwen", "deepseek"], ollama: ["gemma"] },
      },
    })
    queryState.values.set("capability-registry", {
      data: {
        entries: [
          { id: "a", label: "A", platform: "vllm", status: "available", reason: "", capabilities: ["chat"] },
          { id: "b", label: "B", platform: "host", status: "host-required", reason: "gpu", capabilities: [] },
          { id: "c", label: "C", platform: "x", status: "offline", reason: "", capabilities: [] },
        ],
      },
    })

    sharedState.tab = "runtime"
    const { rerender } = renderPage(<LLMPage />)
    expect(screen.getByText("ready")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Runtime endpoints/ }))
    expect(screen.getByText("http://localhost")).toBeInTheDocument()

    sharedState.tab = "models"
    rerender(<MemoryRouter><LLMPage /></MemoryRouter>)
    expect(screen.getByText("qwen")).toBeInTheDocument()
    expect(screen.getByText("gemma")).toBeInTheDocument()

    sharedState.tab = "capabilities"
    rerender(<MemoryRouter><LLMPage /></MemoryRouter>)
    expect(screen.getByText("A")).toBeInTheDocument()
    expect(screen.getByText(/gpu/)).toBeInTheDocument()
    expect(screen.getByText(/contract available/)).toBeInTheDocument()

    sharedState.tab = "settings"
    rerender(<MemoryRouter><LLMPage /></MemoryRouter>)
    expect(screen.getByText("config:llm")).toBeInTheDocument()
  })

  it("covers ComfyUI image, runtime and settings tabs", () => {
    queryState.values.set("comfyui-runtime", {
      data: {
        url: "http://comfy.test",
        health_url: "http://comfy.test/health",
        output_dir: "/outputs",
        workflow_path: "/workflow.json",
      },
    })

    sharedState.tab = "image-factory"
    const { rerender } = renderPage(<ComfyUIPage />)
    expect(screen.queryByText("image-factory:embedded")).not.toBeInTheDocument()

    sharedState.tab = "runtime"
    rerender(<MemoryRouter><ComfyUIPage /></MemoryRouter>)
    expect(screen.getByText("http://comfy.test")).toBeInTheDocument()
    expect(screen.getByText("/outputs")).toBeInTheDocument()

    sharedState.tab = "settings"
    rerender(<MemoryRouter><ComfyUIPage /></MemoryRouter>)
    expect(screen.getByText("config:comfyui")).toBeInTheDocument()
  })

  it("covers healthcheck summaries, mutation callbacks, pending state and log actions", () => {
    const refetch = vi.fn()
    const healthMutation = {
      mutated: false,
      success: { status: "accepted" },
      isPending: false,
      variables: undefined,
    }
    mutationState.values.set("healthcheck", healthMutation)
    queryState.values.set("healthchecks", {
      data: [
        {
          id: "ok",
          label: "Passing check",
          domain: "llm",
          resource_class: "cpu",
          gpu_required: false,
          description: "healthy",
          latest: {
            state: "completed",
            execution_id: "exec-ok",
            updated_at: 1_700_000_000,
            elapsed_ms: 2500,
          },
        },
        {
          id: "bad",
          label: "GPU check",
          domain: "image",
          resource_class: "gpu",
          gpu_required: true,
          description: "needs attention",
          latest: {
            state: "failed",
            error: "failed hard",
            started_at: "2026-09-25T18:00:00Z",
            elapsed_ms: 0,
          },
        },
        {
          id: "never",
          label: "Never check",
          domain: "host",
          resource_class: "cpu",
          gpu_required: false,
          description: "never",
          latest: null,
        },
        {
          id: "blocked",
          label: "Blocked check",
          domain: "host",
          resource_class: "cpu",
          gpu_required: false,
          description: "blocked",
          latest: { state: "resource_blocked", created_at: "2026-09-25T18:05:00Z" },
        },
      ],
      error: null,
      isLoading: false,
      isFetching: false,
      isError: false,
      dataUpdatedAt: 1,
      refetch,
    })

    const { rerender } = renderPage(<HealthcheckPage />)
    expect(screen.getByText("failed hard")).toBeInTheDocument()
    expect(screen.getByText(/never run/)).toBeInTheDocument()
    expect(screen.getAllByText(/duration n\/a/).length).toBeGreaterThan(0)
    expect(screen.getByText(/2.5s/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: /Passing check/ })[0])
    expect(screen.getByRole("link", { name: "View log" })).toHaveAttribute(
      "href",
      "/logs?tab=healthchecks&execution=exec-ok",
    )
    fireEvent.click(screen.getByTestId("healthcheck-run-bad"))
    expect(healthMutation.mutated).toBe(true)
    expect(apiMocks.runHealthcheck).toHaveBeenCalledWith("bad")
    expect(refetch).toHaveBeenCalled()

    healthMutation.error = new Error("launch failed")
    healthMutation.success = undefined
    rerender(<MemoryRouter><HealthcheckPage /></MemoryRouter>)
    fireEvent.click(screen.getByTestId("healthcheck-run-never"))
    expect(apiMocks.runHealthcheck).toHaveBeenCalledWith("never")

    healthMutation.error = null
    healthMutation.isPending = true
    healthMutation.variables = "ok"
    rerender(<MemoryRouter><HealthcheckPage /></MemoryRouter>)
    expect(screen.getByText(/One host certification launch is being submitted/)).toBeInTheDocument()
    expect(screen.getByTestId("healthcheck-run-ok")).toHaveTextContent("Starting…")
    expect(screen.getByTestId("healthcheck-run-bad")).toBeDisabled()
  })

  it("covers healthcheck pre-data fallback branches", () => {
    queryState.values.set("healthchecks", {
      data: undefined,
      error: null,
      isLoading: true,
      isFetching: true,
      isError: false,
      dataUpdatedAt: 0,
      refetch: vi.fn(),
    })

    renderPage(<HealthcheckPage />)

    expect(screen.getByText("Checks").closest("div")).toHaveTextContent("Unavailable")
    expect(screen.getByText("Passing").closest("div")).toHaveTextContent("Unavailable")
    expect(screen.getByText("Attention").closest("div")).toHaveTextContent("Unavailable")
    expect(screen.getByText("GPU").closest("div")).toHaveTextContent("0")
  })

  it("covers every evidence scalar renderer", () => {
    expect(renderEvidenceValue(null)).toBe("null")
    expect(renderEvidenceValue("text")).toBe("text")
    expect(renderEvidenceValue(7)).toBe("7")
    expect(renderEvidenceValue(true)).toBe("true")
    expect(renderEvidenceValue(7n)).toBe("7")
    expect(renderEvidenceValue(undefined)).toBe("")
    expect(renderEvidenceValue({ ok: true })).toBe('{"ok":true}')
  })

  it("covers logs execution selection, filtering, healthchecks, jobs, CI and evidence tabs", () => {
    queryState.values.set("operator-logs", {
      data: {
        executions: [
          {
            execution_id: "exec-123456",
            activity: "Build",
            task: "Task A",
            kind: "task",
            state: "failed",
            phase: "qa",
            worker: "w",
            model: "m",
            attempt: 0,
            max_attempts: 0,
            validation: { status: "FAIL" },
            evidence: [{ class: "qa", summary: "x" }],
            error: "boom",
            output_tail: "tail",
            metadata: { note: "meta" },
            updated_at: Date.now() - 30_000,
          },
          {
            execution_id: "exec-abcdef",
            activity: "Other",
            task: "Task B",
            kind: "task",
            state: "completed",
            evidence: [],
            metadata: { note: "fallback" },
            worker: "other-worker",
            updated_at: Date.now() - 120_000,
          },
          {
            execution_id: "exec-oldest",
            activity: "",
            task: "Old",
            kind: "mission",
            state: "running",
            evidence: [],
            metadata: {},
            created_at: Date.now() - 7_200_000,
          },
          {
            execution_id: "exec-undated",
            activity: "",
            task: "Undated",
            kind: "",
            state: "",
            evidence: [],
            metadata: {},
          },
        ],
        healthchecks: [
          {
            execution_id: "health-1",
            activity: "Health",
            task: "Host check",
            kind: "health",
            state: "completed",
            evidence: [],
            metadata: {},
          },
        ],
        jobs: [{ id: 1 }],
        ci_runs: [
          {
            databaseId: 1,
            url: "https://example.test/run",
            displayTitle: "CI",
            name: "fallback",
            headBranch: "main",
            event: "push",
            conclusion: "completed",
            status: "done",
          },
        ],
        evidence: { verdict: "PASS" },
      },
    })

    sharedState.tab = "executions"
    const { rerender } = renderPage(<LogsPage />, "/logs?execution=exec-123456")
    fireEvent.click(screen.getByRole("button", { name: /Raw execution output/ }))
    expect(screen.getByText(/boom/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Semantic evidence/ }))
    expect(screen.getByText("events:1")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Filter operational runs"), { target: { value: "other" } })
    expect(screen.queryByText("Build")).not.toBeInTheDocument()
    expect(screen.getByText("Other")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Filter by state"), { target: { value: "completed" } })
    fireEvent.change(screen.getByLabelText("Filter by kind"), { target: { value: "task" } })
    fireEvent.change(screen.getByLabelText("Filter by worker"), { target: { value: "other-worker" } })
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByText(/2m ago/)).toBeInTheDocument()
    expect(screen.getByText(/2h ago/)).toBeInTheDocument()
    expect(screen.getByText(/time n\/a/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Disable output wrapping" }))
    expect(screen.getByRole("button", { name: "Wrap output" })).toBeInTheDocument()
    const createObjectURL = vi.fn(() => "blob:log")
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    })
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    fireEvent.click(screen.getByRole("button", { name: "Download output" }))
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:log")
    click.mockRestore()

    sharedState.tab = "healthchecks"
    rerender(<MemoryRouter initialEntries={["/logs"]}><LogsPage /></MemoryRouter>)
    expect(screen.getByText("Healthcheck runs")).toBeInTheDocument()

    sharedState.tab = "jobs"
    rerender(<MemoryRouter><LogsPage /></MemoryRouter>)
    expect(screen.getByText(/"id": 1/)).toBeInTheDocument()
    queryState.values.set("operator-logs", {
      data: { executions: [], healthchecks: [], jobs: [], ci_runs: [], evidence: {} },
    })
    rerender(<MemoryRouter><LogsPage /></MemoryRouter>)
    expect(screen.getByText("No jobs retained")).toBeInTheDocument()

    queryState.values.set("operator-logs", {
      data: {
        executions: [],
        healthchecks: [],
        jobs: [],
        ci_runs: [{
          databaseId: 2,
          url: "https://example.test/fallback",
          displayTitle: "",
          name: "Fallback CI",
          headBranch: "dev",
          event: "workflow_dispatch",
          conclusion: "",
          status: "queued",
        }],
        evidence: {},
      },
    })

    sharedState.tab = "ci"
    rerender(<MemoryRouter><LogsPage /></MemoryRouter>)
    expect(screen.getByRole("link", { name: /Fallback CI/ })).toHaveAttribute("href", "https://example.test/fallback")

    queryState.values.set("operator-logs", {
      data: {
        executions: [],
        healthchecks: [],
        jobs: [],
        ci_runs: [],
        evidence: { verdict: "PASS", attempts: 3, accepted: true, missing: null },
      },
    })
    sharedState.tab = "evidence"
    rerender(<MemoryRouter><LogsPage /></MemoryRouter>)
    expect(screen.getByText(/"verdict": "PASS"/)).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("true")).toBeInTheDocument()
    expect(screen.getByText("null")).toBeInTheDocument()
  })


  it("covers retry callbacks for every queried top-level domain", () => {
    const cases: Array<[string, React.ReactNode]> = [
      ["comfyui-runtime", <ComfyUIPage />],
      ["llm-runtime", <LLMPage />],
      ["healthchecks", <HealthcheckPage />],
      ["operator-logs", <LogsPage />],
      ["deep-research-runtime", <DeepResearchPage />],
    ]
    for (const [key, node] of cases) {
      const refetch = vi.fn()
      queryState.values.clear()
      queryState.values.set(key, {
        data: key === "healthchecks" ? [] : undefined,
        error: new Error(`${key} unavailable`),
        isLoading: false,
        isFetching: false,
        isError: true,
        dataUpdatedAt: 0,
        refetch,
      })
      sharedState.tab = key === "operator-logs" ? "executions"
        : key === "deep-research-runtime" ? "research"
          : key === "comfyui-runtime" ? "runtime"
            : "runtime"
      const view = renderPage(node)
      const retry = screen.queryByRole("button", { name: /Retry/ })
      if (retry) {
        fireEvent.click(retry)
        expect(refetch).toHaveBeenCalled()
      }
      view.unmount()
    }
  })

  it("covers global settings wrapper", () => {
    renderPage(<GlobalSettingsPage />)
    expect(screen.getByRole("heading", { name: "Global Settings" })).toBeInTheDocument()
    expect(screen.getByText("config:global")).toBeInTheDocument()
  })

  it("covers Deep Research offline, successful research result, runtime and settings states", async () => {
    queryState.values.set("deep-research-runtime", {
      data: {
        ready: false,
        model_present: false,
        provider: "vllm",
        detail: "offline",
        capabilities: [],
      },
      isFetching: false,
      refetch: vi.fn(),
    })

    mutationState.values.set("runtime-start", {
      mutated: false,
      success: { ready: true },
    })

    sharedState.tab = "research"
    const { rerender } = renderPage(<DeepResearchPage />)
    expect(screen.getByText("offline")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Start runtime/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Run Deep Research/ })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: /Start runtime/ }))
    expect(apiMocks.postApi).toHaveBeenCalledWith("/api/deep-research/runtime/start", {})

    queryState.values.set("deep-research-runtime", {
      data: {
        ready: true,
        model_present: true,
        model: "qwen",
        model_path: "/models/qwen",
        provider: "vllm",
        capabilities: ["search", "synthesis"],
      },
      isFetching: true,
      refetch: vi.fn(),
    })
    mutationState.values.set("runtime-start", {
      mutated: false,
      success: { ready: true },
    })
    mutationState.values.set("runtime-stop", {
      mutated: false,
      success: { ready: false },
    })
    mutationState.values.set("research", {
      mutated: false,
      success: {
        evidence_count: 2,
        ranking_mode: "authority_first",
        answer: "# Heading\n## Section\n### Detail\n\n- bullet\n* second\n1. numbered\nGrounded answer",
        queries: ["q1", "q2"],
        sources: [
          { id: "p", title: "Primary", query: "q1", url: "https://p.test", authority: "primary", domain: "p.test", published_at: "2026-09-25", snippet: "primary evidence" },
          { id: "s", title: "Secondary", query: "q2", url: "https://s.test", authority: "secondary" },
          { id: "u", title: "Unknown", query: "q2", url: "https://u.test", authority: undefined },
        ],
      },
    })

    rerender(<MemoryRouter><DeepResearchPage /></MemoryRouter>)
    const textarea = screen.getByPlaceholderText(/Compare the strongest evidence/)
    fireEvent.change(textarea, { target: { value: "abc" } })
    for (const preset of ["Quick", "Standard", "Thorough"]) {
      fireEvent.click(screen.getByRole("button", { name: preset }))
    }
    fireEvent.click(screen.getByRole("button", { name: /Advanced research budget/ }))
    const numberInputs = screen.getAllByRole("spinbutton")
    fireEvent.change(numberInputs[0], { target: { value: "4" } })
    fireEvent.change(numberInputs[1], { target: { value: "8" } })
    fireEvent.click(screen.getByRole("button", { name: /Run Deep Research/ }))
    expect((await screen.findAllByText("Grounded answer")).length).toBeGreaterThan(0)
    expect(screen.getByText("PRIMARY")).toBeInTheDocument()
    expect(screen.getByText("SECONDARY")).toBeInTheDocument()
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Section" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Detail" })).toBeInTheDocument()
    expect(screen.getByText("bullet")).toBeInTheDocument()
    expect(screen.getByText("numbered")).toBeInTheDocument()

    sharedState.tab = "runtime"
    rerender(<MemoryRouter><DeepResearchPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole("button", { name: /Runtime details/ }))
    expect(screen.getByText("/models/qwen")).toBeInTheDocument()
    fireEvent.click(screen.getByTitle("Refresh"))
    fireEvent.click(screen.getByRole("button", { name: /Stop runtime/ }))
    expect(apiMocks.postApi).toHaveBeenCalledWith("/api/deep-research/runtime/stop", {})

    sharedState.tab = "settings"
    rerender(<MemoryRouter><DeepResearchPage /></MemoryRouter>)
    expect(screen.getByText("config:deep_research")).toBeInTheDocument()
  })

  it("covers Deep Research installed-but-not-ready and runtime mutation errors/pending states", () => {
    queryState.values.set("deep-research-runtime", {
      data: {
        ready: false,
        model_present: true,
        model: "qwen",
        provider: "vllm",
        detail: "stopped",
        capabilities: [],
      },
      refetch: vi.fn(),
    })
    mutationState.values.set("research", { isPending: false, error: new Error("research failed") })
    mutationState.values.set("runtime-start", { isPending: false, error: new Error("start failed") })
    mutationState.values.set("runtime-stop", { isPending: false, error: new Error("stop failed") })
    mutationState.values.set("default", { isPending: true, error: new Error("runtime failed") })

    sharedState.tab = "research"
    const { rerender } = renderPage(<DeepResearchPage />)
    expect(screen.getByText("installed")).toBeInTheDocument()
    expect(screen.getByText("research failed")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Start runtime/ }))

    sharedState.tab = "runtime"
    rerender(<MemoryRouter><DeepResearchPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole("button", { name: /Start runtime/ }))

    queryState.values.set("deep-research-runtime", {
      data: {
        ready: true,
        model_present: true,
        model: "qwen",
        provider: "vllm",
        detail: "ready",
        capabilities: [],
      },
      refetch: vi.fn(),
    })
    rerender(<MemoryRouter><DeepResearchPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole("button", { name: /Stop runtime/ }))
  })

  it("covers pure presentation helper branch matrices", () => {
    expect(runtimeSummary(true, false)).toEqual({ value: "ready", tone: "live" })
    expect(runtimeSummary(false, true)).toEqual({ value: "installed", tone: "warn" })
    expect(runtimeSummary(false, false)).toEqual({ value: "offline", tone: "neutral" })

    expect(authorityTone("primary")).toBe("live")
    expect(authorityTone("secondary")).toBe("warn")
    expect(authorityTone(undefined)).toBe("neutral")

    const now = Date.UTC(2026, 8, 29, 12, 0, 0)
    expect(formatExecutionTimestamp({} as any, now)).toBe("time n/a")
    expect(formatExecutionTimestamp({ updated_at: (now - 15_000) / 1000 } as any, now)).toBe("15s ago")
    expect(formatExecutionTimestamp({ started_at: new Date(now - 120_000).toISOString() } as any, now)).toBe("2m ago")
    expect(formatExecutionTimestamp({ created_at: new Date(now - 7_200_000).toISOString() } as any, now)).toBe("2h ago")
    expect(formatExecutionTimestamp({ updated_at: new Date(now + 5_000).toISOString() } as any, now)).toBe("1s ago")

    expect(healthcheckRunSummary({
      domain: "host", resource_class: "cpu", gpu_required: false, latest: null,
    })).toContain("CPU / adapter · never run · duration n/a")
    expect(healthcheckRunSummary({
      domain: "image", resource_class: "gpu", gpu_required: true,
      latest: { updated_at: 1_700_000_000, elapsed_ms: 2500 },
    })).toContain("GPU")
    expect(healthcheckRunSummary({
      domain: "llm", resource_class: "cpu", gpu_required: false,
      latest: { started_at: "2026-09-29T00:00:00Z", elapsed_ms: 0 },
    })).toContain("duration n/a")
  })


  it("covers healthcheck empty-query fallbacks", () => {
    queryState.values.set("healthchecks", {
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      isError: false,
      dataUpdatedAt: 0,
      refetch: vi.fn(),
    })
    renderPage(<HealthcheckPage />)
    expect(screen.getByText("Checks").parentElement).toHaveTextContent("Unavailable")
    expect(screen.getByText("Passing").parentElement).toHaveTextContent("Unavailable")
    expect(screen.getByText("Attention").parentElement).toHaveTextContent("Unavailable")
    expect(screen.getByText("GPU").parentElement).toHaveTextContent("Unavailable")
  })

  it("covers Deep Research pending labels and runtime error precedence", () => {
    queryState.values.set("deep-research-runtime", {
      data: {
        ready: false,
        model_present: true,
        model: "qwen",
        provider: "vllm",
        detail: "stopped",
        capabilities: [],
      },
      refetch: vi.fn(),
    })
    mutationState.values.set("research", { isPending: true })
    mutationState.values.set("runtime-start", { isPending: true, error: new Error("start first") })
    mutationState.values.set("runtime-stop", { isPending: false, error: new Error("stop second") })

    sharedState.tab = "research"
    const { rerender } = renderPage(<DeepResearchPage />)
    expect(screen.getByRole("button", { name: /Starting/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Researching/ })).toBeDisabled()

    sharedState.tab = "runtime"
    rerender(<MemoryRouter><DeepResearchPage /></MemoryRouter>)
    expect(screen.getByText("start first")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Starting/ })).toBeDisabled()

    queryState.values.set("deep-research-runtime", {
      data: {
        ready: true,
        model_present: true,
        model: "qwen",
        provider: "vllm",
        detail: "ready",
        capabilities: [],
      },
      refetch: vi.fn(),
    })
    mutationState.values.set("runtime-start", { isPending: false })
    mutationState.values.set("runtime-stop", { isPending: true })
    rerender(<MemoryRouter><DeepResearchPage /></MemoryRouter>)
    expect(screen.getByRole("button", { name: /Stopping/ })).toBeDisabled()
  })

  it("covers Logs empty data, error-only output, empty evidence and job label fallbacks", () => {
    queryState.values.set("operator-logs", {
      data: {
        executions: [{
          execution_id: "err-only",
          activity: "",
          task: "",
          kind: "",
          state: "failed",
          evidence: undefined,
          metadata: {},
          error: "only error",
          output_tail: "",
        }],
        healthchecks: undefined,
        jobs: [
          { label: null, job: null, name: null, id: null, status: null, state: null, phase: null },
          { label: null, job: "fallback-job", status: null, state: "queued" },
        ],
        ci_runs: [],
        evidence: {},
      },
    })
    sharedState.tab = "executions"
    const { rerender } = renderPage(<LogsPage />, "/logs?execution=err-only")
    fireEvent.click(screen.getByRole("button", { name: /Raw execution output/ }))
    expect(screen.getByText(/only error/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Semantic evidence/ }))
    expect(screen.getByText("events:0")).toBeInTheDocument()

    const createObjectURL = vi.fn(() => "blob:empty")
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    fireEvent.click(screen.getByRole("button", { name: "Download output" }))
    expect(createObjectURL).toHaveBeenCalled()
    click.mockRestore()

    sharedState.tab = "healthchecks"
    rerender(<MemoryRouter><LogsPage /></MemoryRouter>)
    expect(screen.getByText("Healthcheck runs")).toBeInTheDocument()

    sharedState.tab = "jobs"
    rerender(<MemoryRouter><LogsPage /></MemoryRouter>)
    expect(screen.getByText("Job 1")).toBeInTheDocument()
    expect(screen.getByText("fallback-job")).toBeInTheDocument()
    expect(screen.getByText("retained")).toBeInTheDocument()
    expect(screen.getByText("record")).toBeInTheDocument()
  })


  it("covers stop-only Deep Research runtime error fallback", () => {
    queryState.values.set("deep-research-runtime", {
      data: {
        ready: true,
        model_present: true,
        model: "qwen",
        provider: "vllm",
        detail: "ready",
        capabilities: [],
      },
      refetch: vi.fn(),
    })
    mutationState.values.set("runtime-start", { isPending: false, error: null })
    mutationState.values.set("runtime-stop", { isPending: false, error: new Error("stop only") })
    sharedState.tab = "runtime"
    renderPage(<DeepResearchPage />)
    expect(screen.getByText("stop only")).toBeInTheDocument()
  })

  it("covers empty execution output download fallback", () => {
    queryState.values.set("operator-logs", {
      data: {
        executions: [{
          execution_id: "empty-output",
          activity: "",
          task: "",
          kind: "",
          state: "completed",
          evidence: [],
          metadata: {},
          error: "",
          output_tail: "",
        }],
        healthchecks: [],
        jobs: [],
        ci_runs: [],
        evidence: {},
      },
    })
    sharedState.tab = "executions"
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:empty") })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    renderPage(<LogsPage />, "/logs?execution=empty-output")
    fireEvent.click(screen.getByRole("button", { name: "Download output" }))
    expect(URL.createObjectURL).toHaveBeenCalled()
    click.mockRestore()
  })

})
