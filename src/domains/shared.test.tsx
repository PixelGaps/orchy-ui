import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SectionTabs, SemanticEvents, statusTone } from "./shared"

describe("shared domain presentation", () => {
  it("maps success, failure, active and unknown statuses to tones", () => {
    for (const value of ["completed", "PASS"]) expect(statusTone(value)).toBe("live")
    for (const value of ["failed", "timed_out", "REJECT", "ITEM_FAILED", "PACK_FAILED"]) {
      expect(statusTone(value)).toBe("danger")
    }
    for (const value of ["running", "retrying", "cancelling", "resource_blocked", "REVIEW"]) {
      expect(statusTone(value)).toBe("warn")
    }
    expect(statusTone("queued")).toBe("neutral")
    expect(statusTone()).toBe("neutral")
  })

  it("renders no semantic event container for an empty list", () => {
    const { container } = render(<SemanticEvents events={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("limits events from the tail and safely defaults missing fields", () => {
    render(
      <SemanticEvents
        limit={2}
        events={[
          { class: "old", summary: "discard me" },
          { class: "qa_gate", summary: "passed" },
          {},
        ]}
      />,
    )
    expect(screen.queryByText("discard me")).not.toBeInTheDocument()
    expect(screen.getByText("qa gate")).toBeInTheDocument()
    expect(screen.getByText("passed")).toBeInTheDocument()
    expect(screen.getByText("log")).toBeInTheDocument()
  })

  it("marks the active tab, exposes ARIA selection and supports keyboard navigation", () => {
    const setActive = vi.fn()
    render(
      <SectionTabs
        active="status"
        setActive={setActive}
        tabs={[
          { id: "status", label: "Status" },
          { id: "missions", label: "Missions" },
        ]}
      />,
    )
    const status = screen.getByRole("tab", { name: "Status" })
    const missions = screen.getByRole("tab", { name: "Missions" })
    expect(status).toHaveClass("section-tab-active")
    expect(status).toHaveAttribute("aria-selected", "true")
    expect(missions).toHaveAttribute("aria-selected", "false")
    fireEvent.click(missions)
    expect(setActive).toHaveBeenCalledWith("missions")
    fireEvent.keyDown(status, { key: "ArrowRight" })
    expect(setActive).toHaveBeenCalledWith("missions")
  })
})
