/**
 * Test documentation — executable specification
 * Cloud Overview renders canonical source snapshots and never requires host web serving.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

const sourceState = vi.hoisted(() => ({
  values: {} as Record<string, unknown>,
}))

vi.mock("@/cloud/client", () => ({
  useCloudSource: (source: string) => ({
    data: sourceState.values[source],
    isLoading: false,
  }),
  useRefreshCloudSources: () => ({ isPending: false, mutate: vi.fn() }),
  sourceAgeLabel: () => "5s old",
  sourceTone: () => "live",
}))

import { Overview } from "./page"

describe("Cloud Overview", () => {
  it("renders Jira, GitHub, TestOps and host projections", () => {
    sourceState.values = {
      jira: {
        state: "fresh",
        payload: {
          openCount: 4,
          byStatus: { "In Progress": 2, "To Do": 2 },
          issues: [],
        },
      },
      github: {
        state: "fresh",
        payload: {
          repository: "PixelGaps/orchy",
          defaultBranch: "main",
          headSha: "abcdef1234567890",
          openWorkflowRuns: 1,
          recentRuns: [],
        },
      },
      testops: {
        state: "fresh",
        payload: { target: "PixelGaps/orchy", layers: [], findings: [] },
      },
      host: {
        state: "fresh",
        payload: {
          hostId: "primary-host",
          state: "OFFLINE",
          lastSeenAt: "2026-09-30T00:00:00Z",
          controlPlaneVersion: "v2",
          sourceSha: "deadbeef123456",
          machineControlState: "OFFLINE",
          machineControlLastSeenAt: "2026-09-30T00:00:00Z",
        },
      },
    }

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument()
    expect(screen.getByText("PixelGaps/orchy")).toBeInTheDocument()
    expect(screen.getAllByText("OFFLINE").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole("link", { name: /Open Test Assurance/ })).toHaveAttribute(
      "href",
      "/assurance",
    )
  })
})
