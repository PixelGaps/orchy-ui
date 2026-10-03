import { describe, expect, it, vi } from "vitest"

import { jiraAdapter } from "./adapters"

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
