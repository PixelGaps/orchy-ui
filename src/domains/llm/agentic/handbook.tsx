import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  Badge,
  Card,
  CollapsibleSection,
  CompactSummary,
  PanelHeader,
  QueryStateNotice,
} from "@/components/ui/primitives"
import { api } from "@/lib/api"

type Lane = {
  lane: "chatgpt" | "aider" | "cline"
  run_id: string
  captured_at: string
  outcome: string
  failure_kind: string
  agent_version: string
  model: string
  jira_key: string
  improvement: string
  diagnosis: string
  recommendation: string
  changed_files: string[]
  oracle_result: string
  validation_outcome: string
}

type HandbookTask = {
  ordinal: number
  campaign_task_id: string
  suite_id: string
  suite_version: string
  task_id: string
  task_version: string
  title: string
  summary: string
  repository: string
  capability_tags: string[]
  state: "not_run" | "partial" | "completed" | "failed" | "blocked"
  issues: string[]
  lanes: Record<"chatgpt" | "aider" | "cline", Lane | null>
  history: Lane[]
}

type HandbookPayload = {
  available: boolean
  reason: string
  total_tasks: number
  matched_tasks: number | null
  summary: Record<string, number> | null
  tasks: HandbookTask[]
}

const PAGE_SIZE = 50

function tone(outcome?: string): "live" | "warn" | "neutral" | "cyan" {
  if (outcome === "PASS") return "live"
  if (outcome === "FAIL" || outcome === "BLOCKED" || outcome === "INVALID") return "warn"
  if (outcome && outcome !== "UNKNOWN") return "cyan"
  return "neutral"
}

function LaneCell({ label, lane }: Readonly<{ label: string; lane: Lane | null }>) {
  return (
    <div className="handbook-lane">
      <small>{label}</small>
      <Badge tone={tone(lane?.outcome)}>{lane?.outcome || "UNKNOWN"}</Badge>
    </div>
  )
}

function TaskDetail({ task }: Readonly<{ task: HandbookTask }>) {
  return (
    <div className="handbook-task-detail">
      <div className="handbook-detail-grid">
        <div><small>Immutable identity</small><code>{task.campaign_task_id}@{task.task_version}</code></div>
        <div><small>Suite</small><strong>{task.suite_id}@{task.suite_version}</strong></div>
        <div><small>Repository</small><strong>{task.repository}</strong></div>
        <div><small>Capabilities</small><strong>{task.capability_tags.join(", ") || "UNKNOWN"}</strong></div>
      </div>
      <p>{task.summary || "Task summary unavailable."}</p>

      {task.issues.length > 0 && (
        <div className="handbook-issues">
          <small>Associated Jira issues</small>
          <div>
            {task.issues.map((key) => (
              <a
                className="button button-ghost"
                href={"https://espalwebs.atlassian.net/browse/" + encodeURIComponent(key)}
                target="_blank"
                rel="noreferrer"
                key={key}
              >
                {key}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="handbook-lane-detail-grid">
        {(["chatgpt", "aider", "cline"] as const).map((name) => {
          const lane = task.lanes[name]
          return (
            <Card key={name} className="handbook-lane-card">
              <PanelHeader kicker={name.toUpperCase()} title={lane?.outcome || "UNKNOWN"} />
              {lane ? (
                <dl className="handbook-run-facts">
                  <div><dt>Release</dt><dd>{lane.agent_version} · {lane.model}</dd></div>
                  <div><dt>Validation</dt><dd>{lane.validation_outcome || "UNKNOWN"}{lane.oracle_result ? " · " + lane.oracle_result : ""}</dd></div>
                  <div><dt>Failure class</dt><dd>{lane.failure_kind || "—"}</dd></div>
                  <div><dt>Changed files</dt><dd>{lane.changed_files.length ? lane.changed_files.join(", ") : "—"}</dd></div>
                  <div><dt>Improvement</dt><dd>{lane.improvement || "—"}</dd></div>
                  <div><dt>Diagnosis</dt><dd>{lane.diagnosis || "—"}</dd></div>
                  <div><dt>Recommendation</dt><dd>{lane.recommendation || "—"}</dd></div>
                  <div><dt>Evidence</dt><dd><code>{lane.run_id}</code></dd></div>
                </dl>
              ) : (
                <p className="form-help">No retained run for this lane. Missing evidence is not a failure.</p>
              )}
            </Card>
          )
        })}
      </div>

      {task.history.length > 0 && (
        <CollapsibleSection title="Run / rerun history" summary={String(task.history.length) + " retained records"}>
          <div className="handbook-history">
            {task.history.map((run) => (
              <div className="data-row" key={run.lane + "-" + run.run_id}>
                <div>
                  <strong>{run.lane} · {run.outcome}</strong>
                  <small>{run.captured_at || "UNKNOWN"} · {run.agent_version} · {run.model}</small>
                </div>
                <code>{run.run_id}</code>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

export function AgenticHandbook() {
  const [query, setQuery] = useState("")
  const [state, setState] = useState("")
  const [issuesOnly, setIssuesOnly] = useState(false)
  const [offset, setOffset] = useState(0)

  const params = useMemo(() => {
    const search = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) })
    if (query.trim()) search.set("q", query.trim())
    if (state) search.set("state", state)
    if (issuesOnly) search.set("has_issues", "true")
    return search.toString()
  }, [issuesOnly, offset, query, state])

  const handbook = useQuery({
    queryKey: ["agentic-handbook", params],
    queryFn: () => api<HandbookPayload>("/api/agentic/handbook?" + params),
  })

  const data = handbook.data
  const matched = data?.matched_tasks ?? 0
  const pageStart = matched ? offset + 1 : 0
  const pageEnd = Math.min(offset + PAGE_SIZE, matched)
  const canPrevious = offset > 0
  const canNext = Boolean(data?.available && offset + PAGE_SIZE < matched)

  return (
    <>
      <QueryStateNotice
        error={handbook.error}
        isFetching={handbook.isFetching}
        updatedAt={handbook.dataUpdatedAt}
        onRetry={() => void handbook.refetch()}
      />
      <CompactSummary
        className="handbook-summary"
        items={[
          { label: "Frozen tasks", value: data?.available ? data.total_tasks : "Unavailable", tone: "cyan" },
          { label: "Completed", value: data?.summary ? data.summary.completed : "Unavailable", tone: "live" },
          {
            label: "Failed / blocked",
            value: data?.summary ? (data.summary.failed || 0) + (data.summary.blocked || 0) : "Unavailable",
            tone: "warn",
          },
          { label: "With issues", value: data?.summary ? data.summary.has_issues : "Unavailable" },
        ]}
      />

      <Card className="handbook-card">
        <PanelHeader kicker="2,863-TASK CAPABILITY BOOK" title="Professional agentic benchmark handbook" />
        <p className="form-help">
          Frozen campaign + retained Evidence Lake. Jira remains work/defect authority; missing evidence stays UNKNOWN.
        </p>
        {!data?.available && data && <p className="panel-warning">{data.reason || "Handbook authority is unavailable."}</p>}

        <div className="handbook-toolbar">
          <label className="handbook-search">
            <Search size={15} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setOffset(0) }}
              placeholder="Search task, repo, title or Jira key…"
              aria-label="Search handbook tasks"
            />
          </label>
          <label>
            <span>State</span>
            <select
              value={state}
              onChange={(event) => { setState(event.target.value); setOffset(0) }}
              aria-label="Filter handbook state"
            >
              <option value="">All</option>
              <option value="not_run">Not run</option>
              <option value="partial">Partial / running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked / invalid</option>
            </select>
          </label>
          <label className="handbook-issues-toggle">
            <input
              type="checkbox"
              checked={issuesOnly}
              onChange={(event) => { setIssuesOnly(event.target.checked); setOffset(0) }}
            />
            <span>Has Jira issues</span>
          </label>
        </div>

        <div className="handbook-table" role="table" aria-label="Agentic handbook tasks">
          <div className="handbook-row handbook-head" role="row">
            <span>#</span><span>Task</span><span>State</span><span>ChatGPT</span><span>Aider</span><span>Cline</span><span>Issues</span>
          </div>
          {(data?.tasks ?? []).map((task) => (
            <details className="handbook-task" key={task.campaign_task_id}>
              <summary>
                <div className="handbook-row" role="row">
                  <span>{task.ordinal}</span>
                  <span className="handbook-task-name">
                    <strong>{task.title || task.task_id}</strong>
                    <small>{task.task_id} · {task.repository}</small>
                  </span>
                  <Badge tone={task.state === "completed" ? "live" : task.state === "failed" || task.state === "blocked" ? "warn" : "neutral"}>
                    {task.state.replace("_", " ")}
                  </Badge>
                  <LaneCell label="ChatGPT" lane={task.lanes.chatgpt} />
                  <LaneCell label="Aider" lane={task.lanes.aider} />
                  <LaneCell label="Cline" lane={task.lanes.cline} />
                  <span>{task.issues.length ? task.issues.join(", ") : "—"}</span>
                </div>
              </summary>
              <TaskDetail task={task} />
            </details>
          ))}
        </div>

        <div className="handbook-pagination" aria-label="Handbook pagination">
          <span>{data?.available ? String(pageStart) + "–" + String(pageEnd) + " of " + String(matched) : "Unavailable"}</span>
          <div>
            <button className="button button-ghost" type="button" disabled={!canPrevious} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              <ChevronLeft size={15} /> Previous
            </button>
            <button className="button button-ghost" type="button" disabled={!canNext} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </Card>
    </>
  )
}
