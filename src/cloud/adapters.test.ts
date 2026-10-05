import { describe, expect, it, vi } from "vitest"

import { jiraAdapter, testOpsAdapter } from "./adapters"

function issue(key: string, status: string, category: string) {
  return {
    key,
    fields: {
      summary: `Summary ${key}`,
      status: { name: status, statusCategory: { name: category } },
      issuetype: { name: "Task" },
      priority: { name: "High" },
      parent: null,
      labels: [],
      updated: "2026-10-03T06:00:00.000Z",
    },
  }
}

describe("Jira source completeness", () => {
  it("paginates enhanced JQL until Jira marks the result complete", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const token = url.searchParams.get("nextPageToken")
      if (!token) {
        return new Response(JSON.stringify({
          isLast: false,
          nextPageToken: "page-2",
          issues: [issue("OR-1", "In Progress", "In Progress")],
        }), { status: 200, headers: { "content-type": "application/json" } })
      }
      expect(token).toBe("page-2")
      return new Response(JSON.stringify({
        isLast: true,
        issues: [issue("OR-2", "Done", "Done")],
      }), { status: 200, headers: { "content-type": "application/json" } })
    })

    const result = await jiraAdapter.load({
      JIRA_BASE_URL: "https://example.atlassian.net",
      JIRA_EMAIL: "operator@example.invalid",
      JIRA_API_TOKEN: "test-token",
    }, fetcher as typeof fetch)

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.issues.map(item => item.key)).toEqual(["OR-1", "OR-2"])
    expect(result.openCount).toBe(1)
    expect(result.byStatus).toEqual({ "In Progress": 1, Done: 1 })
  })

  it("fails closed when Jira reports another page without a continuation token", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({
        isLast: false,
        issues: [issue("OR-1", "In Progress", "In Progress")],
      }), { status: 200, headers: { "content-type": "application/json" } }),
    )

    await expect(jiraAdapter.load({
      JIRA_BASE_URL: "https://example.atlassian.net",
      JIRA_EMAIL: "operator@example.invalid",
      JIRA_API_TOKEN: "test-token",
    }, fetcher as typeof fetch)).rejects.toMatchObject({
      code: "JIRA_PAGINATION_INVALID",
    })
  })
})


describe("TestOps canonical 12-layer projection", () => {
  it("projects every canonical retained layer and authoritative finding summary without fallback defaults", async () => {
    const ids = ["browser-e2e","coverage-static-sonar","fast-python","fast-web","flakes","fuzz","live-chaos-soak-recovery","mutation","performance","portability","property-state-machine","security"]
    const layers = ids.map((layer_id, index) => ({
      target: "PixelGaps/orchy",
      layer_id,
      run_id: `run-${index + 1}`,
      revision: String(index).padStart(40, "a"),
      outcome: index === 0 ? "NOT_RUN" : "PASS",
      finished_at: `2026-09-29T${String(index).padStart(2, "0")}:00:00Z`,
      duration_ms: index * 1000,
      jira_milestone: `OR-${590 + index}`,
    }))
    const findings = [{
      target: "PixelGaps/orchy",
      layer_id: "security",
      category: "security",
      disposition: "FIXED",
      findings: 3,
      distinct_signatures: 2,
      last_seen_at: "2026-09-29T18:55:21Z",
    }]
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      return new Response(JSON.stringify(url.includes("latest_layer_result") ? layers : findings), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    })
    const result = await testOpsAdapter.load({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
      TESTOPS_TARGET: "PixelGaps/orchy",
    }, fetcher as typeof fetch)

    expect(result.layers).toHaveLength(12)
    expect(result.layers.map(layer => layer.layerId)).toEqual(ids)
    expect(result.layers[0]).toMatchObject({
      runId: "run-1",
      revision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0",
      outcome: "NOT_RUN",
      durationMs: 0,
    })
    expect(result.findings).toEqual([{
      layerId: "security",
      category: "security",
      disposition: "FIXED",
      findings: 3,
      distinctSignatures: 2,
      lastSeenAt: "2026-09-29T18:55:21Z",
    }])
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls.some(call => String(call[0]).includes("latest_layer_result"))).toBe(true)
    expect(fetcher.mock.calls.some(call => String(call[0]).includes("finding_summary"))).toBe(true)
  })
})
