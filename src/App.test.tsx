import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const motionState = vi.hoisted(() => ({ reduced: true }))

vi.mock("motion/react", async () => {
  const React = await import("react")
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      ),
    },
    useReducedMotion: () => motionState.reduced,
  }
})

vi.mock("@/domains/assurance/page", () => ({ TestAssurancePage: () => <div>Assurance stub</div> }))
vi.mock("@/domains/overview/page", () => ({ Overview: () => <div>Overview stub</div> }))
vi.mock("@/domains/issues/page", () => ({ IssuesPage: () => <div>Issues stub</div> }))
vi.mock("@/domains/missions/page", () => ({ MissionsPage: () => <div>Missions stub</div> }))
vi.mock("@/domains/queue/page", () => ({ QueuePage: () => <div>Queue stub</div> }))
vi.mock("@/domains/llm/workbench/page", () => ({ AgenticWorkbenchPage: () => <div>Workbench stub</div> }))
vi.mock("@/domains/missions/page", () => ({ MissionsPage: () => <div>Missions stub</div> }))
vi.mock("@/domains/queue/page", () => ({ QueuePage: () => <div>Queue stub</div> }))
vi.mock("@/domains/llm/workbench/page", () => ({ AgenticWorkbenchPage: () => <div>Workbench stub</div> }))
vi.mock("@/domains/llm/agentic/page", () => ({ AgenticCodingPage: () => <div>Agentic stub</div> }))
vi.mock("@/domains/comfyui/image-factory/page", () => ({ ImageFactory: () => <div>Image stub</div> }))
vi.mock("@/domains/llm/deep-research/page", () => ({ DeepResearchPage: () => <div>Research stub</div> }))
vi.mock("@/domains/llm/page", () => ({ LLMPage: () => <div>LLM stub</div> }))
vi.mock("@/domains/comfyui/page", () => ({ ComfyUIPage: () => <div>Comfy stub</div> }))
vi.mock("@/domains/healthcheck/page", () => ({ HealthcheckPage: () => <div>Health stub</div> }))
vi.mock("@/domains/logs/page", () => ({ LogsPage: () => <div>Logs stub</div> }))
vi.mock("@/domains/settings/page", () => ({ GlobalSettingsPage: () => <div>Settings stub</div> }))

import App from "./App"

describe("App shell", () => {
  beforeEach(() => {
    window.localStorage.clear()
    motionState.reduced = true
  })

  it("renders navigation, route content, and toggles mobile navigation", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText("Overview stub")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Orchy/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#orchy-main-content",
    )

    const mobile = screen.getByRole("button", { name: "Toggle navigation" })
    expect(mobile).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(mobile)
    expect(mobile).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(mobile)
    expect(mobile).toHaveAttribute("aria-expanded", "false")
  })

  it("persists compact sidebar state and exposes compact link titles", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    const collapse = screen.getByRole("button", { name: "Compact navigation" })
    fireEvent.click(collapse)
    expect(window.localStorage.getItem("orchy-sidebar-compact")).toBe("true")
    expect(screen.getByRole("button", { name: "Compact navigation" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("link", { name: "Image Factory" })).toHaveAttribute(
      "title",
      "Image Factory",
    )
  })

  it("restores compact state and covers non-reduced motion rendering", () => {
    window.localStorage.setItem("orchy-sidebar-compact", "true")
    motionState.reduced = false

    const { container } = render(
      <MemoryRouter initialEntries={["/llm"]}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText("LLM stub")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Compact navigation" })).toBeInTheDocument()
    expect(container.querySelector(".page")).toBeInTheDocument()
  })

  it("closes the mobile menu when route location changes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    const mobile = screen.getByRole("button", { name: "Toggle navigation" })
    fireEvent.click(mobile)
    expect(mobile).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(screen.getByRole("link", { name: "LLM" }))
    expect(screen.getByText("LLM stub")).toBeInTheDocument()
    expect(mobile).toHaveAttribute("aria-expanded", "false")
  })

  it("locks background interaction and handles mobile escape/backdrop closure", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    const mobile = screen.getByRole("button", { name: "Toggle navigation" })
    const main = document.getElementById("orchy-main-content")
    expect(main).not.toBeNull()

    fireEvent.click(mobile)
    expect(document.body.style.overflow).toBe("hidden")
    expect(main).toHaveAttribute("inert")

    fireEvent.keyDown(window, { key: "Escape" })
    expect(mobile).toHaveAttribute("aria-expanded", "false")
    expect(document.body.style.overflow).toBe("")
    expect(main).not.toHaveAttribute("inert")

    fireEvent.click(mobile)
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }))
    expect(mobile).toHaveAttribute("aria-expanded", "false")
  })

  it("traps tab focus inside the open mobile sidebar", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Toggle navigation" }))
    const sidebar = screen.getByRole("navigation", { name: "Primary navigation" })
    const focusable = sidebar.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first.focus()
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true })
    expect(last).toHaveFocus()

    last.focus()
    fireEvent.keyDown(window, { key: "Tab" })
    expect(first).toHaveFocus()
  })

  it("covers open-navigation no-op keyboard and empty focus set", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Toggle navigation" }))
    const sidebar = screen.getByRole("navigation", { name: "Primary navigation" })
    fireEvent.keyDown(window, { key: "x" })
    const original = sidebar.querySelectorAll.bind(sidebar)
    const spy = vi.spyOn(sidebar, "querySelectorAll").mockReturnValue([] as unknown as NodeListOf<Element>)
    fireEvent.keyDown(window, { key: "Tab" })
    expect(screen.getByRole("button", { name: "Toggle navigation" })).toHaveAttribute("aria-expanded", "true")
    spy.mockRestore()
    expect(original('a[href]').length).toBeGreaterThan(0)
  })

  it("executes delayed focus callbacks for navigation and command palette", () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    const mobile = screen.getByRole("button", { name: "Toggle navigation" })
    fireEvent.click(mobile)
    vi.runOnlyPendingTimers()
    expect(screen.getByRole("link", { name: /Orchy/ })).toHaveFocus()

    fireEvent.keyDown(window, { key: "Escape" })
    vi.runOnlyPendingTimers()
    expect(mobile).toHaveFocus()

    fireEvent.click(mobile)
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }))
    vi.runOnlyPendingTimers()
    expect(mobile).toHaveFocus()

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    vi.runOnlyPendingTimers()
    expect(screen.getByRole("textbox", { name: "Search operator commands" })).toHaveFocus()

    vi.useRealTimers()
  })

  it("opens, filters, navigates, and closes the command palette", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    const dialog = screen.getByRole("dialog", { name: "Operator command palette" })
    expect(dialog).toBeInTheDocument()

    const input = within(dialog).getByRole("textbox", { name: "Search operator commands" })
    fireEvent.change(input, { target: { value: "health" } })
    expect(within(dialog).getByRole("button", { name: /Healthcheck/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: /Image Factory/ })).not.toBeInTheDocument()

    fireEvent.mouseDown(dialog)
    expect(screen.getByRole("dialog", { name: "Operator command palette" })).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: /Healthcheck/ }))
    expect(screen.getByText("Health stub")).toBeInTheDocument()
    expect(screen.queryByRole("dialog", { name: "Operator command palette" })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: "k", metaKey: true })
    expect(screen.getByRole("dialog", { name: "Operator command palette" })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "Operator command palette" })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    expect(screen.getByRole("dialog", { name: "Operator command palette" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close operator command palette" }))
    expect(screen.queryByRole("dialog", { name: "Operator command palette" })).not.toBeInTheDocument()
  })

  it("exposes portrait-first primary navigation without replacing full navigation", () => {
    render(
      <MemoryRouter initialEntries={["/missions"]}>
        <App />
      </MemoryRouter>,
    )

    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary navigation" })
    expect(within(mobileNav).getByRole("link", { name: "Overview" })).toBeInTheDocument()
    expect(within(mobileNav).getByRole("link", { name: "Test Assurance" })).toBeInTheDocument()
    expect(within(mobileNav).getByRole("link", { name: "Issues" })).toBeInTheDocument()
    expect(within(mobileNav).getByRole("link", { name: "Queue" })).toBeInTheDocument()

    const more = within(mobileNav).getByRole("button", { name: "More navigation" })
    expect(more).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(more)
    expect(more).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("sidebar-open")
  })

  it("renders the Missions route through the shell", () => {
    render(
      <MemoryRouter initialEntries={["/missions"]}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText("Missions stub")).toBeInTheDocument()
  })

})
