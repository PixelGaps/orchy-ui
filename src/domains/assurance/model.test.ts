/**
 * Test documentation — executable specification
 * Assurance state comes from Jira; execution evidence/findings come from TestOps.
 */
import { describe, expect, it } from "vitest"

import type { JiraProjection, TestOpsProjection } from "@/cloud/adapters"

import { assuranceSourcesComplete, assuranceTotals, deriveAssuranceLayers } from "./model"

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
      layerId: "performance",
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
      layerId: "performance",
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
  it("maps canonical TestOps layer ids and refuses totals when either authority is incomplete", () => {
    const layers = deriveAssuranceLayers(jira(), testOps)
    expect(layers[5].latest?.runId).toBe("run-6")
    expect(layers[5].findingCount).toBe(2)
    expect(assuranceSourcesComplete(jira(), testOps)).toBe(false)

    const completeJira: JiraProjection = {
      openCount: 0,
      byStatus: { Done: 12 },
      issues: Array.from({ length: 12 }, (_, index) => ({
        key: ["OR-590","OR-594","OR-598","OR-600","OR-601","OR-602","OR-603","OR-604","OR-605","OR-606","OR-607","OR-608"][index],
        summary: `Layer ${index + 1}`,
        status: "Done",
        statusCategory: "Done",
        priority: "High",
        type: "Task",
        parentKey: "OR-620",
        labels: [],
        browseUrl: "https://example.invalid",
        updated: "2026-10-03T00:00:00Z",
      })),
    }
    const ids = ["fast-web","fast-python","property-state-machine","security","fuzz","performance","portability","flakes","coverage-static-sonar","mutation","browser-e2e","live-chaos-soak-recovery"]
    const completeTestOps: TestOpsProjection = {
      ...testOps,
      layers: ids.map((layerId, index) => ({
        layerId,
        runId: `run-${index + 1}`,
        revision: "a".repeat(40),
        outcome: "PASS",
        finishedAt: "2026-10-03T00:00:00Z",
        durationMs: 100,
        jiraMilestone: completeJira.issues[index].key,
      })),
    }
    expect(assuranceSourcesComplete(completeJira, completeTestOps)).toBe(true)
  })

})
