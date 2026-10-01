import type { JiraProjection } from "@/cloud/projections"

export const ISSUE_PROMPT_VERSION = "orchy.issue-execution.v2"

export type JiraIssue = JiraProjection["issues"][number]

const TEST_LAYER_KEYS = new Set([
  "OR-590",
  "OR-594",
  "OR-598",
  "OR-600",
  "OR-601",
  "OR-602",
  "OR-603",
  "OR-604",
  "OR-605",
  "OR-606",
  "OR-607",
  "OR-608",
])

export type IssueLaunchMode = "implement" | "testing-sweep" | "manual-approval"

export function issueLaunchMode(issue: JiraIssue): IssueLaunchMode {
  if (issue.key === "OR-634") return "manual-approval"
  if (
    TEST_LAYER_KEYS.has(issue.key) ||
    (issue.parentKey != null && TEST_LAYER_KEYS.has(issue.parentKey)) ||
    issue.labels.some((label) =>
      /(?:^|[-_])(test|testing|sweep|assurance|layer)(?:[-_]|$)/i.test(label),
    )
  ) {
    return "testing-sweep"
  }
  return "implement"
}

function issueContext(issue: JiraIssue): string {
  return [
    `Issue: ${issue.key} — ${issue.summary}`,
    `Status: ${issue.status}`,
    `Priority: ${issue.priority ?? "None"}`,
    `Type: ${issue.type}`,
    `Parent: ${issue.parentKey ?? "None"}`,
    `Jira: ${issue.browseUrl}`,
  ].join("\n")
}

function baseInstructions(issue: JiraIssue): string {
  return `Prompt contract: ${ISSUE_PROMPT_VERSION}
${issueContext(issue)}

Work on this Jira issue for Orchy. Reconstruct the current authoritative state first from Jira, GitHub source/tests/CI, AGENTS.md, applicable repo docs/ADRs/OPERATIONS, and relevant durable knowledge only when needed. Do not rely on chat memory or duplicate work state. Read AGENTS.md before any code change.

Respect the issue's current scope, acceptance criteria, blockers and deferrals. Use the smallest complete solution; never weaken tests, authority boundaries, security gates, exact-SHA rules, or zero-spend policy. Use fast deterministic validation; routine CI target <=2 minutes and hard <=3 minutes. Move long/GPU/E2E empirical work to detached Mission. Desktop Commander is forbidden.

When implementation truth changes, update durable technical docs as required. Commit directly to main when complete under current repository policy. Update Jira with exact validation evidence, SHA, branch/PR state, blockers and deferrals. Close ordinary work only when acceptance criteria and required validation are satisfied. For any Jira milestone/container parent — including Epic, Task, or TEST LAYER parent — close it whenever live Jira shows zero open direct children; if later related work appears, reopen the correct specific container or create the new issue under the most specific relevant milestone/layer. Continue autonomously until done or a hard blocker.`
}

export function buildIssueExecutionPrompt(issue: JiraIssue): string {
  const base = baseInstructions(issue)
  const mode = issueLaunchMode(issue)

  if (mode === "manual-approval") {
    return `${base}

MANUAL APPROVAL GATE: This is OR-634, the final Notion retirement ticket. Do not execute, archive, delete, degrade, repurpose or retire any Notion content unless this current ChatGPT conversation contains fresh, explicit manual approval from the user to retire the Notion operational dashboard. Historical approval, milestone progress, parity, cutover, generic cleanup, or this launch action itself do not count. If fresh explicit approval is absent, reconcile the current state, record the manual-approval blocker if useful, and STOP without changing Notion.`
  }

  if (mode === "testing-sweep") {
    return `${base}

ACTIVE TESTING-SWEEP GATE: This issue belongs to or is tagged for the 12-layer assurance sweep. Execute testing/reconciliation/evidence capture when that is the issue's purpose, and create/reconcile findings under the correct layer. Do NOT remediate discovered testing defects while the active full-sweep no-fix policy remains in force. If this issue itself is a recorded finding/remediation item, preserve evidence, confirm its status/parent/deferral and STOP without fixing it unless Jira contains explicit durable evidence that the sweep remediation gate has opened.`
  }

  return `${base}

Before changing code, check whether this issue has become blocked, superseded, already implemented, or converted into a testing-sweep finding. If so, reconcile that durable state rather than blindly implementing stale instructions.`
}

export function issueChatGptUrl(issue: JiraIssue): string {
  return `https://chatgpt.com/?prompt=${encodeURIComponent(buildIssueExecutionPrompt(issue))}`
}
