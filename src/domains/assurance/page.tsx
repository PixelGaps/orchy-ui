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
  EmptyState,
  PageHeader,
  PanelHeader,
  Skeleton,
  StatusNotice,
} from "@/components/ui/primitives"

import {
  assuranceSourcesComplete,
  assuranceTotals,
  deriveAssuranceLayers,
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

  const jiraPayload = currentSourcePayload(jira.data)
  const testOpsPayload = currentSourcePayload(testOps.data)
  const jiraAvailable = jiraPayload != null
  const testOpsAvailable = testOpsPayload != null
  const complete = assuranceSourcesComplete(jiraPayload, testOpsPayload)
  const layers = jiraAvailable ? deriveAssuranceLayers(jiraPayload, testOpsPayload ?? undefined) : []
  const totals = assuranceTotals(layers)
  const durationData = complete ? layers
    .filter((layer) => layer.latest)
    .map((layer) => ({
      name: `L${String(layer.number).padStart(2, "0")}`,
      seconds: Math.round((layer.latest!.durationMs) / 100) / 10,
    })) : []

  const sourceUnavailable =
    jira.data?.state !== "fresh" || testOps.data?.state !== "fresh"

  return (
    <>
      <PageHeader
        eyebrow="Assurance"
        title="Test Assurance"
        description="The 12-layer campaign from canonical Jira work state and TestOps execution evidence."
        badge={<Badge tone={sourceUnavailable ? "warn" : "live"}>Jira + TestOps</Badge>}
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

      {jira.data?.state !== "fresh" && (
        <StatusNotice
          title="Jira not current"
          body="Layer work-state figures are hidden until Jira authority is fresh; stale snapshots remain historical source evidence only."
          tone="danger"
        />
      )}
      {testOps.data?.state !== "fresh" && (
        <StatusNotice
          title="TestOps not current"
          body="Execution figures are hidden until TestOps authority is fresh; stale snapshots are not treated as current run results."
          tone="warn"
        />
      )}

      {!complete && jira.data?.state === "fresh" && testOps.data?.state === "fresh" && (
        <StatusNotice
          title="Assurance authority incomplete"
          body="Current totals stay unavailable until Jira work state and canonical TestOps evidence reconcile across all 12 layers."
          tone="danger"
        />
      )}

      <CompactSummary
        className="assurance-summary"
        items={[
          { label: "Completed", value: complete ? totals.completed : "Unavailable", tone: complete ? "live" : "neutral" },
          { label: "Active", value: complete ? totals.active : "Unavailable", tone: complete ? "cyan" : "neutral" },
          { label: "Blocked", value: complete ? totals.blocked : "Unavailable", tone: complete ? "danger" : "neutral" },
          { label: "Queued", value: complete ? totals.queued : "Unavailable" },
          { label: "Findings", value: complete ? totals.findings : "Unavailable", tone: complete ? (totals.findings ? "warn" : "live") : "neutral" },
        ]}
      />

      <section className="assurance-layout">
        <div className="assurance-journey" aria-label="12-layer assurance journey">
          {layers.map((layer) => (
            <details className="assurance-layer" key={layer.jiraKey}>
              <summary className="assurance-layer-summary">
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
              </summary>

              <div className="assurance-layer-metrics">
                <span>
                  <small>Latest</small>
                  <Badge tone={outcomeTone(layer.latest?.outcome)}>
                    {testOpsAvailable ? (layer.latest?.outcome ?? "NO RUN") : "UNAVAILABLE"}
                  </Badge>
                </span>
                <span>
                  <small>Runtime</small>
                  <strong>{testOpsAvailable ? formatDuration(layer.latest?.durationMs) : "—"}</strong>
                </span>
                <span>
                  <small>Findings</small>
                  <strong>{testOpsAvailable ? layer.findingCount : "—"}</strong>
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
            </details>
          ))}
        </div>

        <Card className="assurance-chart-panel">
          <PanelHeader
            kicker="Execution evidence"
            title="Latest layer runtime"
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
