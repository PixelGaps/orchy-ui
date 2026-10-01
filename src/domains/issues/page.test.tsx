/**
 * Test documentation — executable specification.
 * Jira remains authority; issue actions expose guarded prompts and filters.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/cloud/client", () => ({
  useCloudSource: () => ({
    isLoading: false,
    data: {
      state: "fresh",
      ageSeconds: 5,
      payload: {
        openCount: 3,
        byStatus: { "In Progress": 1, "To Do": 2 },
        issues: [
          {
            key: "OR-628",
            summary: "Issue control panel",
            status: "In Progress",
            statusCategory: "In Progress",
            priority: "Highest",
            type: "Task",
            parentKey: "OR-620",
            labels: ["cloud-control"],
            browseUrl: "https://espalwebs.atlassian.net/browse/OR-628",
            updated: null,
          },
          {
            key: "OR-640",
            summary: "Layer 06 CI policy finding",
            status: "To Do",
            statusCategory: "To Do",
            priority: "High",
            type: "Subtask",
            parentKey: "OR-602",
            labels: ["sweep-deferred"],
            browseUrl: "https://espalwebs.atlassian.net/browse/OR-640",
            updated: null,
          },
          {
            key: "OR-634",
            summary: "Manual retirement gate",
            status: "To Do",
            statusCategory: "To Do",
            priority: "Low",
            type: "Task",
            parentKey: "OR-620",
            labels: ["manual-approval-required"],
            browseUrl: "https://espalwebs.atlassian.net/browse/OR-634",
            updated: null,
          },
          {
            key: "OR-626",
            summary: "Completed migration",
            status: "Done",
            statusCategory: "Done",
            priority: "Highest",
            type: "Task",
            parentKey: "OR-620",
            labels: [],
            browseUrl: "https://espalwebs.atlassian.net/browse/OR-626",
            updated: null,
          },
        ],
      },
    },
  }),
  useRefreshCloudSources: () => ({ isPending: false, mutate: vi.fn() }),
  sourceAgeLabel: () => "5s old",
  sourceTone: () => "live",
}))

import { IssuesPage } from "./page"

describe("IssuesPage", () => {
  it("shows only open work and makes guarded launch modes explicit", () => {
    render(<IssuesPage />)
    expect(screen.getByText("Issue control panel")).toBeInTheDocument()
    expect(screen.queryByText("Completed migration")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Implement in ChatGPT" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Continue in ChatGPT" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Review in ChatGPT" })).toBeInTheDocument()
    expect(screen.getByText(/Testing-sweep guard/)).toBeInTheDocument()
    expect(screen.getByText(/Manual approval required/)).toBeInTheDocument()
  })

  it("filters the queue by search and hierarchy fields", () => {
    render(<IssuesPage />)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "OR-640" } })
    expect(screen.getByText("Layer 06 CI policy finding")).toBeInTheDocument()
    expect(screen.queryByText("Issue control panel")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Parent"), { target: { value: "OR-602" } })
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "Subtask" } })
    expect(screen.getByText("Layer 06 CI policy finding")).toBeInTheDocument()
  })
})
