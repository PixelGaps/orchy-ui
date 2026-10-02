import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

const SHA = "a".repeat(40)

const runningSession = {
  session_id: "session-1",
  execution_id: "exec-1",
  repository_id: "agents-sandbox",
  target_sha: SHA,
  runtime: "aider",
  effort: "MEDIUM",
  enabled_plugins: ["local-echo"],
  attachments: [],
  turn_count: 1,
  state: "accepted",
  parent_execution_id: null,
  execution: { execution_id: "exec-1", state: "running" },
}

const failedSession = {
  ...runningSession,
  execution: {
    execution_id: "exec-1",
    state: "failed",
    error: "validation failed",
    validation: { status: "failed" },
  },
}

const mocks = vi.hoisted(() => ({
  listRepositories: vi.fn(),
  listPlugins: vi.fn(),
  start: vi.fn(),
  getSession: vi.fn(),
  sendMessage: vi.fn(),
  cancel: vi.fn(),
  resume: vi.fn(),
  repair: vi.fn(),
  streamEvents: vi.fn(),
  fileToAttachment: vi.fn(),
}))

vi.mock("@/domains/workbench/api", () => ({
  listWorkbenchRepositories: mocks.listRepositories,
  listWorkbenchPlugins: mocks.listPlugins,
  startWorkbenchSession: mocks.start,
  getWorkbenchSession: mocks.getSession,
  sendWorkbenchMessage: mocks.sendMessage,
  cancelWorkbenchSession: mocks.cancel,
  resumeWorkbenchSession: mocks.resume,
  repairWorkbenchSession: mocks.repair,
  streamWorkbenchEvents: mocks.streamEvents,
  fileToWorkbenchAttachment: mocks.fileToAttachment,
}))

vi.mock("@/components/ui/primitives", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/primitives")>()
  return { ...actual, notifyOperator: vi.fn() }
})

import { WorkbenchPage } from "./page"

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <WorkbenchPage />
    </QueryClientProvider>,
  )
}

function emit(events: Array<{ sequence: number; kind: string; payload: Record<string, unknown> }>) {
  mocks.streamEvents.mockImplementation(async (_id: string, onEvent: (event: unknown) => void) => {
    events.forEach(onEvent)
    return events
  })
}

describe("WorkbenchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listRepositories.mockResolvedValue([
      {
        id: "agents-sandbox",
        name: "Agents Sandbox",
        remote_identity: "PixelGaps/agents-sandbox",
        default_branch: "main",
        available: true,
        writable: true,
        reason: "",
      },
    ])
    mocks.listPlugins.mockResolvedValue([
      {
        plugin_id: "local-echo",
        version: "1",
        transport: "stdio",
        capabilities: [],
        tools: [{ name: "echo", description: "Echo", input_schema: {}, capabilities: [] }],
      },
    ])
    mocks.start.mockResolvedValue(runningSession)
    mocks.getSession.mockResolvedValue(runningSession)
    mocks.cancel.mockResolvedValue({ session_id: "session-1", status: "cancellation_requested" })
    mocks.resume.mockResolvedValue({ session_id: "session-1", status: "resumed" })
    mocks.repair.mockResolvedValue(runningSession)
    mocks.sendMessage.mockResolvedValue({ ...runningSession, execution_id: "exec-2", turn_count: 2 })
    mocks.fileToAttachment.mockResolvedValue({
      name: "spec.txt",
      media_type: "text/plain",
      data_base64: "QQ==",
      source: "upload",
    })
    emit([
      { sequence: 1, kind: "assistant_text", payload: { text: "Inspecting repository" } },
      { sequence: 2, kind: "tool_start", payload: { tool: "search" } },
      { sequence: 3, kind: "patch", payload: { changed_files: ["src/app.ts"], patch: "diff" } },
      { sequence: 4, kind: "validation", payload: { passed: true } },
    ])
  })

  it("starts a real-contract session with runtime, effort, plugin, SHA and acceptance", async () => {
    renderPage()

    expect(screen.getByText(/Session enumeration is not exposed/)).toBeInTheDocument()
    expect(screen.getByText(/Automatic repository HEAD resolution/)).toBeInTheDocument()
    expect(await screen.findByRole("option", { name: "Agents Sandbox" })).toBeInTheDocument()

    const start = screen.getByRole("button", { name: /Start session/ })
    expect(start).toBeDisabled()

    fireEvent.change(screen.getByLabelText("Exact target SHA"), { target: { value: "bad" } })
    expect(screen.getByText("Exact 40-character SHA required.")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Exact target SHA"), { target: { value: SHA } })
    fireEvent.change(screen.getByLabelText("Runtime"), { target: { value: "cline" } })
    fireEvent.change(screen.getByLabelText("Effort"), { target: { value: "HIGH" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /local-echo/ }))
    fireEvent.change(screen.getByLabelText("Task"), { target: { value: "Implement the change" } })
    fireEvent.change(screen.getByLabelText(/Acceptance criteria/), {
      target: { value: "Tests pass\nNo unrelated changes" },
    })

    fireEvent.click(start)

    await waitFor(() => expect(mocks.start).toHaveBeenCalledWith(expect.objectContaining({
      task: "Implement the change",
      repository_id: "agents-sandbox",
      target_sha: SHA,
      runtime: "cline",
      effort: "HIGH",
      enabled_plugins: ["local-echo"],
      acceptance: ["Tests pass", "No unrelated changes"],
    })))
    expect(await screen.findByText("Inspecting repository")).toBeInTheDocument()
    expect(screen.getByText("src/app.ts")).toBeInTheDocument()
    expect(screen.getByText("one-shot SSE")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Stop/ })).toBeEnabled()
    expect(screen.getByRole("button", { name: /Repair/ })).toBeDisabled()
  })

  it("reconstructs failed sessions and exposes repair, resume and follow-up controls", async () => {
    mocks.getSession.mockResolvedValue(failedSession)
    emit([{ sequence: 1, kind: "error", payload: { error: "validation failed" } }])
    renderPage()

    fireEvent.change(screen.getByLabelText("Session ID"), { target: { value: "session-1" } })
    fireEvent.click(screen.getByRole("button", { name: "Open" }))

    expect(await screen.findByText("validation failed")).toBeInTheDocument()
    expect(screen.getAllByText("failed").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole("button", { name: /Stop/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Repair/ })).toBeEnabled()
    expect(screen.getByRole("button", { name: /Resume/ })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /Repair/ }))
    await waitFor(() => expect(mocks.repair).toHaveBeenCalledWith("session-1"))

    fireEvent.change(screen.getByLabelText("Follow-up"), { target: { value: "Adjust the fix" } })
    fireEvent.click(screen.getByRole("button", { name: /Send follow-up/ }))
    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenCalledWith("session-1", "Adjust the fix", []),
    )
  })

  it("surfaces backend failures without inventing session state and can reset locally", async () => {
    mocks.start.mockRejectedValueOnce(new Error("resource blocked"))
    renderPage()
    await screen.findByRole("option", { name: "Agents Sandbox" })

    fireEvent.change(screen.getByLabelText("Exact target SHA"), { target: { value: SHA } })
    fireEvent.change(screen.getByLabelText("Task"), { target: { value: "Run blocked task" } })
    fireEvent.click(screen.getByRole("button", { name: /Start session/ }))

    expect(await screen.findByText("resource blocked")).toBeInTheDocument()
    expect(screen.getByText("No session selected.")).toBeInTheDocument()

    mocks.start.mockResolvedValueOnce(failedSession)
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/ }))
    fireEvent.click(screen.getByRole("button", { name: /Start session/ }))
    expect(await screen.findByRole("button", { name: /New session/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /New session/ }))
    expect(screen.getByText("No session selected.")).toBeInTheDocument()
  })
})
