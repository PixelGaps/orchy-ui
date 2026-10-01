/**
 * Test documentation — executable specification
 * Per-issue ChatGPT prompts are deterministic and preserve manual/sweep gates.
 */
import { describe, expect, it } from "vitest"

import type { JiraProjection } from "@/cloud/adapters"

import {
  ISSUE_PROMPT_VERSION,
  buildIssueExecutionPrompt,
  issueChatGptUrl,
  issueLaunchMode,
} from "./prompt"

type JiraIssue = JiraProjection["issues"][number]

function issue(overrides: Partial<JiraIssue> = {}): JiraIssue {
  return {
    key: "OR-628",
    summary: "Issue panel",
    status: "In Progress",
    statusCategory: "In Progress",
    priority: "Highest",
    type: "Task",
    parentKey: "OR-620",
    labels: ["cloud-control"],
    browseUrl: "https://espalwebs.atlassian.net/browse/OR-628",
    updated: "2026-09-30T00:00:00Z",
    ...overrides,
  }
}

describe("issue execution prompt", () => {
  it("is deterministic, versioned and reconstructs authority before implementation", () => {
    const value = buildIssueExecutionPrompt(issue())
    expect(value).toBe(buildIssueExecutionPrompt(issue()))
    expect(value).toContain(ISSUE_PROMPT_VERSION)
    expect(value).toContain("Reconstruct the current authoritative state first")
    expect(value).toContain("Read AGENTS.md before any code change")
    expect(value).toContain("including Epic, Task, or TEST LAYER parent")
    expect(value).toContain("close it whenever live Jira shows zero open direct children")
    expect(value).toContain("reopen the correct specific container")
    expect(issueLaunchMode(issue())).toBe("implement")
  })

  it("guards findings under a testing layer from blind remediation", () => {
    const guarded = issue({
      key: "OR-640",
      parentKey: "OR-602",
      summary: "Performance workflow finding",
      labels: ["sweep-deferred"],
    })
    expect(issueLaunchMode(guarded)).toBe("testing-sweep")
    expect(buildIssueExecutionPrompt(guarded)).toContain("Do NOT remediate")
    expect(buildIssueExecutionPrompt(guarded)).toContain("STOP without fixing")
  })

  it("hard-gates OR-634 on fresh explicit manual approval", () => {
    const guarded = issue({
      key: "OR-634",
      summary: "Retire Notion",
      priority: "Low",
    })
    expect(issueLaunchMode(guarded)).toBe("manual-approval")
    const value = buildIssueExecutionPrompt(guarded)
    expect(value).toContain("fresh, explicit manual approval")
    expect(value).toContain("STOP without changing Notion")
  })

  it("encodes a copy-equivalent ChatGPT deep link", () => {
    const value = issue()
    const url = issueChatGptUrl(value)
    expect(url.startsWith("https://chatgpt.com/?prompt=")).toBe(true)
    expect(decodeURIComponent(url.split("?prompt=")[1] ?? "")).toBe(
      buildIssueExecutionPrompt(value),
    )
  })
})
