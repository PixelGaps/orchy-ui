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

describe("Local Overview", () => {
  it("renders Jira, GitHub, TestOps and host projections", () => {
    sourceState.values = {
      jira: {
        source: "jira",
        authority: "Jira OR work state",
        state: "fresh",
        payload: {
          openCount: 4,
          byStatus: { "In Progress": 2, "To Do": 2 },
          issues: [],
        },
      },
      github: {
        source: "github",
        authority: "GitHub source and CI",
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
        source: "testops",
        authority: "TestOps retained local evidence",
        state: "fresh",
        payload: { target: "PixelGaps/orchy", layers: [], findings: [] },
      },
      host: {
        source: "host",
        authority: "Madriguera local control plane",
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
    expect(screen.getByText("Local control")).toBeInTheDocument()
    expect(screen.getByText("PixelGaps/orchy")).toBeInTheDocument()
    expect(screen.getAllByText("OFFLINE").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole("link", { name: /Open Test Assurance/ })).toHaveAttribute(
      "href",
      "/assurance",
    )
  })

  it("does not synthesize assurance or Jira counts when authoritative sources are unavailable", () => {
    sourceState.values = {
      jira: { source: "jira", authority: "Jira OR work state", state: "unavailable", payload: null, errorCode: "JIRA_SERVER_SOURCE_UNAVAILABLE" },
      github: { source: "github", authority: "GitHub source and CI", state: "fresh", payload: { repository: "PixelGaps/orchy", defaultBranch: "main", headSha: "abc", openWorkflowRuns: 0, recentRuns: [] } },
      testops: { source: "testops", authority: "TestOps retained local evidence", state: "unavailable", payload: null, errorCode: "TESTOPS_EVIDENCE_UNAVAILABLE" },
      host: { source: "host", authority: "Madriguera local control plane", state: "fresh", payload: { hostId: "b", state: "ONLINE", lastSeenAt: "2026-10-02T20:00:00Z", controlPlaneVersion: "orchy-web-v2", sourceSha: "abc", machineControlState: "active", machineControlLastSeenAt: "2026-10-02T20:00:00Z" } },
    }

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>,
    )

    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText("Jira unavailable")).toBeInTheDocument()
    expect(screen.getByText(/intentionally hidden rather than taken from a bundled snapshot/)).toBeInTheDocument()
    expect(screen.queryByText("0/12 complete")).not.toBeInTheDocument()
  })
})
