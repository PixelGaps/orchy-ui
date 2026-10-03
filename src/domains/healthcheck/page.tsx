import {
Play
} from "lucide-react"
import {
NavLink
} from "react-router-dom"
import { useMutation,useQuery } from "@tanstack/react-query"

import {
Badge,
Button,CollapsibleSection,
CompactSummary,FreshnessBadge,PageHeader,QueryStateNotice,
notifyOperator
} from "@/components/ui/primitives"
import { getApi,runHealthcheck } from "@/lib/api"
import { healthcheckPollInterval } from "@/lib/polling"
import {
statusTone
} from "@/domains/shared"

type HealthcheckRunSummaryItem = {
  domain: string
  resource_class: string
  gpu_required: boolean
  latest?: HealthcheckLatestRun | null
}

type HealthcheckLatestRun = {
  updated_at?: string | number | null
  started_at?: string | number | null
  created_at?: string | number | null
  elapsed_ms?: number | null
}

export function healthcheckRunSummary(item: HealthcheckRunSummaryItem) {
  const stamp = item.latest?.updated_at ?? item.latest?.started_at ?? item.latest?.created_at
  let when = "never run"
  if (stamp) {
    const normalizedStamp =
      typeof stamp === "number" && stamp < 10_000_000_000
        ? stamp * 1000
        : stamp
    when = new Date(normalizedStamp).toLocaleString()
  }
  const duration = item.latest?.elapsed_ms
    ? `${(item.latest.elapsed_ms / 1000).toFixed(1)}s`
    : "duration n/a"
  return `${item.domain} · ${item.resource_class} · ${item.gpu_required ? "GPU" : "CPU / adapter"} · ${when} · ${duration}`
}

export function HealthcheckPage() {
  const query = useQuery({
    queryKey: ["healthchecks"],
    queryFn: () => getApi("/api/healthchecks"),
    refetchInterval: (query) =>
      healthcheckPollInterval(query.state.data),
  })
  const run = useMutation({
    mutationFn: (id: string) => runHealthcheck(id),
    onSuccess: (_result, id) => {
      notifyOperator(`${id} healthcheck accepted`, "success")
      void query.refetch()
    },
    onError: (error) => notifyOperator(error.message, "error"),
  })
  return (
    <>
      <PageHeader
        eyebrow="Physical host"
        title="Healthcheck"
        description="Run only the certifications that require the real host, Docker, GPU or installed runtimes."
        badge={<FreshnessBadge updatedAt={query.dataUpdatedAt} error={query.isError} />}
      />
      <QueryStateNotice
        error={query.error}
        isFetching={query.isFetching}
        updatedAt={query.dataUpdatedAt}
        onRetry={() => void query.refetch()}
      />
      <CompactSummary
        className="healthcheck-summary"
        items={[
          { label: "Checks", value: query.data ? query.data.length : "Unavailable" },
          {
            label: "Passing",
            value: query.data ? query.data.filter((item) => item.latest?.state === "completed").length : "Unavailable",
            tone: "live",
          },
          {
            label: "Attention",
            value: query.data ? query.data.filter((item) =>
              ["failed", "timed_out", "resource_blocked"].includes(String(item.latest?.state || ""))
            ).length : "Unavailable",
            tone: "warn",
          },
          {
            label: "GPU",
            value: query.data ? query.data.filter((item) => item.gpu_required).length : "Unavailable",
            detail: "host-bound certifications",
            tone: "cyan",
          },
        ]}
      />
      {run.isPending && (
        <p className="form-help healthcheck-policy-note">
          One host certification launch is being submitted. Other launch controls stay disabled until the request is accepted.
        </p>
      )}
      <div className="health-list">
        {(query.data ?? []).map((item) => (
          <CollapsibleSection
            key={item.id}
            className="healthcheck-row"
            title={item.label}
            summary={healthcheckRunSummary(item)}
            badge={
              <span data-testid={`healthcheck-state-${item.id}`}>
                <Badge tone={statusTone(item.latest?.state)}>
                  {item.latest?.state || "not run"}
                </Badge>
              </span>
            }
            action={
              <Button
                className="button-primary button-compact"
                disabled={run.isPending}
                onClick={() => run.mutate(item.id)}
                aria-label={`Run ${item.label}`}
                data-testid={`healthcheck-run-${item.id}`}
              >
                <Play size={14} /> {run.isPending && run.variables === item.id ? "Starting…" : "Run"}
              </Button>
            }
          >
            <div className="health-body health-body-compact" data-healthcheck-id={item.id}>
              <p>{item.description}</p>
              {item.latest?.error && <p className="error-text">{item.latest.error}</p>}
              <div className="page-actions">
                {item.latest?.execution_id && (
                  <NavLink className="button button-ghost" to={`/logs?tab=healthchecks&execution=${item.latest.execution_id}`}>
                    View log
                  </NavLink>
                )}
              </div>
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </>
  )
}

