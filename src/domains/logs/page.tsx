import {
Activity,Play,RefreshCw,TerminalSquare
} from "lucide-react"
import {
useState
} from "react"
import {
NavLink,useSearchParams
} from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import {
Badge,Card,
CollapsibleSection,
CompactSummary,
CopyButton,
EmptyState,
FreshnessBadge,
QueryStateNotice,
SectionPanel,PageHeader,
PanelHeader
} from "@/components/ui/primitives"
import { getApi } from "@/lib/api"
import type {
Execution
} from "@/lib/contracts"
import { logsPollInterval } from "@/lib/polling"
import { cn } from "@/lib/utils"
import type { GitHubProjection } from "@/cloud/projections"
import { sourceAgeLabel, sourceTone, useCloudSource, useRefreshCloudSources } from "@/cloud/client"
import {
SectionTabs,
SemanticEvents,
statusTone,
useDomainTab
} from "@/domains/shared"

export function renderEvidenceValue(value: unknown): string {
  if (value === null) return "null"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value)
  }
  if (value === undefined) return ""
  return JSON.stringify(value)
}


export function formatExecutionTimestamp(item: Execution, now = Date.now()) {
  const stamp = item.updated_at ?? item.started_at ?? item.created_at
  if (!stamp) return "time n/a"
  const date = new Date(typeof stamp === "number" && stamp < 10_000_000_000 ? stamp * 1000 : stamp)
  const age = Math.max(0, now - date.getTime())
  if (age < 60_000) return `${Math.max(1, Math.round(age / 1000))}s ago`
  if (age < 3_600_000) return `${Math.round(age / 60_000)}m ago`
  return `${Math.round(age / 3_600_000)}h ago`
}

function PrivateLogsPage() {
  const [tab, setTab] = useDomainTab("executions")
  const [params] = useSearchParams()
  const [filter, setFilter] = useState("")
  const [stateFilter, setStateFilter] = useState("ALL")
  const [kindFilter, setKindFilter] = useState("ALL")
  const [workerFilter, setWorkerFilter] = useState("ALL")
  const [wrapOutput, setWrapOutput] = useState(true)
  const query = useQuery({
    queryKey: ["operator-logs"],
    queryFn: () => getApi("/api/logs"),
    refetchInterval: (query) =>
      logsPollInterval(query.state.data),
  })
  const github = useCloudSource<GitHubProjection>("github")
  const githubCurrent = Boolean(github.data?.payload) && github.data?.state === "fresh"
  const ciRuns = github.data?.payload?.recentRuns ?? []
  const tabs = [
    { id: "executions", label: "Executions" },
    { id: "jobs", label: "Jobs" },
    { id: "healthchecks", label: "Healthchecks" },
    { id: "ci", label: "CI Runs" },
    { id: "evidence", label: "Evidence" },
  ]
  const requested = params.get("execution")
  const executions = tab === "healthchecks" ? query.data?.healthchecks ?? [] : query.data?.executions ?? []
  const normalizedFilter = filter.trim().toLowerCase()
  const visibleExecutions = executions.filter((item) => {
    const textMatch = !normalizedFilter ||
      [item.activity, item.task, item.kind, item.state, item.phase, item.execution_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedFilter))
    return textMatch &&
      (stateFilter === "ALL" || item.state === stateFilter) &&
      (kindFilter === "ALL" || item.kind === kindFilter) &&
      (workerFilter === "ALL" || item.worker === workerFilter)
  })
  const states = Array.from(new Set(executions.map((item) => item.state).filter(Boolean))).sort((left, right) => String(left).localeCompare(String(right)))
  const kinds = Array.from(new Set(executions.map((item) => item.kind).filter(Boolean))).sort((left, right) => String(left).localeCompare(String(right)))
  const workers = Array.from(new Set(executions.map((item) => item.worker).filter(Boolean))).sort((left, right) => String(left).localeCompare(String(right)))
  const displayTimestamp = (item: Execution) => formatExecutionTimestamp(item)

  const selected = executions.find((item) => item.execution_id === requested) ?? visibleExecutions[0]
  let rawExecutionOutput = "No matching execution."
  if (selected) {
    rawExecutionOutput = selected.output_tail || JSON.stringify(selected.metadata, null, 2)
    if (selected.error) {
      rawExecutionOutput = `ERROR\n${selected.error}\n\n${selected.output_tail || ""}`
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Operational history"
        title="Logs"
        description="Executions, jobs, host certifications, CI runs, evidence and detailed output."
        badge={
          <div className="cloud-source-badges" aria-label="Log authorities">
            <FreshnessBadge updatedAt={query.dataUpdatedAt} error={query.isError} />
            <Badge tone={sourceTone(github.data)}>
              GitHub · {github.data?.state ?? "loading"} · {sourceAgeLabel(github.data)}
            </Badge>
          </div>
        }
      />
      <QueryStateNotice
        error={query.error}
        isFetching={query.isFetching}
        updatedAt={query.dataUpdatedAt}
        onRetry={() => void query.refetch()}
      />
      <SectionTabs tabs={tabs} active={tab} setActive={setTab} />
      <CompactSummary
        className="logs-summary"
        items={[
          { label: "Retained executions", value: Array.isArray(query.data?.executions) ? query.data.executions.length : "Unavailable", detail: "active + latest 40 terminal" },
          { label: "Retained healthchecks", value: Array.isArray(query.data?.healthchecks) ? query.data.healthchecks.length : "Unavailable", detail: "within retained execution window" },
          { label: "Recent CI runs", value: githubCurrent ? ciRuns.length : "Unavailable", detail: githubCurrent ? "GitHub latest page" : "GitHub authority not current" },
          { label: "View", value: tab.replaceAll("_", " "), tone: "cyan" },
        ]}
      />
      <SectionPanel tabId={tab} active={tab === "executions" || tab === "healthchecks"}>
        <section className="two-column logs-grid">
          <Card className="logs-run-index">
            <PanelHeader kicker="RUNS" title={tab === "healthchecks" ? "Healthcheck runs" : "Orchy executions"} />
            <div className="logs-filter logs-filter-rich">
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search runs, phase or ID…"
                aria-label="Filter operational runs"
              />
              <select aria-label="Filter by state" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
                <option value="ALL">All states</option>
                {states.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select aria-label="Filter by kind" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
                <option value="ALL">All kinds</option>
                {kinds.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select aria-label="Filter by worker" value={workerFilter} onChange={(event) => setWorkerFilter(event.target.value)}>
                <option value="ALL">All workers</option>
                {workers.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <button
                type="button"
                className="button button-ghost button-compact"
                onClick={() => {
                  setFilter("")
                  setStateFilter("ALL")
                  setKindFilter("ALL")
                  setWorkerFilter("ALL")
                }}
              >Clear</button>
              <span>{visibleExecutions.length} / {executions.length}</span>
            </div>
            <div className="data-list logs-data-list">
              {visibleExecutions.map((item) => (
                <NavLink
                  key={item.execution_id}
                  className="data-row"
                  to={`/logs?tab=${tab}&execution=${item.execution_id}`}
                >
                  <span className="row-icon"><TerminalSquare size={15} /></span>
                  <div>
                    <strong>{item.activity || item.task}</strong>
                    <small title={String(item.updated_at ?? item.started_at ?? item.created_at ?? "")}>
                      {item.kind} · {item.execution_id.slice(0, 8)} · {displayTimestamp(item)}
                    </small>
                  </div>
                  <Badge tone={statusTone(item.state)}>{item.state}</Badge>
                </NavLink>
              ))}
            </div>
          </Card>
          <Card className="logs-detail-card">
            <PanelHeader
              kicker="DETAIL"
              title={selected?.task || "Select a run"}
              action={selected ? (
                <div className="inline-actions">
                  <CopyButton value={selected.execution_id} label="Copy execution ID" />
                  <CopyButton value={selected.output_tail || selected.error || ""} label="Copy output" />
                  <button
                    type="button"
                    className="icon-button"
                    aria-pressed={wrapOutput}
                    title={wrapOutput ? "Disable output wrapping" : "Wrap output"}
                    aria-label={wrapOutput ? "Disable output wrapping" : "Wrap output"}
                    onClick={() => setWrapOutput((value) => !value)}
                  >↔</button>
                  <button
                    type="button"
                    className="icon-button"
                    title="Download output"
                    aria-label="Download output"
                    onClick={() => {
                      const blob = new Blob([selected.output_tail || selected.error || ""], { type: "text/plain" })
                      const url = URL.createObjectURL(blob)
                      const anchor = document.createElement("a")
                      anchor.href = url
                      anchor.download = `${selected.execution_id}.log`
                      anchor.click()
                      URL.revokeObjectURL(url)
                    }}
                  >↓</button>
                </div>
              ) : undefined}
            />
            {selected && (
              <>
                <div className="console-summary" aria-live="polite">
                  <div><small>State</small><strong>{selected.state}</strong></div>
                  <div><small>Phase</small><strong>{selected.phase || "—"}</strong></div>
                  <div><small>Worker</small><strong>{selected.worker || "—"}</strong></div>
                  <div><small>Model</small><strong>{selected.model || "—"}</strong></div>
                  <div>
                    <small>Attempt</small>
                    <strong>{`${selected.attempt || 1} / ${selected.max_attempts || 1}`}</strong>
                  </div>
                  <div>
                    <small>Validation</small>
                    <strong>{renderEvidenceValue(selected.validation?.status ?? "—")}</strong>
                  </div>
                </div>
                <CollapsibleSection
                  className="logs-evidence-disclosure"
                  title="Semantic evidence"
                  summary={`${selected.evidence?.length ?? 0} retained events`}
                >
                  <SemanticEvents events={selected.evidence ?? []} limit={30} />
                </CollapsibleSection>
              </>
            )}
            <CollapsibleSection
              className="logs-raw-disclosure"
              title="Raw execution output"
              summary={selected?.error ? "error + output tail" : "output tail / metadata"}
            >
              <pre className={cn("terminal-output large", !wrapOutput && "no-wrap")} aria-label="Raw execution output">
                {rawExecutionOutput}
              </pre>
            </CollapsibleSection>
          </Card>
        </section>
      </SectionPanel>
      <SectionPanel tabId="jobs" active={tab === "jobs"}>
        <>
          <Card>
            <PanelHeader kicker="DOMAIN JOBS" title="Structured job inventory" />
            <div className="data-list">
              {(query.data?.jobs ?? []).map((job, index) => (
                <div className="data-row" key={renderEvidenceValue(job.id ?? job.job_id ?? job)}>
                  <span className="row-icon"><TerminalSquare size={15} /></span>
                  <div>
                    <strong>{renderEvidenceValue(job.label ?? job.job ?? job.name ?? job.id ?? `Job ${index + 1}`)}</strong>
                    <small>{renderEvidenceValue(job.status ?? job.state ?? job.phase ?? "retained")}</small>
                  </div>
                  <Badge tone={statusTone(renderEvidenceValue(job.status ?? job.state ?? ""))}>{renderEvidenceValue(job.status ?? job.state ?? "record")}</Badge>
                </div>
              ))}
              {!(query.data?.jobs ?? []).length && <EmptyState title="No jobs retained" body="Domain jobs will appear here when reported." />}
            </div>
          </Card>
          <CollapsibleSection className="logs-json-disclosure" title="Raw job JSON" summary="Authoritative payload">
            <pre className="terminal-output large">{JSON.stringify(query.data?.jobs ?? [], null, 2)}</pre>
          </CollapsibleSection>
        </>
      </SectionPanel>
      <SectionPanel tabId="ci" active={tab === "ci"}>
        <Card>
          <PanelHeader kicker="GITHUB ACTIONS" title="Recent CI runs" />
          <div className="data-list">
            {ciRuns.map((run) => (
              <a className="data-row" href={run.htmlUrl} target="_blank" rel="noreferrer" key={run.id}>
                <span className="row-icon"><Play size={15} /></span>
                <div><strong>{run.name}</strong><small>{run.headSha.slice(0, 10)} · {run.status}</small></div>
                <Badge tone={statusTone(run.conclusion || run.status)}>{run.conclusion || run.status}</Badge>
              </a>
            ))}
            {!githubCurrent && (
              <EmptyState
                title="Current GitHub runs unavailable"
                body="The backend did not substitute an empty CI list. Refresh the GitHub authority to restore current run data."
              />
            )}
          </div>
        </Card>
      </SectionPanel>
      <SectionPanel tabId="evidence" active={tab === "evidence"}>
        <>
          <Card>
            <PanelHeader kicker="CORRELATION" title="Repository evidence" />
            <div className="data-list">
              {Object.entries(query.data?.evidence ?? {}).map(([key, value]) => (
                <div className="data-row" key={key}>
                  <span className="row-icon"><Activity size={15} /></span>
                  <div><strong>{key.replaceAll("_", " ")}</strong><small>{renderEvidenceValue(value).slice(0, 180)}</small></div>
                  <CopyButton value={renderEvidenceValue(value)} label={`Copy ${key}`} />
                </div>
              ))}
            </div>
          </Card>
          <CollapsibleSection className="logs-json-disclosure" title="Raw evidence JSON" summary="Authoritative payload">
            <pre className="terminal-output large">{JSON.stringify(query.data?.evidence ?? {}, null, 2)}</pre>
          </CollapsibleSection>
        </>
      </SectionPanel>
    </>
  )
}



function HostedRunsPage() {
  const github = useCloudSource<GitHubProjection>("github")
  const refresh = useRefreshCloudSources(["github"])
  const runs = github.data?.payload?.recentRuns ?? []
  return (
    <>
      <PageHeader
        eyebrow="GitHub CI"
        title="Runs"
        description="Recent Orchy workflow runs from the canonical private GitHub repository. Live when a server token is available; otherwise the latest retained snapshot is shown explicitly as stale."
        badge={<Badge tone={sourceTone(github.data)}>GitHub · {github.data?.state ?? "loading"} · {sourceAgeLabel(github.data)}</Badge>}
      />
      <div className="page-actions">
        <button
          type="button"
          className="button button-secondary"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          <RefreshCw size={14} /> {refresh.isPending ? "Refreshing" : "Refresh CI"}
        </button>
      </div>
      <CompactSummary
        items={[
          { label: "Recent runs", value: github.data?.state === "fresh" ? runs.length : "Unavailable" },
          { label: "Active", value: github.data?.state === "fresh" && github.data?.payload ? github.data.payload.openWorkflowRuns : "Unavailable", tone: github.data?.state === "fresh" && github.data?.payload?.openWorkflowRuns ? "cyan" : "neutral" },
          { label: "Head", value: github.data?.state === "fresh" ? (github.data?.payload?.headSha?.slice(0, 10) ?? "—") : "Unavailable" },
          { label: "Source", value: github.data?.state ?? "loading", tone: sourceTone(github.data) },
        ]}
      />
      <Card>
        <PanelHeader kicker="GITHUB ACTIONS" title="Recent workflow runs" />
        <div className="data-list">
          {runs.map((run) => (
            <a className="data-row" href={run.htmlUrl} target="_blank" rel="noreferrer" key={run.id}>
              <span className="row-icon"><Play size={15} /></span>
              <div>
                <strong>{run.name}</strong>
                <small>{run.headSha.slice(0, 10)} · {run.status}</small>
              </div>
              <Badge tone={statusTone(run.conclusion || run.status)}>{run.conclusion || run.status}</Badge>
            </a>
          ))}
          {!runs.length && <EmptyState title="No CI runs available" body="Refresh GitHub or update the retained snapshot." />}
        </div>
      </Card>
    </>
  )
}

export function LogsPage() {
  const hosted = import.meta.env.PROD && !(import.meta.env.VITE_ORCHY_API_BASE_URL ?? "").trim()
  return hosted ? <HostedRunsPage /> : <PrivateLogsPage />
}
