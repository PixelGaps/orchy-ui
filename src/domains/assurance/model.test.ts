/**
 * Test documentation — executable specification
 * Assurance state comes from Jira; execution evidence/findings come from TestOps.
 */
import { describe, expect, it } from "vitest"

import type { JiraProjection, TestOpsProjection } from "@/cloud/adapters"

import { assuranceTotals, deriveAssuranceLayers } from "./model"

function jira(status = "In Progress", category = "In Progress"): JiraProjection {
  return {
    openCount: 1,
    byStatus: { [status]: 1 },
    issues: [
      {
        key: "OR-602",
        summary: "Layer 06",
        status,
        statusCategory: category,
        priority: "High",
        type: "Task",
        parentKey: "OR-620",
        labels: ["test-layer-06"],
        browseUrl: "https://espalwebs.atlassian.net/browse/OR-602",
        updated: "2026-09-30T00:00:00Z",
      },
    ],
  }
}

const testOps: TestOpsProjection = {
  target: "PixelGaps/orchy",
  layers: [
    {
      layerId: "06-performance",
      runId: "run-6",
      revision: "a".repeat(40),
      outcome: "FAIL",
      finishedAt: "2026-09-30T00:00:00Z",
      durationMs: 2000,
      jiraMilestone: "OR-602",
    },
  ],
  findings: [
    {
      layerId: "06-performance",
      category: "performance",
      disposition: "NEW",
      findings: 2,
      distinctSignatures: 2,
      lastSeenAt: "2026-09-30T00:00:00Z",
    },
  ],
}

describe("assurance model", () => {
  it("uses Jira for state and TestOps for evidence", () => {
    const layers = deriveAssuranceLayers(jira(), testOps)
    const layer = layers[5]
    expect(layer).toMatchObject({
      number: 6,
      jiraKey: "OR-602",
      jiraStatus: "In Progress",
      state: "active",
      findingCount: 2,
    })
    expect(layer.latest?.runId).toBe("run-6")
  })

  it("maps Done and blocked Jira states without inferring from run outcome", () => {
    expect(deriveAssuranceLayers(jira("Done", "Done"), testOps)[5].state).toBe("completed")
    expect(deriveAssuranceLayers(jira("Blocked", "In Progress"), testOps)[5].state).toBe("blocked")
    expect(deriveAssuranceLayers(undefined, testOps)[5].state).toBe("queued")
  })

  it("always returns the full 12-layer journey and deterministic totals", () => {
    const layers = deriveAssuranceLayers(jira(), testOps)
    expect(layers).toHaveLength(12)
    expect(assuranceTotals(layers)).toEqual({
      completed: 0,
      active: 1,
      blocked: 0,
      queued: 11,
      findings: 2,
    })
  })
})
