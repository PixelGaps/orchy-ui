import { Activity, GitBranch, RefreshCw, Server, ShieldCheck } from "lucide-react"
import { NavLink } from "react-router-dom"

import type {
  GitHubProjection,
  HostProjection,
  JiraProjection,
  TestOpsProjection,
} from "@/cloud/projections"
import {
  currentSourcePayload,
  sourceAgeLabel,
  sourceTone,
  useCloudSource,
  useRefreshCloudSources,
} from "@/cloud/client"
import {
  Badge,
  Button,
  Card,
  CompactSummary,
  PageHeader,
  PanelHeader,
  Skeleton,
  StatusNotice,
} from "@/components/ui/primitives"
import { assuranceTotals, deriveAssuranceLayers } from "@/domains/assurance/model"

function hostLabel(host: HostProjection | null | undefined) {
  if (!host) return "Unknown"
  return host.state.replaceAll("_", " ")
}

export function Overview() {
  const jira = useCloudSource<JiraProjection>("jira")
  const github = useCloudSource<GitHubProjection>("github")
  const testOps = useCloudSource<TestOpsProjection>("testops")
  const host = useCloudSource<HostProjection>("host")
  const refresh = useRefreshCloudSources(["jira", "github", "testops", "host"])

  const jiraPayload = currentSourcePayload(jira.data)
  const githubPayload = currentSourcePayload(github.data)
  const testOpsPayload = currentSourcePayload(testOps.data)
  const hostPayload = currentSourcePayload(host.data)
  const layers = deriveAssuranceLayers(jiraPayload ?? undefined, testOpsPayload ?? undefined)
  const assurance = assuranceTotals(layers)
  const jiraAvailable = jiraPayload != null
  const testOpsAvailable = testOpsPayload != null
  const assuranceAvailable = jiraAvailable && testOpsAvailable
  const anyNonCurrent = [jira.data, github.data, testOps.data, host.data].some(
    (source) => source?.state !== "fresh",
  )

  return (
    <>
      <PageHeader
        eyebrow="Local Control"
        title="Overview"
        description="Private local operational state from canonical sources. Every figure is live, retained evidence, or explicitly unavailable."
        badge={<Badge tone={anyNonCurrent ? "warn" : "live"}>Local control</Badge>}
      />

      <div className="cloud-toolbar">
        <div className="cloud-source-badges" aria-label="Overview data sources">
          <Badge tone={sourceTone(jira.data)}>Jira · {jira.data?.state ?? "loading"} · {sourceAgeLabel(jira.data)}</Badge>
          <Badge tone={sourceTone(github.data)}>GitHub · {github.data?.state ?? "loading"} · {sourceAgeLabel(github.data)}</Badge>
          <Badge tone={sourceTone(testOps.data)}>TestOps · {testOps.data?.state ?? "loading"} · {sourceAgeLabel(testOps.data)}</Badge>
          <Badge tone={sourceTone(host.data)}>Host · {host.data?.state ?? "loading"} · {sourceAgeLabel(host.data)}</Badge>
        </div>
        <Button
          className="button-secondary"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          <RefreshCw size={14} className={refresh.isPending ? "spin" : undefined} />
          {refresh.isPending ? "Refreshing" : "Refresh sources"}
        </Button>
      </div>

      {[jira, github, testOps, host].some((query) => query.isLoading) && (
        <Skeleton lines={3} />
      )}

      {anyNonCurrent && (
        <StatusNotice
          title="One or more canonical sources are not current"
          body="Stale, unavailable, and loading sources are excluded from current-state figures. Their source badges retain historical freshness context."
          tone="warn"
        />
      )}

      <CompactSummary
        className="cloud-overview-summary"
        items={[
          {
            label: "Host",
            value: hostLabel(hostPayload),
            detail: hostPayload?.lastSeenAt
              ? new Date(hostPayload!.lastSeenAt).toLocaleString()
              : "No heartbeat",
            tone: /^ONLINE/.test(hostPayload?.state ?? "") ? "live" : "neutral",
          },
          {
            label: "Open Jira",
            value: jiraPayload?.openCount ?? "—",
            detail: "Jira OR authority",
            tone: "cyan",
          },
          {
            label: "CI running",
            value: githubPayload?.openWorkflowRuns ?? "—",
            detail: githubPayload?.headSha?.slice(0, 10) ?? "No CI snapshot",
          },
          {
            label: "Assurance",
            value: assuranceAvailable ? `${assurance.completed}/12 complete` : "Unavailable",
            detail: assuranceAvailable
              ? `${assurance.active} active · ${assurance.blocked} blocked`
              : "Requires Jira + TestOps",
            tone: assuranceAvailable ? (assurance.blocked ? "warn" : "live") : "neutral",
          },
          {
            label: "Findings",
            value: testOpsAvailable ? assurance.findings : "Unavailable",
            detail: testOpsAvailable ? "TestOps latest summaries" : "No current TestOps projection",
            tone: testOpsAvailable ? (assurance.findings ? "warn" : "live") : "neutral",
          },
        ]}
      />

      <section className="cloud-overview-grid">
        <Card>
          <PanelHeader
            kicker="Assurance"
            title="12-layer campaign"
            action={<ShieldCheck size={17} aria-hidden="true" />}
          />
          <div className="cloud-overview-list">
            <span><strong>{assuranceAvailable ? assurance.completed : "—"}</strong><small>Completed</small></span>
            <span><strong>{assuranceAvailable ? assurance.active : "—"}</strong><small>Active</small></span>
            <span><strong>{assuranceAvailable ? assurance.blocked : "—"}</strong><small>Blocked</small></span>
            <span><strong>{assuranceAvailable ? assurance.queued : "—"}</strong><small>Queued</small></span>
          </div>
          <NavLink className="cloud-panel-link" to="/assurance">
            Open Test Assurance <span aria-hidden="true">→</span>
          </NavLink>
        </Card>

        <Card>
          <PanelHeader
            kicker="Host capability"
            title="Execution host"
            action={<Server size={17} aria-hidden="true" />}
          />
          <dl className="cloud-kv">
            <div><dt>State</dt><dd>{hostLabel(hostPayload)}</dd></div>
            <div><dt>Machine control</dt><dd>{hostPayload?.machineControlState ?? "—"}</dd></div>
            <div><dt>Control plane</dt><dd>{hostPayload?.controlPlaneVersion ?? "—"}</dd></div>
            <div><dt>Source SHA</dt><dd>{hostPayload?.sourceSha?.slice(0, 12) ?? "—"}</dd></div>
          </dl>
          <p className="cloud-panel-note">
            Host availability controls GPU/hardware actions only; it is not a web-serving dependency.
          </p>
        </Card>

        <Card>
          <PanelHeader
            kicker="Implementation"
            title="GitHub"
            action={<GitBranch size={17} aria-hidden="true" />}
          />
          <dl className="cloud-kv">
            <div><dt>Repository</dt><dd>{githubPayload?.repository ?? "—"}</dd></div>
            <div><dt>Branch</dt><dd>{githubPayload?.defaultBranch ?? "—"}</dd></div>
            <div><dt>Head</dt><dd>{githubPayload?.headSha?.slice(0, 12) ?? "—"}</dd></div>
            <div><dt>Active runs</dt><dd>{githubPayload?.openWorkflowRuns ?? "—"}</dd></div>
          </dl>
        </Card>

        <Card>
          <PanelHeader
            kicker="Work state"
            title="Jira OR"
            action={<Activity size={17} aria-hidden="true" />}
          />
          {jiraAvailable ? (
            <dl className="cloud-kv">
              {Object.entries(jiraPayload?.byStatus ?? {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([status, count]) => (
                  <div key={status}><dt>{status}</dt><dd>{count}</dd></div>
                ))}
            </dl>
          ) : (
            <StatusNotice
              title="Jira unavailable"
              body="No server-side Jira source is configured on Madriguera. Work-state counts are intentionally hidden rather than taken from a bundled snapshot."
              tone="warn"
            />
          )}
        </Card>
      </section>

      <Card className="cloud-authority-panel">
        <PanelHeader kicker="Source contract" title="Authority and freshness" />
        <div className="cloud-authority-grid">
          {[jira.data, github.data, testOps.data, host.data].map((source) =>
            source ? (
              <div key={source.source}>
                <Badge tone={sourceTone(source)}>{source.state}</Badge>
                <strong>{source.source}</strong>
                <span>{source.authority}</span>
                <small>{sourceAgeLabel(source)}</small>
              </div>
            ) : null,
          )}
        </div>
      </Card>
    </>
  )
}
