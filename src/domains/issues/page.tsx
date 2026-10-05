import {
  Copy,
  ExternalLink,
  Filter,
  MessageSquareCode,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import type { JiraProjection } from "@/cloud/projections"
import {
  sourceAgeLabel,
  sourceTone,
  useCloudSource,
  useRefreshCloudSources,
} from "@/cloud/client"
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusNotice,
} from "@/components/ui/primitives"

import {
  buildIssueExecutionPrompt,
  issueChatGptUrl,
  issueLaunchMode,
  type IssueLaunchMode,
} from "./prompt"

type JiraIssue = JiraProjection["issues"][number]

const priorityOrder: Record<string, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
}

function badgeTone(value: string | null | undefined) {
  if (value === "Highest") return "danger" as const
  if (value === "High") return "warn" as const
  if (value === "In Progress" || value === "In Review") return "cyan" as const
  if (value === "Blocked") return "danger" as const
  return "neutral" as const
}

function launchLabel(mode: IssueLaunchMode) {
  if (mode === "manual-approval") return "Review in ChatGPT"
  if (mode === "testing-sweep") return "Continue in ChatGPT"
  return "Implement in ChatGPT"
}

function modeDescription(mode: IssueLaunchMode) {
  if (mode === "manual-approval") {
    return "Manual approval required before any Notion retirement action."
  }
  if (mode === "testing-sweep") {
    return "Testing-sweep guard: execute or reconcile evidence, never blindly remediate findings."
  }
  return "Implementation prompt reconstructs durable authority before changing code."
}

function parentLabel(issue: JiraIssue, all: JiraIssue[]) {
  if (!issue.parentKey) return "Top level"
  const parent = all.find((candidate) => candidate.key === issue.parentKey)
  return parent ? `${issue.parentKey} · ${parent.summary}` : issue.parentKey
}

export function IssuesPage() {
  const jira = useCloudSource<JiraProjection>("jira")
  const refresh = useRefreshCloudSources(["jira"])
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")
  const [type, setType] = useState("all")
  const [parent, setParent] = useState("all")
  const [visibleCount, setVisibleCount] = useState(40)
  useEffect(() => setVisibleCount(40), [query, status, priority, type, parent])

  const jiraAvailable = Boolean(jira.data?.payload) && jira.data?.state !== "unavailable"
  const allIssues = jira.data?.payload?.issues ?? []
  const openIssues = allIssues.filter((issue) => issue.statusCategory !== "Done")

  const statuses = useMemo(
    () => Array.from(new Set(openIssues.map((issue) => issue.status))).sort((a, b) => a.localeCompare(b)),
    [openIssues],
  )
  const priorities = useMemo(
    () =>
      Array.from(
        new Set(
          openIssues
            .map((issue) => issue.priority)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(
        (a, b) =>
          (priorityOrder[a] ?? Number.MAX_SAFE_INTEGER) -
          (priorityOrder[b] ?? Number.MAX_SAFE_INTEGER),
      ),
    [openIssues],
  )
  const types = useMemo(
    () => Array.from(new Set(openIssues.map((issue) => issue.type))).sort((a, b) => a.localeCompare(b)),
    [openIssues],
  )
  const parents = useMemo(
    () =>
      Array.from(
        new Set(
          openIssues
            .map((issue) => issue.parentKey)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [openIssues],
  )

  const filtered = openIssues
    .filter((issue) => {
      const needle = query.trim().toLowerCase()
      if (
        needle &&
        ![issue.key, issue.summary, issue.parentKey ?? "", ...issue.labels]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      ) return false
      if (status !== "all" && issue.status !== status) return false
      if (priority !== "all" && issue.priority !== priority) return false
      if (type !== "all" && issue.type !== type) return false
      if (parent === "top" && issue.parentKey) return false
      if (parent !== "all" && parent !== "top" && issue.parentKey !== parent) return false
      return true
    })
    .sort((a, b) => {
      const priorityDelta =
        (priorityOrder[a.priority ?? ""] ?? 99) -
        (priorityOrder[b.priority ?? ""] ?? 99)
      return priorityDelta || a.key.localeCompare(b.key, undefined, { numeric: true })
    })

  const visibleIssues = filtered.slice(0, visibleCount)\n\n  const milestoneCount = openIssues.filter((issue) => issue.type === "Epic").length
  const subtaskCount = openIssues.filter((issue) => issue.type === "Subtask").length
  const guardedCount = openIssues.filter(
    (issue) => issueLaunchMode(issue) !== "implement",
  ).length

  return (
    <>
      <PageHeader
        eyebrow="Work authority"
        title="Jira Issues"
        description="Open Orchy work from Jira. Cloud Control filters and launches work; it never owns issue state."
        badge={
          <Badge tone={sourceTone(jira.data)}>
            Jira · {jira.data?.state ?? "loading"} · {sourceAgeLabel(jira.data)}
          </Badge>
        }
      />

      <div className="issue-toolbar">
        <label className="issue-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search issues</span>
          <input
            type="search"
            placeholder="Key, summary, parent or label…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button
          className="button-secondary"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          <RefreshCw size={14} className={refresh.isPending ? "spin" : undefined} />
          {refresh.isPending ? "Refreshing" : "Refresh Jira"}
        </Button>
      </div>

      {jira.isLoading && <Skeleton lines={4} />}
      {jira.data?.state === "unavailable" && (
        <StatusNotice
          title="Jira unavailable"
          body="Issue state cannot be reconstructed from another source. Refresh Jira when the canonical adapter is available."
          tone="danger"
        />
      )}

      <div className="issue-summary" aria-label="Issue queue summary">
        <span><strong>{jiraAvailable ? openIssues.length : "Unavailable"}</strong><small>Open</small></span>
        <span><strong>{jiraAvailable ? milestoneCount : "Unavailable"}</strong><small>Milestones</small></span>
        <span><strong>{jiraAvailable ? subtaskCount : "Unavailable"}</strong><small>Subtasks</small></span>
        <span><strong>{jiraAvailable ? guardedCount : "Unavailable"}</strong><small>Guarded</small></span>
        <span><strong>{jiraAvailable ? filtered.length : "Unavailable"}</strong><small>Shown</small></span>
      </div>

      <Card className="issue-filters">
        <div className="issue-filter-title">
          <Filter size={15} aria-hidden="true" />
          <strong>Filters</strong>
        </div>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All</option>
            {statuses.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="all">All</option>
            {priorities.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All</option>
            {types.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Parent</span>
          <select value={parent} onChange={(event) => setParent(event.target.value)}>
            <option value="all">All</option>
            <option value="top">Top level</option>
            {parents.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
      </Card>

      {jiraAvailable && filtered.length === 0 && !jira.isLoading ? (
        <EmptyState
          title="No matching open issues"
          body="Change the filters or refresh Jira. Done issues stay out of the execution queue."
        />
      ) : jiraAvailable ? (
        <section className="issue-list" aria-label="Open Jira issues">
          {visibleIssues.map((issue) => {
            const mode = issueLaunchMode(issue)
            const prompt = buildIssueExecutionPrompt(issue)
            return (
              <Card className="issue-row" key={issue.key}>
                <div className="issue-row-main">
                  <div className="issue-key-line">
                    <strong>{issue.key}</strong>
                    <Badge tone={badgeTone(issue.priority)}>{issue.priority ?? "No priority"}</Badge>
                    <Badge tone={badgeTone(issue.status)}>{issue.status}</Badge>
                    <Badge>{issue.type}</Badge>
                  </div>
                  <h2>{issue.summary}</h2>
                  <p className="issue-parent">Parent: {parentLabel(issue, allIssues)}</p>
                  {issue.labels.length > 0 && (
                    <div className="issue-labels">
                      {issue.labels.slice(0, 5).map((label) => <span key={label}>{label}</span>)}
                    </div>
                  )}
                  {mode !== "implement" && (
                    <div className="issue-guard">
                      <ShieldAlert size={15} aria-hidden="true" />
                      <span>{modeDescription(mode)}</span>
                    </div>
                  )}
                </div>

                <div className="issue-actions">
                  <a
                    className="button issue-chatgpt-action"
                    href={issueChatGptUrl(issue)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageSquareCode size={15} aria-hidden="true" />
                    {launchLabel(mode)}
                  </a>
                  <a
                    className="button button-secondary"
                    href={issue.browseUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    Jira
                  </a>
                  <span className="issue-copy-action">
                    <CopyButton value={prompt} label={`Copy ${issue.key} execution prompt`} />
                    <span>Copy prompt</span>
                  </span>
                </div>

                <details className="issue-prompt-fallback">
                  <summary><Copy size={14} aria-hidden="true" />Fallback prompt</summary>
                  <textarea
                    readOnly
                    value={prompt}
                    rows={9}
                    aria-label={`${issue.key} fallback execution prompt`}
                  />
                </details>
              </Card>
            )
          })}
          {visibleIssues.length < filtered.length && (
            <Button className="button-secondary" onClick={() => setVisibleCount((count) => count + 40)}>
              Show 40 more · {filtered.length - visibleIssues.length} remaining
            </Button>
          )}
        </section>
      ) : null}
    </>
  )
}
