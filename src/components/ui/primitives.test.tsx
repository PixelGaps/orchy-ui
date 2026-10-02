import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  Badge,
  Button,
  Card,
  CollapsibleSection,
  CompactSummary,
  DenseKeyValueGrid,
  EmptyState,
  GlowCard,
  PageHeader,
  PanelHeader,
  FreshnessBadge,
  QueryStateNotice,
  CopyButton,
  SectionPanel,
  OperatorFeedbackViewport,
  RangeControl,
  SelectControl,
  Skeleton,
  StatusNotice,
  Switch,
  notifyOperator,
} from "./primitives"

describe("UI primitives", () => {
  it("merges card classes and forwards DOM attributes", () => {
    render(<Card className="custom" data-testid="card">body</Card>)
    const card = screen.getByTestId("card")
    expect(card).toHaveClass("glass-card", "custom")
    expect(card).toHaveTextContent("body")
  })

  it("renders glow cards with merged classes", () => {
    render(<GlowCard className="accent">Glow</GlowCard>)
    expect(screen.getByText("Glow")).toHaveClass("glass-card", "glow-card", "accent")
  })

  it("forwards button behavior, state, and classes", () => {
    const onClick = vi.fn()
    render(<Button className="primary" disabled={false} onClick={onClick}>Run</Button>)
    const button = screen.getByRole("button", { name: "Run" })
    expect(button).toHaveClass("button", "primary")
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("renders default and explicit badge tones", () => {
    const { rerender } = render(<Badge>Idle</Badge>)
    expect(screen.getByText("Idle")).toHaveClass("badge-neutral")
    rerender(<Badge tone="danger">Failed</Badge>)
    expect(screen.getByText("Failed")).toHaveClass("badge-danger")
  })

  it("renders page header with and without an optional badge", () => {
    const { rerender } = render(
      <PageHeader eyebrow="System" title="Overview" description="Status" />,
    )
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument()
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument()

    rerender(
      <PageHeader
        eyebrow="System"
        title="Overview"
        description="Status"
        badge={<span>LIVE</span>}
      />,
    )
    expect(screen.getByText("LIVE")).toBeInTheDocument()
  })

  it("renders panel header optional action branches", () => {
    const { rerender } = render(<PanelHeader kicker="Health" title="Components" />)
    expect(screen.getByRole("heading", { level: 2, name: "Components" })).toBeInTheDocument()
    expect(screen.queryByText("3 active")).not.toBeInTheDocument()
    rerender(<PanelHeader kicker="Health" title="Components" action={<span>3 active</span>} />)
    expect(screen.getByText("3 active")).toBeInTheDocument()
  })

  it("supports compact summary and dense key-value information without hiding data", () => {
    render(
      <>
        <CompactSummary items={[
          { label: "GPU", value: "12%", detail: "42 C", tone: "live" },
          { label: "RAM", value: "8 GB" },
        ]} />
        <DenseKeyValueGrid items={[
          { label: "Model", value: "qwen", hint: "16k context" },
          { label: "Runtime", value: "vLLM" },
        ]} />
      </>,
    )
    expect(screen.getByText("12%")).toBeInTheDocument()
    expect(screen.getByText("42 C")).toBeInTheDocument()
    expect(screen.getByText("qwen")).toBeInTheDocument()
    expect(screen.getByText("16k context")).toBeInTheDocument()
  })

  it("renders compact summary optional detail/tone and dense-grid optional hint branches", () => {
    render(
      <>
        <CompactSummary items={[
          { label: "Plain", value: "1" },
          { label: "Detailed", value: "2", detail: "more", tone: "cyan" },
        ]} />
        <DenseKeyValueGrid items={[
          { label: "Bare", value: "x" },
          { label: "Hinted", value: "y", hint: "hint" },
        ]} />
      </>,
    )
    expect(screen.queryByText("more")).toBeInTheDocument()
    expect(screen.getByText("hint")).toBeInTheDocument()
    expect(screen.getByText("1").parentElement?.querySelector("small")).toBeNull()
    expect(screen.getByText("x").parentElement?.querySelector("small")).toBeNull()
  })

  it("collapses secondary detail with accessible state and restores it on demand", () => {
    render(
      <CollapsibleSection title="Advanced" summary="2 settings">
        <div>Hidden detail</div>
      </CollapsibleSection>,
    )
    const trigger = screen.getByRole("button", { name: /Advanced/ })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("Hidden detail").parentElement).toHaveAttribute("hidden")
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Hidden detail").parentElement).not.toHaveAttribute("hidden")
  })

  it("supports default-open, badge and custom-class disclosure branches", () => {
    render(
      <CollapsibleSection
        title="Open"
        summary="summary"
        badge={<span>LIVE</span>}
        className="custom"
        defaultOpen
      >
        <div>Visible detail</div>
      </CollapsibleSection>,
    )
    const trigger = screen.getByRole("button", { name: /Open/ })
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("LIVE")).toBeInTheDocument()
    expect(trigger.closest("section")).toHaveClass("is-open", "custom")
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })


  it("covers freshness, retry, copy, section and operator feedback branches", async () => {
    vi.useFakeTimers()
    const now = 1_700_000_000_000
    vi.spyOn(Date, "now").mockReturnValue(now)
    const retry = vi.fn()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("feedback-1")
      .mockReturnValueOnce("feedback-2")
      .mockReturnValueOnce("feedback-3")
      .mockReturnValueOnce("feedback-4")

    const { rerender, unmount } = render(
      <>
        <FreshnessBadge />
        <QueryStateNotice error={new Error("offline")} onRetry={retry} />
        <CopyButton value="/tmp/path" label="Copy path" />
        <SectionPanel tabId="hidden" active={false}>hidden</SectionPanel>
        <OperatorFeedbackViewport />
      </>,
    )
    expect(screen.getByText(/UNKNOWN · no sample/)).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("offline")
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }))
    expect(retry).toHaveBeenCalledOnce()
    expect(screen.queryByText("hidden")).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy path" }))
      await Promise.resolve()
    })
    expect(writeText).toHaveBeenCalledWith("/tmp/path")
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1200))

    rerender(
      <>
        <FreshnessBadge updatedAt={now - 500} />
        <QueryStateNotice error={new Error("ignored")} updatedAt={now - 500} />
        <SectionPanel tabId="visible" active className="extra">visible</SectionPanel>
        <OperatorFeedbackViewport />
      </>,
    )
    expect(screen.getByText(/LIVE · 1s ago/)).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Showing last known data")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("visible")

    act(() => {
      notifyOperator("one", "success")
      notifyOperator("two", "error")
      notifyOperator("three")
      notifyOperator("four")
    })
    expect(screen.getByText("four")).toBeInTheDocument()
    expect(screen.queryByText("one")).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3200))

    rerender(<FreshnessBadge updatedAt={now - 61_000} error />)
    expect(screen.getByText(/STALE · 1m ago/)).toBeInTheDocument()
    rerender(<FreshnessBadge error />)
    expect(screen.getByText(/DISCONNECTED · no sample/)).toBeInTheDocument()

    unmount()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })


  it("provides accessible switch, select and range controls", () => {
    const switchChange = vi.fn()
    const selectChange = vi.fn()
    const rangeChange = vi.fn()
    render(
      <>
        <Switch
          checked={false}
          onCheckedChange={switchChange}
          label="Allow GPU"
          description="Use host GPU when available."
        />
        <SelectControl
          label="Runner"
          value="cloud"
          options={[
            { value: "cloud", label: "Cloud first" },
            { value: "host", label: "Host only" },
          ]}
          onChange={selectChange}
        />
        <RangeControl
          label="Max generations"
          value={4}
          min={1}
          max={8}
          onChange={rangeChange}
          formatValue={(value) => `${value} runs`}
        />
      </>,
    )

    const toggle = screen.getByRole("switch", { name: "Allow GPU" })
    expect(toggle).toHaveAttribute("aria-checked", "false")
    fireEvent.click(toggle)
    expect(switchChange).toHaveBeenCalledWith(true)

    fireEvent.change(screen.getByLabelText("Runner"), { target: { value: "host" } })
    expect(selectChange).toHaveBeenCalledWith("host")

    const range = screen.getByRole("slider", { name: /Max generations/ })
    expect(screen.getByText("4 runs")).toBeInTheDocument()
    fireEvent.change(range, { target: { value: "6" } })
    expect(rangeChange).toHaveBeenCalledWith(6)
  })

  it("renders reusable loading and status states accessibly", () => {
    const { rerender, container } = render(
      <>
        <Skeleton lines={3} />
        <StatusNotice title="Cached" body="Showing last known data." tone="warn" />
      </>,
    )
    expect(container.querySelectorAll(".ui-skeleton")).toHaveLength(3)
    expect(screen.getByRole("status")).toHaveTextContent("Showing last known data.")

    rerender(
      <StatusNotice
        title="Unavailable"
        body="Source cannot be reached."
        tone="danger"
        action={<button type="button">Retry</button>}
      />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Source cannot be reached.")
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("supports disabled operator controls and minimum skeleton count", () => {
    render(
      <>
        <Switch
          checked
          onCheckedChange={vi.fn()}
          label="Locked switch"
          disabled
        />
        <SelectControl
          label="Locked select"
          value="one"
          options={[{ value: "one", label: "One" }]}
          onChange={vi.fn()}
          disabled
        />
        <RangeControl
          label="Locked range"
          value={1}
          min={0}
          max={2}
          onChange={vi.fn()}
          disabled
        />
        <Skeleton lines={0} />
      </>,
    )
    expect(screen.getByRole("switch", { name: "Locked switch" })).toBeDisabled()
    expect(screen.getByLabelText("Locked select")).toBeDisabled()
    expect(screen.getByRole("slider", { name: /Locked range/ })).toBeDisabled()
    expect(document.querySelectorAll(".ui-skeleton")).toHaveLength(1)
  })

  it("renders the generic query error fallback", () => {
    render(<QueryStateNotice error={{ code: "offline" }} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load data.")
  })

  it("renders actionable empty-state copy", () => {
    render(<EmptyState title="No executions" body="Launch work to populate history." />)
    expect(screen.getByText("No executions")).toBeInTheDocument()
    expect(screen.getByText("Launch work to populate history.")).toBeInTheDocument()
  })
})
