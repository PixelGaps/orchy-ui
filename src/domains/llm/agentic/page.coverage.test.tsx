import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  tab: "tasks",
  repositories: [] as any[],
  pending: false,
  error: null as Error | null,
  submitted: false,
  queryError: null as Error | null,
  refetch: vi.fn(),
}))
const apiMocks = vi.hoisted(() => ({
  getApi: vi.fn().mockResolvedValue([]),
  postApi: vi.fn().mockResolvedValue({ status: "accepted" }),
}))

vi.mock("@/lib/api", () => apiMocks)

vi.mock("@/domains/shared", () => ({
  useDomainTab: () => [state.tab, vi.fn()] as const,
  SectionTabs: ({ active }: { active: string }) => <div data-testid="tabs">{active}</div>,
  DomainConfiguration: ({ section }: { section: string }) => <div>config:{section}</div>,
  ExecutionPanel: ({ kind, showOutput }: { kind?: string; showOutput?: boolean }) => (
    <div>execution:{kind}:{String(showOutput)}</div>
  ),
  JsonPanel: ({ title }: { title: string }) => <div>json:{title}</div>,
  SemanticEvents: () => null,
  statusTone: () => "neutral",
  useExecutions: () => ({ data: [] }),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((options: { queryFn?: () => unknown }) => {
    void options.queryFn?.()
    return {
      data: state.repositories,
      isLoading: false,
      isFetching: false,
      dataUpdatedAt: 1,
      error: state.queryError,
      refetch: state.refetch,
    }
  }),
  useMutation: vi.fn((options: {
    mutationFn?: () => unknown
    onSuccess?: (response: { execution_id: string }) => void
    onError?: (error: Error) => void
  }) => ({
    isPending: state.pending,
    error: state.error,
    mutate: vi.fn(async () => {
      state.submitted = true
      const response = await options.mutationFn?.()
      if (state.error) options.onError?.(state.error)
      else options.onSuccess?.((response ?? { execution_id: "coverage-task" }) as { execution_id: string })
    }),
  })),
}))

import { AgenticCodingPage, Tasks } from "./page"

function renderPage() {
  return render(
    <MemoryRouter>
      <AgenticCodingPage />
    </MemoryRouter>,
  )
}

describe("Agentic Coding page coverage", () => {
  beforeEach(() => {
    state.tab = "tasks"
    state.repositories = []
    state.pending = false
    state.error = null
    state.submitted = false
    state.queryError = null
    state.refetch = vi.fn()
    window.localStorage.clear()
  })

  it("covers standalone task header, query retry, and mutation error callbacks", () => {
    state.repositories = [
      { id: "orchy", name: "Orchy", remote_identity: "", available: true },
    ]
    state.error = new Error("submit failed")
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>,
    )
    expect(screen.getByRole("heading", { name: "Tasks & execution" })).toBeInTheDocument()
    expect(apiMocks.getApi).toHaveBeenCalledWith("/api/repositories")
    fireEvent.change(screen.getByLabelText("Outcome"), { target: { value: "ship" } })
    fireEvent.click(screen.getByRole("button", { name: /Run task/ }))
    expect(apiMocks.postApi).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({ task: "ship", repository_id: "orchy" }),
    )
  })


  it("executes repository query retry", () => {
    state.queryError = new Error("repository lookup failed")
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }))
    expect(state.refetch).toHaveBeenCalledOnce()
  })

  it("falls back from an unavailable remembered repository and submits a single-repo task", async () => {
    window.localStorage.setItem("orchy-primary-repository", "missing")
    state.repositories = [
      {
        id: "missing",
        name: "Missing",
        remote_identity: "PixelGaps/missing",
        available: false,
        reason: "offline",
      },
      {
        id: "orchy",
        name: "Orchy",
        remote_identity: "PixelGaps/orchy",
        available: true,
      },
      {
        id: "secondary",
        name: "Secondary",
        remote_identity: "PixelGaps/secondary",
        available: true,
      },
    ]

    renderPage()

    await waitFor(() => expect(screen.getByLabelText("Primary repository")).toHaveValue("orchy"))
    const outcome = screen.getByLabelText("Outcome")
    fireEvent.change(outcome, { target: { value: "Update secondary integration" } })
    expect(screen.getByText(/mentions unselected registered repositories: Secondary/)).toBeInTheDocument()

    const run = screen.getByRole("button", { name: /Run task/ })
    expect(run).not.toBeDisabled()
    fireEvent.click(run)
    expect(state.submitted).toBe(true)
    await waitFor(() =>
      expect(window.localStorage.getItem("orchy-primary-repository")).toBe("orchy"),
    )
    expect(outcome).toHaveValue("")
  })

  it("covers explicit multi-repo selection, deselection, unavailable option and scope reset", async () => {
    state.repositories = [
      { id: "orchy", name: "Orchy", remote_identity: "PixelGaps/orchy", available: true },
      { id: "secondary", name: "Secondary", remote_identity: "PixelGaps/secondary", available: true },
      { id: "blocked", name: "Blocked", remote_identity: "", available: false, reason: "no access" },
    ]

    renderPage()
    await waitFor(() => expect(screen.getByLabelText("Primary repository")).toHaveValue("orchy"))
    fireEvent.click(screen.getByRole("button", { name: /Repository scope/ }))

    const multi = screen.getByRole("checkbox", { name: "Multi-repo task" })
    fireEvent.click(multi)
    const secondary = screen.getByRole("checkbox", { name: /Secondary/ })
    const blocked = screen.getByRole("checkbox", { name: /Blocked/ })
    expect(blocked).toBeDisabled()
    fireEvent.click(secondary)
    expect(screen.getByText(/Additional: secondary/)).toBeInTheDocument()
    fireEvent.click(secondary)
    expect(screen.getByText(/Additional: none/)).toBeInTheDocument()

    fireEvent.click(secondary)
    fireEvent.change(screen.getByLabelText("Primary repository"), { target: { value: "secondary" } })
    expect(screen.getByText(/Primary: Secondary/)).toBeInTheDocument()

    fireEvent.click(multi)
    expect(screen.getByText(/Additional: none/)).toBeInTheDocument()
  })

  it("covers pending, error and unavailable task states", () => {
    state.repositories = [
      { id: "orchy", name: "Orchy", available: false, reason: "temporarily unavailable" },
    ]
    state.pending = true
    state.error = new Error("submit failed")
    window.localStorage.setItem("orchy-primary-repository", "orchy")

    renderPage()
    expect(screen.getByText("temporarily unavailable")).toBeInTheDocument()
    expect(screen.getByText("submit failed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Submitting/ })).toBeDisabled()
  })

  it("covers validation and settings tabs", () => {
    state.tab = "validation"
    const { rerender } = renderPage()
    expect(screen.getByText("json:Coding validation")).toBeInTheDocument()

    state.tab = "settings"
    rerender(<MemoryRouter><AgenticCodingPage /></MemoryRouter>)
    expect(screen.getByText("config:agentic")).toBeInTheDocument()
  })

  it("covers repository data fallbacks and explicit multi-repo submission payload", async () => {
    state.repositories = undefined as any
    const empty = renderPage()
    expect(screen.getAllByText("orchy").length).toBeGreaterThan(0)
    empty.unmount()

    state.repositories = [
      { id: "orchy", name: "", available: true },
      { id: "secondary", name: "", available: true },
    ]
    renderPage()
    await waitFor(() => expect(screen.getByLabelText("Primary repository")).toHaveValue("orchy"))
    fireEvent.click(screen.getByRole("button", { name: /Repository scope/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Multi-repo task" }))
    const secondary = screen.getByRole("checkbox", { name: /secondary/ })
    fireEvent.click(secondary)
    expect(screen.getByText(/orchy \+ 1/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Outcome"), { target: { value: "touch secondary" } })
    fireEvent.click(screen.getByRole("button", { name: /Run task/ }))
    await waitFor(() => expect(apiMocks.postApi).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({
        repository_id: "orchy",
        additional_repository_ids: ["secondary"],
      }),
    ))
  })

  it("covers multi-repo rendering while repository data is absent", () => {
    state.repositories = undefined as any
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: /Repository scope/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Multi-repo task" }))
    expect(screen.queryByLabelText(/Include repository/)).not.toBeInTheDocument()
  })

  it("covers unavailable repository fallback reason and selected scope short-circuit", async () => {
    state.repositories = [
      { id: "orchy", name: "Orchy", available: false, reason: "" },
      { id: "secondary", name: "Secondary", available: false, reason: "" },
    ]
    window.localStorage.setItem("orchy-primary-repository", "orchy")
    renderPage()
    expect(await screen.findByText("Repository unavailable")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Outcome"), { target: { value: "orchy only" } })
    expect(screen.queryByText(/mentions unselected/)).not.toBeInTheDocument()
  })

})
