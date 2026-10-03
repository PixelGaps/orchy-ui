import { BarChart3, RefreshCw, ShieldCheck } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { JiraProjection, TestOpsProjection } from "@/cloud/projections"
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
  EmptyState,
  PageHeader,
  PanelHeader,
  Skeleton,
  StatusNotice,
} from "@/components/ui/primitives"

import {
  assuranceTotals,
  deriveAssuranceLayers,
  hasCompleteTestOpsProjection,
  type AssuranceLayerState,
} from "./model"

function stateTone(
  state: AssuranceLayerState,
): "neutral" | "live" | "warn" | "danger" | "cyan" {
  if (state === "completed") return "live"
  if (state === "active") return "cyan"
  if (state === "blocked") return "danger"
  return "neutral"
}

function outcomeTone(
  outcome: string | undefined,
): "neutral" | "live" | "warn" | "danger" {
  if (!outcome) return "neutral"
  if (outcome === "PASS") return "live"
  if (outcome === "FAIL" || outcome === "ERROR") return "danger"
  return "warn"
}

function formatDuration(ms: number | undefined) {
  if (ms == null) return "—"
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${(ms / 60_000).toFixed(1)} min`
}

function formatWhen(value: string | undefined) {
  if (!value) return "No execution recorded"
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TestAssurancePage() {
  const jira = useCloudSource<JiraProjection>("jira")
  const testOps = useCloudSource<TestOpsProjection>("testops")
  const refresh = useRefreshCloudSources(["jira", "testops"])

  const jiraCurrent = Boolean(jira.data?.payload) && jira.data?.state === "fresh"
  const testOpsPresent = Boolean(testOps.data?.payload)
  const testOpsComplete = hasCompleteTestOpsProjection(testOps.data?.payload)
  const testOpsCurrent =
    testOpsPresent && testOpsComplete && testOps.data?.state === "fresh"
  const layers = jiraCurrent
    ? deriveAssuranceLayers(
        jira.data?.payload,
        testOpsPresent ? testOps.data?.payload : undefined,
      )
    : []
  const totals = assuranceTotals(layers)
  const durationData = testOpsPresent
    ? layers
        .filter((layer) => layer.latest)
        .map((layer) => ({
          name: `L${String(layer.number).padStart(2, "0")}`,
          seconds: Math.round(layer.latest!.durationMs / 100) / 10,
        }))
    : []

  const allCurrent = jiraCurrent && testOpsCurrent

  return (
    <>
      <PageHeader
        eyebrow="Assurance"
        title="Test Assurance"
        description="The 12-layer campaign from canonical Jira work state and TestOps execution evidence."
        badge={
          <Badge tone={allCurrent ? "live" : "warn"}>
            {allCurrent ? "Jira + TestOps · current" : "Authority check required"}
          </Badge>
        }
      />

      <div className="cloud-toolbar">
        <div className="cloud-source-badges" aria-label="Assurance data sources">
          <Badge tone={sourceTone(jira.data)}>
            Jira · {jira.data?.state ?? "loading"} · {sourceAgeLabel(jira.data)}
          </Badge>
          <Badge tone={sourceTone(testOps.data)}>
            TestOps · {testOps.data?.state ?? "loading"} · {sourceAgeLabel(testOps.data)}
          </Badge>
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

      {(jira.isLoading || testOps.isLoading) && <Skeleton lines={3} />}

      {jira.data?.state === "unavailable" && (
        <StatusNotice
          title="Jira unavailable"
          body="Layer work state cannot be confirmed. No alternate work-state source is used."
          tone="danger"
        />
      )}
      {jira.data?.state === "stale" && (
        <StatusNotice
          title="Jira projection is stale"
          body={`Current layer totals are unavailable. Last authoritative projection is ${sourceAgeLabel(jira.data)}.`}
          tone="warn"
        />
      )}
      {testOps.data?.state === "unavailable" && (
        <StatusNotice
          title="TestOps unavailable"
          body="Execution evidence is unavailable. Jira state remains visible without fabricating run results."
          tone="warn"
        />
      )}
      {testOps.data?.state === "stale" && (
        <StatusNotice
          title="TestOps evidence is historical"
          body={`Retained run evidence is ${sourceAgeLabel(testOps.data)}. It may be inspected below, but it does not drive a current findings aggregate.`}
          tone="warn"
        />
      )}
      {testOpsPresent && !testOpsComplete && (
        <StatusNotice
          title="TestOps projection is incomplete"
          body={`Only ${testOps.data?.payload?.layers.length ?? 0} of 12 canonical assurance layers are represented. Current TestOps aggregates remain unavailable.`}
          tone="danger"
        />
      )}

      <CompactSummary
        className="assurance-summary"
        items={[
          { label: "Completed", value: jiraCurrent ? totals.completed : "Unavailable", tone: jiraCurrent ? "live" : "neutral" },
          { label: "Active", value: jiraCurrent ? totals.active : "Unavailable", tone: jiraCurrent ? "cyan" : "neutral" },
          { label: "Blocked", value: jiraCurrent ? totals.blocked : "Unavailable", tone: jiraCurrent ? "danger" : "neutral" },
          { label: "Queued", value: jiraCurrent ? totals.queued : "Unavailable" },
          { label: "Findings", value: testOpsCurrent ? totals.findings : "Unavailable", tone: testOpsCurrent ? (totals.findings ? "warn" : "live") : "neutral" },
        ]}
      />

      <section className="assurance-layout">
        <div className="assurance-journey" aria-label="12-layer assurance journey">
          {layers.map((layer) => (
            <Card className="assurance-layer" key={layer.jiraKey}>
              <div className="assurance-layer-head">
                <span className="assurance-layer-number">
                  {String(layer.number).padStart(2, "0")}
                </span>
                <div>
                  <strong>{layer.label}</strong>
                  <small>{layer.jiraKey} · {layer.jiraStatus}</small>
                </div>
                <Badge tone={stateTone(layer.state)}>{layer.state}</Badge>
              </div>

              <div className="assurance-layer-metrics">
                <span>
                  <small>Latest</small>
                  <Badge tone={outcomeTone(layer.latest?.outcome)}>
                    {testOpsPresent ? (layer.latest?.outcome ?? "NO RUN") : "UNAVAILABLE"}
                  </Badge>
                </span>
                <span>
                  <small>Runtime</small>
                  <strong>{testOpsPresent ? formatDuration(layer.latest?.durationMs) : "—"}</strong>
                </span>
                <span>
                  <small>{testOpsCurrent ? "Findings" : "Historical findings"}</small>
                  <strong>{testOpsPresent ? layer.findingCount : "—"}</strong>
                </span>
              </div>

              <details className="assurance-evidence">
                <summary>Evidence</summary>
                {layer.latest ? (
                  <dl>
                    <div><dt>Run</dt><dd>{layer.latest.runId}</dd></div>
                    <div><dt>Revision</dt><dd>{layer.latest.revision.slice(0, 12)}</dd></div>
                    <div><dt>Finished</dt><dd>{formatWhen(layer.latest.finishedAt)}</dd></div>
                    <div><dt>Authority</dt><dd>TestOps / {layer.latest.jiraMilestone ?? layer.jiraKey}</dd></div>
                  </dl>
                ) : (
                  <p>No TestOps execution snapshot is currently available for this layer.</p>
                )}

                {layer.findings.length > 0 && (
                  <div className="assurance-findings">
                    {layer.findings.map((finding) => (
                      <div
                        key={`${finding.layerId}-${finding.category}-${finding.disposition}`}
                      >
                        <strong>{finding.category}</strong>
                        <span>
                          {finding.findings} finding{finding.findings === 1 ? "" : "s"} ·{" "}
                          {finding.disposition} · {finding.distinctSignatures} signature
                          {finding.distinctSignatures === 1 ? "" : "s"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </Card>
          ))}
        </div>

        <Card className="assurance-chart-panel">
          <PanelHeader
            kicker="Execution evidence"
            title={testOpsCurrent ? "Latest layer runtime" : "Historical layer runtime"}
            action={<BarChart3 size={17} aria-hidden="true" />}
          />
          {durationData.length ? (
            <div className="assurance-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis unit="s" width={42} />
                  <Tooltip />
                  <Bar dataKey="seconds" fill="currentColor" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No runtime evidence"
              body="Refresh TestOps after the campaign records layer executions."
            />
          )}
          <div className="assurance-authority">
            <ShieldCheck size={17} aria-hidden="true" />
            <p>
              <strong>Authority boundary</strong>
              <span>Jira owns work state. TestOps owns execution evidence and findings.</span>
            </p>
          </div>
        </Card>
      </section>
    </>
  )
}
