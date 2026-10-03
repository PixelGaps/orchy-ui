import { Activity, GitBranch, RefreshCw, Server, ShieldCheck } from "lucide-react"
import { NavLink } from "react-router-dom"

import type {
  GitHubProjection,
  HostProjection,
  JiraProjection,
  TestOpsProjection,
} from "@/cloud/projections"
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

  const layers = deriveAssuranceLayers(jira.data?.payload, testOps.data?.payload)
  const assurance = assuranceTotals(layers)
  const jiraAvailable = Boolean(jira.data?.payload) && jira.data?.state !== "unavailable"
  const testOpsAvailable = Boolean(testOps.data?.payload) && testOps.data?.state !== "unavailable"
  const assuranceAvailable = jiraAvailable && testOpsAvailable
  const anyUnavailable = [jira.data, github.data, testOps.data, host.data].some(
    (source) => source?.state === "unavailable",
  )

  return (
    <>
      <PageHeader
        eyebrow="Local Control"
        title="Overview"
        description="Private local operational state from canonical sources. Every figure is live, retained evidence, or explicitly unavailable."
        badge={<Badge tone={anyUnavailable ? "warn" : "live"}>Local control</Badge>}
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

      {anyUnavailable && (
        <StatusNotice
          title="One or more canonical sources are unavailable"
          body="Unavailable sources are shown without substituting bundled fixtures or another source of truth."
          tone="warn"
        />
      )}

      <CompactSummary
        className="cloud-overview-summary"
        items={[
          {
            label: "Host",
            value: hostLabel(host.data?.payload),
            detail: host.data?.payload?.lastSeenAt
              ? new Date(host.data.payload.lastSeenAt).toLocaleString()
              : "No heartbeat",
            tone: /^ONLINE/.test(host.data?.payload?.state ?? "") ? "live" : "neutral",
          },
          {
            label: "Open Jira",
            value: jira.data?.payload?.openCount ?? "—",
            detail: "Jira OR authority",
            tone: "cyan",
          },
          {
            label: "CI running",
            value: github.data?.payload?.openWorkflowRuns ?? "—",
            detail: github.data?.payload?.headSha?.slice(0, 10) ?? "No CI snapshot",
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
            <div><dt>State</dt><dd>{hostLabel(host.data?.payload)}</dd></div>
            <div><dt>Machine control</dt><dd>{host.data?.payload?.machineControlState ?? "—"}</dd></div>
            <div><dt>Control plane</dt><dd>{host.data?.payload?.controlPlaneVersion ?? "—"}</dd></div>
            <div><dt>Source SHA</dt><dd>{host.data?.payload?.sourceSha?.slice(0, 12) ?? "—"}</dd></div>
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
            <div><dt>Repository</dt><dd>{github.data?.payload?.repository ?? "—"}</dd></div>
            <div><dt>Branch</dt><dd>{github.data?.payload?.defaultBranch ?? "—"}</dd></div>
            <div><dt>Head</dt><dd>{github.data?.payload?.headSha?.slice(0, 12) ?? "—"}</dd></div>
            <div><dt>Active runs</dt><dd>{github.data?.payload?.openWorkflowRuns ?? "—"}</dd></div>
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
              {Object.entries(jira.data?.payload?.byStatus ?? {})
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
