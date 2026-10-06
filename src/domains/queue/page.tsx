import { useMemo,useRef,useState } from "react"
import { useMutation,useQuery } from "@tanstack/react-query"
import { ExternalLink,RefreshCcw } from "lucide-react"

import {
  Badge,
  Button,
  Card,
  CollapsibleSection,
  CompactSummary,
  DataTable,
  EmptyState,
  PageHeader,
  PanelHeader,
  QueryStateNotice,
  notifyOperator,
} from "@/components/ui/primitives"
import { api,postJSON } from "@/lib/api"
import type {
  GatewayJob,
  GatewayJobDetail,
  GatewayQueueHealth,
  GatewayQueueList,
} from "@/lib/contracts"

export type ActionName = "cancel" | "pause" | "resume" | "retry" | "rerun"
type SortName = "newest" | "oldest" | "age" | "state"

const ACTIONS: ActionName[] = ["pause","resume","cancel","retry","rerun"]
const STATUS_OPTIONS = ["","queued","running","paused","pass","fail","rejected","timeout","cancelled"]
const HEALTH_OPTIONS = ["","live","queued","paused","stale","inconsistent","terminal","unknown"]

export function tone(value: string) {
  if (["pass","live","queued"].includes(value)) return "live" as const
  if (["fail","rejected","timeout","stale","inconsistent"].includes(value)) return "danger" as const
  if (["running","paused"].includes(value)) return "warn" as const
  if (value === "cancelled") return "neutral" as const
  return "cyan" as const
}

export function ageLabel(seconds: number | null | undefined) {
  if (seconds == null) return "—"
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export function actionLabel(action: ActionName) {
  if (action === "rerun") return "Rerun fresh"
  if (action === "retry") return "Retry fresh"
  return action[0]!.toUpperCase() + action.slice(1)
}

export function actionConfirmation(action: ActionName, count = 1) {
  if (action === "cancel") return `Cancel ${count} queued job${count === 1 ? "" : "s"}? This removes visible queue transport and retains cancelled history.`
  if (action === "retry") return `Retry ${count} terminal job${count === 1 ? "" : "s"} as fresh execution${count === 1 ? "" : "s"}? Original history is retained.`
  if (action === "rerun") return `Rerun ${count} job${count === 1 ? "" : "s"} from retained reviewed exact-SHA descriptor${count === 1 ? "" : "s"}? Fresh execution identities will be created.`
  return ""
}

export function safeIso(value: string) {
  if (!value) return ""
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString()
}

type SingleActionDispatch = {
  confirm:(message:string)=>boolean
  notify:(message:string,tone:"error")=>void
  mutate:(variables:{id:string;action:ActionName;operationId:string})=>void
  inFlight:Map<string,string>
  uuid:()=>string
}

export function dispatchQueueAction(job:GatewayJob,action:ActionName,deps:SingleActionDispatch) {
  const capability=job.policy?.capabilities[action]
  if (!capability?.allowed) {
    deps.notify(capability?.reason || "Action is not allowed by queue policy","error")
    return false
  }
  const confirmation=actionConfirmation(action)
  if (confirmation && !deps.confirm(confirmation)) return false
  const key=`${action}:${job.id}`
  const existing=deps.inFlight.get(key)
  const operationId=existing || `web-${action}-${deps.uuid()}`
  if (!existing) deps.inFlight.set(key,operationId)
  deps.mutate({id:job.id,action,operationId})
  return true
}

export function bulkActionAllowed(jobs:GatewayJob[],action:ActionName) {
  return jobs.length > 0 && jobs.every((job)=>job.policy?.capabilities[action]?.allowed)
}

type BulkActionDispatch = {
  confirm:(message:string)=>boolean
  notify:(message:string,tone:"error")=>void
  mutate:(variables:{ids:string[];action:ActionName;operationId:string})=>void
  uuid:()=>string
}

export function dispatchBulkQueueAction(jobs:GatewayJob[],action:ActionName,deps:BulkActionDispatch) {
  if (!bulkActionAllowed(jobs,action)) {
    deps.notify("Selected jobs do not share this safe action","error")
    return false
  }
  const confirmation=actionConfirmation(action,jobs.length)
  if (confirmation && !deps.confirm(confirmation)) return false
  deps.mutate({
    ids:jobs.map((job)=>job.id),
    action,
    operationId:`web-bulk-${action}-${deps.uuid()}`,
  })
  return true
}

export function QueuePage() {
  const [status,setStatus] = useState("")
  const [health,setHealth] = useState("")
  const [repo,setRepo] = useState("")
  const [host,setHost] = useState("")
  const [search,setSearch] = useState("")
  const [createdAfter,setCreatedAfter] = useState("")
  const [createdBefore,setCreatedBefore] = useState("")
  const [sort,setSort] = useState<SortName>("newest")
  const [cursorHistory,setCursorHistory] = useState<string[]>([])
  const [selectedId,setSelectedId] = useState("")
  const [selected,setSelected] = useState<Set<string>>(new Set())
  const inFlight = useRef(new Map<string,string>())
  const cursor = cursorHistory.at(-1) ?? ""

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit:"50" })
    if (cursor) params.set("cursor",cursor)
    if (status) params.set("status",status)
    if (health) params.set("health",health)
    if (repo) params.set("repo",repo)
    if (host) params.set("host_id",host)
    if (search.trim()) params.set("search",search.trim())
    if (createdAfter) params.set("created_after",safeIso(createdAfter))
    if (createdBefore) params.set("created_before",safeIso(createdBefore))
    return params.toString()
  },[cursor,status,health,repo,host,search,createdAfter,createdBefore])

  const jobsQuery = useQuery({
    queryKey:["gateway-full-queue",queryString],
    queryFn:() => api<GatewayQueueList>(`/api/gateway/jobs?${queryString}`),
    refetchInterval:false,
  })
  const healthQuery = useQuery({
    queryKey:["gateway-queue-health"],
    queryFn:() => api<GatewayQueueHealth>("/api/gateway/health"),
    refetchInterval:false,
  })
  const activeId = selectedId || jobsQuery.data?.jobs[0]?.id || ""
  const detailQuery = useQuery({
    queryKey:["gateway-full-job",activeId],
    queryFn:() => api<GatewayJobDetail>(`/api/gateway/jobs/${encodeURIComponent(activeId)}`),
    enabled:Boolean(activeId),
  })

  const refetchAll = () => {
    void jobsQuery.refetch()
    void healthQuery.refetch()
    void detailQuery.refetch()
  }

  const actionMutation = useMutation({
    mutationFn:({id,action,operationId}:{id:string;action:ActionName;operationId:string}) =>
      postJSON<Record<string,unknown>>(
        `/api/gateway/jobs/${encodeURIComponent(id)}/actions/${action}`,
        { operation_id:operationId, actor:"orchy-web" },
      ),
    onSuccess:(_result,variables) => {
      notifyOperator(`${actionLabel(variables.action)} accepted`,"success")
      refetchAll()
    },
    onError:(error) => notifyOperator(error.message,"error"),
    onSettled:(_data,_error,variables) => {
      if (variables) inFlight.current.delete(`${variables.action}:${variables.id}`)
    },
  })

  const bulkMutation = useMutation({
    mutationFn:({ids,action,operationId}:{ids:string[];action:ActionName;operationId:string}) =>
      postJSON<Record<string,unknown>>(
        `/api/gateway/jobs/bulk/actions/${action}`,
        { job_ids:ids, operation_id:operationId, actor:"orchy-web" },
      ),
    onSuccess:() => {
      notifyOperator("Bulk queue action accepted","success")
      setSelected(new Set())
      refetchAll()
    },
    onError:(error) => notifyOperator(error.message,"error"),
  })

  const jobs = useMemo(() => {
    const rows=[...(jobsQuery.data?.jobs ?? [])]
    if (sort === "oldest") rows.reverse()
    if (sort === "age") rows.sort((a,b)=>(b.policy?.age_seconds ?? -1)-(a.policy?.age_seconds ?? -1))
    if (sort === "state") rows.sort((a,b)=>a.status.localeCompare(b.status)||b.created_at.localeCompare(a.created_at))
    return rows
  },[jobsQuery.data?.jobs,sort])

  const resetPaging = () => {
    setCursorHistory([])
    setSelected(new Set())
  }

  const runAction = (job: GatewayJob, action: ActionName) => {
    dispatchQueueAction(job,action,{
      confirm:(message)=>window.confirm(message),
      notify:notifyOperator,
      mutate:(variables)=>actionMutation.mutate(variables),
      inFlight:inFlight.current,
      uuid:()=>crypto.randomUUID(),
    })
  }

  const selectedJobs=jobs.filter((job)=>selected.has(job.id))
  const bulkCapability=(action:ActionName) => bulkActionAllowed(selectedJobs,action)
  const runBulk=(action:ActionName) => {
    dispatchBulkQueueAction(selectedJobs,action,{
      confirm:(message)=>window.confirm(message),
      notify:notifyOperator,
      mutate:(variables)=>bulkMutation.mutate(variables),
      uuid:()=>crypto.randomUUID(),
    })
  }

  const detail=detailQuery.data
  const queueHealth=healthQuery.data
  const worker=queueHealth?.workers?.[0]

  return (
    <>
      <PageHeader
        eyebrow="Supabase execution transport"
        title="Queue"
        description="Full retained gateway ledger, deterministic lease/staleness policy, lineage and safe lifecycle controls."
        badge={<Badge tone={queueHealth?.status === "live" ? "live" : "danger"}>{queueHealth?.status?.toUpperCase() || "UNKNOWN"}</Badge>}
      />

      <Card>
        <PanelHeader
          kicker="QUEUE HEALTH"
          title="Cloud control-plane evidence"
          action={
            <div className="page-actions">
              <Button onClick={refetchAll}><RefreshCcw size={14} /> Refresh</Button>
              {queueHealth?.dashboard_url && (
                <a className="button button-ghost button-compact" href={queueHealth.dashboard_url} target="_blank" rel="noreferrer">
                  Supabase Queues <ExternalLink size={13} />
                </a>
              )}
            </div>
          }
        />
        {!queueHealth?.available ? (
          <EmptyState title={queueHealth?.status === "disconnected" ? "Queue disconnected" : "Queue unavailable"} body={queueHealth?.reason || "No authoritative queue health is available."} />
        ) : (
          <>
            <CompactSummary items={[
              {label:"Depth",value:queueHealth.metrics?.queue_length ?? "Unavailable"},
              {label:"Visible",value:queueHealth.metrics?.queue_visible_length ?? "Unavailable"},
              {label:"Stale",value:queueHealth.stale_count ?? "Unavailable",tone:queueHealth.stale_count ? "danger" : "neutral"},
              {label:"Mismatches",value:queueHealth.ledger_queue_mismatches ?? "Unavailable",tone:queueHealth.ledger_queue_mismatches ? "warn" : "neutral"},
              {label:"Worker",value:worker ? (worker.fresh ? "fresh" : "stale") : "Unavailable",tone:worker ? (worker.fresh ? "live" : "warn") : "neutral"},
              {label:"Oldest pending",value:ageLabel(queueHealth.oldest_pending_age_seconds)},
            ]} />
            <small>
              Observed {queueHealth.observed_at ? new Date(queueHealth.observed_at).toLocaleString() : "—"}
              {" · "}worker last seen {worker?.last_seen_at ? new Date(worker.last_seen_at).toLocaleString() : "unknown"}
              {" · "}transport scrape {queueHealth.metrics?.scrape_time ? new Date(queueHealth.metrics.scrape_time).toLocaleString() : "unknown"}
            </small>
          </>
        )}
      </Card>

      <CollapsibleSection
        className="queue-filter-section"
        title="Filters and sort"
        summary="State, health, repository, host, date range and ordering"
      >
        <div className="queue-filter-grid">
          <label>State<select aria-label="State filter" value={status} onChange={(e)=>{setStatus(e.target.value);resetPaging()}}>
            {STATUS_OPTIONS.map((value)=><option key={value} value={value}>{value || "All states"}</option>)}
          </select></label>
          <label>Health<select aria-label="Health filter" value={health} onChange={(e)=>{setHealth(e.target.value);resetPaging()}}>
            {HEALTH_OPTIONS.map((value)=><option key={value} value={value}>{value || "All health"}</option>)}
          </select></label>
          <label>Repo<select aria-label="Repository filter" value={repo} onChange={(e)=>{setRepo(e.target.value);resetPaging()}}>
            <option value="">All repos</option><option value="orchy">orchy</option><option value="surfer">surfer</option>
          </select></label>
          <label>Host<input aria-label="Host filter" value={host} onChange={(e)=>{setHost(e.target.value);resetPaging()}} placeholder="local-host" /></label>
          <label>Search<input aria-label="Queue search" value={search} onChange={(e)=>{setSearch(e.target.value);resetPaging()}} placeholder="job, request, SHA, id" /></label>
          <label>Created after<input aria-label="Created after" type="datetime-local" value={createdAfter} onChange={(e)=>{setCreatedAfter(e.target.value);resetPaging()}} /></label>
          <label>Created before<input aria-label="Created before" type="datetime-local" value={createdBefore} onChange={(e)=>{setCreatedBefore(e.target.value);resetPaging()}} /></label>
          <label>Sort<select aria-label="Sort jobs" value={sort} onChange={(e)=>setSort(e.target.value as SortName)}>
            <option value="newest">Newest</option><option value="oldest">Oldest page</option><option value="age">Age</option><option value="state">Lifecycle state</option>
          </select></label>
        </div>
      </CollapsibleSection>

      {jobsQuery.isPending && !jobsQuery.data ? <EmptyState title="Loading queue" body="Reading the authoritative Supabase ledger and PGMQ reconciliation state." /> : null}
      {jobsQuery.isError && !jobsQuery.data ? <QueryStateNotice error={jobsQuery.error} onRetry={() => void jobsQuery.refetch()} /> : null}
      {jobsQuery.data?.status === "disconnected" || jobsQuery.data?.status === "unknown" || jobsQuery.data?.status === "unavailable" ? (
        <QueryStateNotice error={new Error(jobsQuery.data.reason || jobsQuery.data.status)} onRetry={() => void jobsQuery.refetch()} />
      ) : null}

      <section className={`two-column compact-detail-grid queue-master-detail${selectedId ? " is-detail-open" : ""}`}>
        <Card className="queue-master-card">
          <PanelHeader kicker="FULL QUEUE" title={jobsQuery.data ? `${jobsQuery.data.total_count} matching jobs` : "Matching jobs unavailable"} />
          {selectedJobs.length > 0 && (
            <div className="page-actions" aria-label="Bulk queue actions">
              <Badge tone="cyan">{selectedJobs.length} selected</Badge>
              {ACTIONS.map((action)=>(
                <Button
                  key={action}
                  disabled={!bulkCapability(action) || bulkMutation.isPending}
                  title={bulkCapability(action) ? actionLabel(action) : "All selected jobs must support this action"}
                  onClick={()=>runBulk(action)}
                >
                  {actionLabel(action)}
                </Button>
              ))}
            </div>
          )}
          {jobs.length ? (
            <DataTable
              label="All retained gateway jobs"
              columns={["Select", "Job", "Repository / request / SHA", "State", "Health", "Open"]}
              rows={jobs.map((job) => ({
                key: job.id,
                cells: [
                  <input
                    aria-label={`Select ${job.request_id}`}
                    type="checkbox"
                    checked={selected.has(job.id)}
                    onChange={(event)=>{
                      const next=new Set(selected)
                      if (event.target.checked) next.add(job.id)
                      else next.delete(job.id)
                      setSelected(next)
                    }}
                  />,
                  job.job,
                  <small>{job.repo} · {job.request_id} · {job.target_sha.slice(0,8)}</small>,
                  <Badge tone={tone(job.status)}>{job.status}</Badge>,
                  <Badge tone={tone(job.policy?.health || "unknown")}>{job.policy?.classification || "UNKNOWN"}</Badge>,
                  <button type="button" className="button button-ghost button-compact" aria-label={`Inspect ${job.request_id}`} onClick={()=>setSelectedId(job.id)}>Inspect</button>,
                ],
              }))}
            />
          ) : !jobsQuery.isPending ? (
            <EmptyState title={jobsQuery.data?.status === "empty" ? "No matching jobs" : "Queue history is empty"} body="Adjust filters or inspect the native Supabase transport surface." />
          ) : null}
          <div className="page-actions">
            <Button disabled={cursorHistory.length === 0} onClick={()=>setCursorHistory((items)=>items.slice(0,-1))}>Previous</Button>
            <Button disabled={!jobsQuery.data?.has_more || !jobsQuery.data.next_cursor} onClick={()=>jobsQuery.data?.next_cursor && setCursorHistory((items)=>[...items,jobsQuery.data!.next_cursor!])}>Next</Button>
          </div>
        </Card>

        <Card className="queue-detail-card">
          <button type="button" className="queue-detail-back button button-ghost button-compact" onClick={()=>setSelectedId("")}>Back to queue</button>
          <PanelHeader
            kicker="JOB DETAIL"
            title={detail?.job || "Select a job"}
            action={detail ? <Badge tone={tone(detail.policy.health)}>{detail.policy.classification}</Badge> : undefined}
          />
          {detail ? (
            <>
              <p>{detail.policy.reason}</p>
              <div className="console-summary">
                <div><small>State</small><strong>{detail.status}</strong></div>
                <div><small>Health</small><strong>{detail.policy.health}</strong></div>
                <div><small>Age</small><strong>{ageLabel(detail.policy.age_seconds)}</strong></div>
                <div><small>Repository</small><strong>{detail.repo}</strong></div>
                <div><small>Request</small><strong>{detail.request_id}</strong></div>
                <div><small>Target SHA</small><strong>{detail.target_sha}</strong></div>
                <div><small>Worker</small><strong>{detail.host_id || "unclaimed"}</strong></div>
                <div><small>Worker freshness</small><strong>{detail.policy.worker.fresh ? "fresh" : "not fresh"}</strong></div>
                <div><small>Queue message</small><strong>{detail.queue_msg_id ?? "—"}</strong></div>
                <div><small>Lease</small><strong>{detail.policy.queue.lease_active ? "active" : "inactive"}</strong></div>
                <div><small>Retry parent</small><strong>{detail.retry_of || "—"}</strong></div>
                <div><small>Checkpoint</small><strong>{detail.checkpoint_mode || "—"}</strong></div>
              </div>

              <div className="page-actions" aria-label="Job actions">
                {ACTIONS.map((action)=>{
                  const capability=detail.policy.capabilities[action]
                  return (
                    <Button
                      key={action}
                      disabled={!capability.allowed || actionMutation.isPending}
                      title={capability.reason}
                      onClick={()=>runAction(detail,action)}
                    >
                      {actionLabel(action)}
                    </Button>
                  )
                })}
              </div>
              <small>{detail.policy.recovery.reason}</small>

              <details open>
                <summary>Lineage</summary>
                <div className="data-list">
                  {(detail.lineage ?? []).map((item)=>(
                    <button className="data-row" type="button" key={item.id} onClick={()=>setSelectedId(item.id)}>
                      <span><strong>{item.request_id}</strong><small>{item.id}</small></span>
                      <Badge tone={tone(item.status)}>{item.status}</Badge>
                    </button>
                  ))}
                  {!(detail.lineage ?? []).length && <small>No parent or child execution.</small>}
                </div>
              </details>

              <details>
                <summary>Parameters and retained evidence</summary>
                <pre className="terminal-output">{JSON.stringify({
                  params_bytes:detail.params_bytes,
                  params_preview:detail.params_preview,
                  error:detail.error,
                  result:detail.result,
                  queue:detail.policy.queue,
                  worker:detail.policy.worker,
                },null,2)}</pre>
              </details>

              <details>
                <summary>Operator audit</summary>
                <div className="data-list">
                  {(detail.audit ?? []).map((item)=>(
                    <div className="data-row" key={item.operation_id}>
                      <span><strong>{item.action}</strong><small>{item.actor} · {new Date(item.occurred_at).toLocaleString()}</small></span>
                      <span>{item.from_status || "—"} → {item.to_status || "—"}</span>
                    </div>
                  ))}
                  {!(detail.audit ?? []).length && <small>No operator mutations retained for this execution.</small>}
                </div>
              </details>
            </>
          ) : (
            <EmptyState title="Select a retained job" body="Inspect authoritative health, exact-SHA descriptor, lineage, evidence and safe actions." />
          )}
        </Card>
      </section>
    </>
  )
}
