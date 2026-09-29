import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  CloudCog,
  Cpu,
  ExternalLink,
  Gauge,
  GitBranch,
  ListChecks,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react"

import type {
  FleetProjection,
  GitHubProjection,
  HostProjection,
  JiraProjection,
  OperationProjection,
  TestOpsProjection,
} from "./cloud/adapters"
import type { CloudSource, SourceReadModel } from "./cloud/read-model"

type SourceMap = {
  jira: JiraProjection
  github: GitHubProjection
  testops: TestOpsProjection
  host: HostProjection
  operations: OperationProjection
  fleet: FleetProjection
}

type Tab = "overview" | "issues" | "missions" | "assurance"

const SOURCES: CloudSource[] = [
  "jira",
  "github",
  "testops",
  "host",
  "operations",
  "fleet",
]

function stateTone(state?: string) {
  if (state === "fresh") return "ok"
  if (state === "stale") return "warn"
  return "bad"
}

function age(model?: SourceReadModel<unknown>) {
  if (!model || model.ageSeconds == null) return "no snapshot"
  if (model.ageSeconds < 60) return `${model.ageSeconds}s`
  if (model.ageSeconds < 3600) return `${Math.floor(model.ageSeconds / 60)}m`
  return `${Math.floor(model.ageSeconds / 3600)}h`
}

async function readSource<T>(source: CloudSource): Promise<SourceReadModel<T>> {
  const response = await fetch(`/api/cloud-control/sources/${source}`, {
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`)
  return response.json()
}

async function refreshSource<T>(source: CloudSource): Promise<SourceReadModel<T>> {
  const response = await fetch(`/api/cloud-control/sources/${source}/refresh`, {
    method: "POST",
    cache: "no-store",
  })
  const payload = await response.json()
  if (!response.ok && payload?.state !== "unavailable") {
    throw new Error(`${source}: HTTP ${response.status}`)
  }
  return payload
}

function SourceBadge({ name, model }: { name: string; model?: SourceReadModel<unknown> }) {
  return (
    <span className={`source-badge ${stateTone(model?.state)}`}>
      {name} · {model?.state ?? "loading"} · {age(model)}
    </span>
  )
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>("overview")
  const [models, setModels] = useState<Partial<Record<CloudSource, SourceReadModel<unknown>>>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCached = async () => {
    const results = await Promise.allSettled(
      SOURCES.map(async (source) => [source, await readSource(source)] as const),
    )
    const next: Partial<Record<CloudSource, SourceReadModel<unknown>>> = {}
    for (const result of results) {
      if (result.status === "fulfilled") next[result.value[0]] = result.value[1]
    }
    setModels(next)
  }

  const refreshAll = async () => {
    setBusy(true)
    setError(null)
    const results = await Promise.allSettled(
      SOURCES.map(async (source) => [source, await refreshSource(source)] as const),
    )
    const next = { ...models }
    const failures: string[] = []
    for (const result of results) {
      if (result.status === "fulfilled") next[result.value[0]] = result.value[1]
      else failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason))
    }
    setModels(next)
    setError(failures.length ? failures.join(" · ") : null)
    setBusy(false)
  }

  useEffect(() => {
    void loadCached()
  }, [])

  const jira = models.jira as SourceReadModel<JiraProjection> | undefined
  const github = models.github as SourceReadModel<GitHubProjection> | undefined
  const testops = models.testops as SourceReadModel<TestOpsProjection> | undefined
  const host = models.host as SourceReadModel<HostProjection> | undefined
  const operations = models.operations as SourceReadModel<OperationProjection> | undefined
  const fleet = models.fleet as SourceReadModel<FleetProjection> | undefined

  const openIssues = jira?.payload?.issues.filter((issue) => issue.statusCategory !== "Done") ?? []
  const activeOperations =
    operations?.payload?.operations.filter(
      (item) => !["completed", "failed", "cancelled", "canceled", "timed_out"].includes(item.state.toLowerCase()),
    ) ?? []
  const findings = testops?.payload?.findings.reduce((sum, row) => sum + row.findings, 0) ?? 0
  const qualifiedRunners = fleet?.payload?.providers.filter((provider) => provider.qualified).length ?? 0
  const hostOnline = Boolean(
    host?.payload &&
      (host.payload.state.toLowerCase().startsWith("online") ||
        ["ready", "available", "idle"].includes(host.payload.state.toLowerCase())),
  )

  const assuranceRows = useMemo(() => {
    const runs = testops?.payload?.layers ?? []
    return runs.slice().sort((a, b) => a.layerId.localeCompare(b.layerId, undefined, { numeric: true }))
  }, [testops?.payload?.layers])

  return (
    <div className="app-shell">
      <header>
        <div>
          <span className="eyebrow">ORCHY CLOUD CONTROL</span>
          <h1>Operator Dashboard</h1>
          <p>Jira, GitHub, TestOps and ExecutionStore remain authoritative. This UI only projects and controls reviewed actions.</p>
        </div>
        <button className="refresh" onClick={() => void refreshAll()} disabled={busy}>
          <RefreshCw size={16} className={busy ? "spin" : undefined} />
          {busy ? "Refreshing" : "Refresh authorities"}
        </button>
      </header>

      <nav aria-label="Dashboard sections">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><Gauge size={16}/>Overview</button>
        <button className={tab === "issues" ? "active" : ""} onClick={() => setTab("issues")}><ListChecks size={16}/>Issues</button>
        <button className={tab === "missions" ? "active" : ""} onClick={() => setTab("missions")}><CloudCog size={16}/>Missions</button>
        <button className={tab === "assurance" ? "active" : ""} onClick={() => setTab("assurance")}><ShieldCheck size={16}/>Assurance</button>
      </nav>

      {error && <div className="notice bad"><CircleAlert size={16}/>{error}</div>}

      {tab === "overview" && (
        <main>
          <section className="source-strip">
            <SourceBadge name="Jira" model={jira} />
            <SourceBadge name="GitHub" model={github} />
            <SourceBadge name="TestOps" model={testops} />
            <SourceBadge name="Host" model={host} />
          </section>
          <section className="stats">
            <Stat label="Open Jira" value={openIssues.length} />
            <Stat label="Active missions" value={activeOperations.length} />
            <Stat label="Assurance findings" value={findings} />
            <Stat label="Qualified runners" value={qualifiedRunners} />
          </section>
          <section className="grid two">
            <article>
              <h2><Server size={18}/>Execution host</h2>
              <div className="kv"><span>State</span><strong>{host?.payload?.state ?? "unavailable"}</strong></div>
              <div className="kv"><span>Machine control</span><strong>{host?.payload?.machineControlState ?? "unknown"}</strong></div>
              <div className="kv"><span>GPU capability</span><strong>{hostOnline ? "host-bound" : "offline"}</strong></div>
              <div className="kv"><span>Model runtimes</span><strong>{hostOnline ? "host-bound" : "offline"}</strong></div>
            </article>
            <article>
              <h2><GitBranch size={18}/>GitHub</h2>
              <div className="kv"><span>Repository</span><strong>{github?.payload?.repository ?? "unavailable"}</strong></div>
              <div className="kv"><span>Branch</span><strong>{github?.payload?.defaultBranch ?? "unknown"}</strong></div>
              <div className="kv"><span>Head</span><strong>{github?.payload?.headSha?.slice(0, 12) ?? "unknown"}</strong></div>
              <div className="kv"><span>Open CI runs</span><strong>{github?.payload?.openWorkflowRuns ?? "—"}</strong></div>
            </article>
          </section>
        </main>
      )}

      {tab === "issues" && (
        <main>
          <section className="section-head">
            <div><span className="eyebrow">WORK AUTHORITY</span><h2>Open Jira issues</h2></div>
            <SourceBadge name="Jira" model={jira} />
          </section>
          <section className="list">
            {openIssues.map((issue) => (
              <article className="row" key={issue.key}>
                <div>
                  <span className="key">{issue.key}</span>
                  <h3>{issue.summary}</h3>
                  <small>{issue.type} · {issue.status} · {issue.priority ?? "No priority"} · parent {issue.parentKey ?? "top"}</small>
                </div>
                <a href={issue.browseUrl} target="_blank" rel="noreferrer">Jira <ExternalLink size={14}/></a>
              </article>
            ))}
            {!openIssues.length && <div className="empty">No cached open Jira work. Refresh authorities.</div>}
          </section>
        </main>
      )}

      {tab === "missions" && (
        <main>
          <section className="section-head">
            <div><span className="eyebrow">EXECUTIONSTORE</span><h2>Missions and runner allowance</h2></div>
            <SourceBadge name="Operations" model={operations} />
          </section>
          {!hostOnline && <div className="notice warn"><Cpu size={16}/>Execution host offline; host-bound actions remain unavailable while cloud state stays readable.</div>}
          <section className="grid two">
            <article>
              <h2><Activity size={18}/>Recent operations</h2>
              <div className="list compact">
                {(operations?.payload?.operations ?? []).slice(0, 20).map((item) => (
                  <div className="kv" key={item.id}>
                    <span>{item.operation}<small>{item.logicalKey} · {item.targetSha.slice(0,8)}</small></span>
                    <strong>{item.state}</strong>
                  </div>
                ))}
              </div>
            </article>
            <article>
              <h2><Server size={18}/>Zero-spend fleet</h2>
              <div className="list compact">
                {(fleet?.payload?.providers ?? []).map((provider) => (
                  <div className="kv" key={provider.provider}>
                    <span>{provider.provider}<small>priority {provider.priority} · {provider.status}</small></span>
                    <strong>{provider.remainingRunnerMinutes}/{provider.limitRunnerMinutes} min</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      )}

      {tab === "assurance" && (
        <main>
          <section className="section-head">
            <div><span className="eyebrow">TESTOPS</span><h2>12-layer assurance evidence</h2></div>
            <SourceBadge name="TestOps" model={testops} />
          </section>
          <section className="list">
            {assuranceRows.map((layer) => (
              <article className="row" key={layer.layerId}>
                <div>
                  <span className="key">Layer {layer.layerId}</span>
                  <h3>{layer.outcome}</h3>
                  <small>{layer.finishedAt} · {Math.round(layer.durationMs / 1000)}s · {layer.revision.slice(0,12)}</small>
                </div>
                <span className={`status ${/pass|success|complete/i.test(layer.outcome) ? "ok" : "warn"}`}>
                  {/pass|success|complete/i.test(layer.outcome) ? <CheckCircle2 size={14}/> : <CircleAlert size={14}/>}
                  {layer.outcome}
                </span>
              </article>
            ))}
            {!assuranceRows.length && <div className="empty">No cached TestOps evidence. Refresh authorities.</div>}
          </section>
        </main>
      )}
    </div>
  )
}
