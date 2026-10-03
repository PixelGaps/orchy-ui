import { Ban, Cpu, RefreshCw, SlidersHorizontal } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import type {
  FleetProjection,
  HostProjection,
  OperationProjection,
} from "@/cloud/projections"
import {
  cancelCloudOperation,
  fetchOperatorPreferences,
  resetOperatorPreferences,
  sourceAgeLabel,
  sourceTone,
  updateOperatorPreferences,
  useCloudSource,
  useRefreshCloudSources,
} from "@/cloud/client"
import {
  Badge,
  Button,
  Card,
  CompactSummary,
  DataTable,
  EmptyState,
  PageHeader,
  PanelHeader,
  RangeControl,
  SelectControl,
  StatusNotice,
  Switch,
  notifyOperator,
} from "@/components/ui/primitives"
import { DEFAULT_OPERATOR_PREFERENCES, type OperatorPreferences } from "@/cloud/preferences"
import { getApi } from "@/lib/api"

const TERMINAL = new Set(["completed", "failed", "cancelled", "canceled", "timed_out"])

function tone(value: string): "neutral" | "live" | "warn" | "danger" | "cyan" {
  const state = value.toLowerCase()
  if (["completed", "ready", "online", "available", "qualified"].includes(state)) return "live"
  if (["failed", "offline", "error", "timed_out"].includes(state)) return "danger"
  if (["running", "leased", "active"].includes(state)) return "cyan"
  if (["queued", "pending", "stale"].includes(state)) return "warn"
  return "neutral"
}

function isHostBound(operation: OperationProjection["operations"][number]) {
  return operation.resources.some((resource) =>
    /gpu|host|docker|comfy|local/i.test(resource),
  )
}

function hostOnline(host: HostProjection | null | undefined) {
  if (!host) return false
  const state = host.state.toLowerCase()
  return state.startsWith("online") || ["ready", "available", "idle"].includes(state)
}

function validTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function providerAllowanceCurrent(
  provider: FleetProjection["providers"][number],
  now = Date.now(),
) {
  const observed = validTimestamp(provider.observedAt)
  if (observed == null || now - observed > provider.maxAgeSeconds * 1000) return false
  const reset = validTimestamp(provider.resetAt)
  return reset == null || reset > now
}

function quotaSnapshotCurrent(quota: any, now = Date.now()) {
  if (quota?.remaining == null) return true
  const observed = validTimestamp(quota.updated_at)
  const reset = validTimestamp(quota.reset_at)
  if (reset != null && reset <= now) return false
  return observed != null && now - observed <= 86_400_000
}

export function MissionsPage() {
  const operations = useCloudSource<OperationProjection>("operations")
  const fleet = useCloudSource<FleetProjection>("fleet")
  const host = useCloudSource<HostProjection>("host")
  const refresh = useRefreshCloudSources(["operations", "fleet", "host"])
  const runtimeOverview = useQuery({
    queryKey: ["operator-overview-runtime"],
    queryFn: () => getApi("/api/operator/overview"),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const queryClient = useQueryClient()
  const preferences = useQuery({
    queryKey: ["operator-preferences"],
    queryFn: fetchOperatorPreferences,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
  const [draft, setDraft] = useState<OperatorPreferences>(DEFAULT_OPERATOR_PREFERENCES)
  const [preferencesDirty, setPreferencesDirty] = useState(false)

  useEffect(() => {
    if (preferences.data?.preferences && !preferencesDirty) {
      setDraft(preferences.data.preferences)
    }
  }, [preferences.data?.preferences, preferencesDirty])

  const applyPreferences = useMutation({
    mutationFn: () => updateOperatorPreferences(draft),
    onSuccess: async (next) => {
      setDraft(next)
      setPreferencesDirty(false)
      notifyOperator("Operator preferences applied and audited", "success")
      await queryClient.invalidateQueries({ queryKey: ["operator-preferences"] })
    },
    onError: (error) =>
      notifyOperator(
        error instanceof Error ? error.message : "Preference update failed",
        "error",
      ),
  })

  const resetPreferences = useMutation({
    mutationFn: resetOperatorPreferences,
    onSuccess: async (next) => {
      setDraft(next)
      setPreferencesDirty(false)
      notifyOperator("Operator preferences reset to defaults", "success")
      await queryClient.invalidateQueries({ queryKey: ["operator-preferences"] })
    },
    onError: (error) =>
      notifyOperator(
        error instanceof Error ? error.message : "Preference reset failed",
        "error",
      ),
  })

  const cancel = useMutation({
    mutationFn: cancelCloudOperation,
    onSuccess: async () => {
      notifyOperator("Mission cancellation accepted by ExecutionStore", "success")
      await queryClient.invalidateQueries({ queryKey: ["cloud-source", "operations"] })
    },
    onError: (error) => notifyOperator(error instanceof Error ? error.message : "Cancellation failed", "error"),
  })

  const operationsAvailable = Boolean(operations.data?.payload) && operations.data?.state === "fresh"
  const hostAvailable = Boolean(host.data?.payload) && host.data?.state === "fresh"
  const jobs = operations.data?.payload?.operations ?? []
  const providers = fleet.data?.payload?.providers ?? []
  const fleetRowsCurrent = providers.every((provider) => providerAllowanceCurrent(provider))
  const fleetAvailable =
    Boolean(fleet.data?.payload) && fleet.data?.state === "fresh" && fleetRowsCurrent
  const visibleJobs = jobs.slice(0, draft.historyLimit)
  const visibleProviders =
    draft.defaultFleetView === "eligible"
      ? providers.filter((provider) => provider.qualified)
      : providers
  const hostPayload = host.data?.payload
  const online = hostAvailable ? hostOnline(hostPayload) : null
  const active = operationsAvailable
    ? jobs.filter((job) => !TERMINAL.has(job.state.toLowerCase()))
    : []
  const hostBoundActive = active.filter(isHostBound)
  const remainingMinutes = fleetAvailable
    ? providers.reduce((sum, item) => sum + Math.max(0, item.remainingRunnerMinutes), 0)
    : null
  const productQuotas = runtimeOverview.data?.quotas ?? []

  return (
    <>
      <PageHeader
        eyebrow="Cloud Control"
        title="Missions"
        description="ExecutionStore missions, zero-spend runner allowance and physical-host capability state. No background polling."
        badge={<Badge tone={online === true ? "live" : online === false ? "warn" : "neutral"}>Execution host · {online === true ? "online" : online === false ? "offline" : "unavailable"}</Badge>}
      />

      <div className="page-actions">
        <Button
          className="button-secondary"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          <RefreshCw size={14} /> {refresh.isPending ? "Refreshing" : "Refresh authorities"}
        </Button>
      </div>

      <CompactSummary
        items={[
          { label: "Active missions", value: operationsAvailable ? active.length : "Unavailable", tone: operationsAvailable && active.length ? "cyan" : "neutral" },
          { label: "Host-bound", value: operationsAvailable ? hostBoundActive.length : "Unavailable", tone: operationsAvailable && hostBoundActive.length && online === false ? "warn" : "neutral" },
          { label: "Qualified runners", value: fleetAvailable ? providers.filter((item) => item.qualified).length : "Unavailable", tone: fleetAvailable ? "live" : "neutral" },
          { label: "Free minutes", value: fleetAvailable && remainingMinutes != null ? remainingMinutes : "Unavailable", detail: fleetRowsCurrent ? "current reported provider allowance" : "provider snapshot expired" },
        ]}
      />

      {online === false && (
        <StatusNotice
          title="Execution host offline"
          body="Host-bound actions stay disabled. Cloud Control, Jira, CI fleet and retained mission history remain available."
          tone="warn"
        />
      )}

      <section className="two-column compact-detail-grid">
        <Card>
          <PanelHeader
            kicker="EXECUTIONSTORE"
            title="Mission state and history"
            action={<Badge tone={sourceTone(operations.data)}>operations · {sourceAgeLabel(operations.data)}</Badge>}
          />
          <div className={draft.denseOperations ? "data-list mission-list-dense" : "data-list"}>
            {visibleJobs.map((job) => {
              const hostBound = isHostBound(job)
              const terminal = TERMINAL.has(job.state.toLowerCase())
              let disabledReason: string | null = null
              if (terminal) disabledReason = "Mission is terminal"
              else if (hostBound && online !== true) disabledReason = hostAvailable ? "Execution host is offline" : "Execution host state is unavailable"
              return (
                <div className="data-row" key={job.id}>
                  <span>
                    <strong>{job.operation}</strong>
                    <small>{job.logicalKey} · {job.targetSha.slice(0, 8)} · attempt {job.attempt}</small>
                  </span>
                  <span className="page-actions">
                    {hostBound && <Badge tone="cyan">host</Badge>}
                    <Badge tone={tone(job.state)}>{job.state}</Badge>
                    <Button
                      className="button-compact"
                      disabled={Boolean(disabledReason) || cancel.isPending}
                      title={disabledReason ?? "Cancel through canonical ExecutionStore RPC"}
                      onClick={() => cancel.mutate(job.id)}
                    >
                      <Ban size={13} /> Cancel
                    </Button>
                  </span>
                </div>
              )
            })}
            {!jobs.length && (
              <EmptyState title="No retained missions" body="Refresh the ExecutionStore projection. Cloud Control does not synthesize mission state." />
            )}
          </div>
        </Card>

        <div className="stack">
          <Card>
            <PanelHeader
              kicker="ZERO-SPEND FLEET"
              title="Runner availability and allowance"
              action={<Badge tone={sourceTone(fleet.data)}>fleet · {sourceAgeLabel(fleet.data)}</Badge>}
            />
            {visibleProviders.length ? (
              <DataTable
                label="Runner availability and allowance"
                columns={["Provider", "Status", "Allowance"]}
                rows={visibleProviders.map((provider) => ({
                  key: provider.provider,
                  cells: [
                    <span><strong>{provider.provider}</strong><small>priority {provider.priority} · observed {provider.observedAt ?? "unknown"}</small></span>,
                    <Badge tone={providerAllowanceCurrent(provider) ? (provider.qualified ? "live" : "warn") : "neutral"}>
                      {providerAllowanceCurrent(provider) ? provider.status : "historical"}
                    </Badge>,
                    <strong>
                      {providerAllowanceCurrent(provider)
                        ? `${provider.remainingRunnerMinutes}/${provider.limitRunnerMinutes} min`
                        : "Unavailable"}
                    </strong>,
                  ],
                }))}
              />
            ) : <EmptyState title="No runner snapshot" body="Refresh the canonical CI fleet projection." />}
          </Card>

          <Card className="product-quota-card">
            <PanelHeader
              kicker="SERVICE / TOOL QUOTAS"
              title="Authoritative allowance snapshots"
              action={<Badge tone="cyan">runtime API</Badge>}
            />
            {productQuotas.length ? (
              <DataTable
                label="Service and tool quotas"
                columns={["Product", "Status", "Remaining"]}
                rows={productQuotas.map((quota) => ({
                  key: quota.id,
                  cells: [
                    <span><strong>{quota.product}</strong><small>{quota.quota} · {quota.source}</small></span>,
                    <Badge tone={!quotaSnapshotCurrent(quota) ? "neutral" : quota.exhausted ? "danger" : quota.status === "warning" ? "warn" : quota.status === "ok" ? "live" : "neutral"}>
                      {quotaSnapshotCurrent(quota) ? quota.status : "historical"}
                    </Badge>,
                    <span>
                      <strong>
                        {!quotaSnapshotCurrent(quota)
                          ? "Unavailable"
                          : quota.remaining == null
                            ? "unknown remaining"
                            : `${quota.remaining} ${quota.unit} remaining`}
                      </strong>
                      <small>{quota.updated_at ? `observed ${quota.updated_at}` : "freshness unknown"}</small>
                    </span>,
                  ],
                }))}
              />
            ) : (
              <EmptyState
                title={runtimeOverview.error ? "Product quota snapshot unavailable" : "No active product quota snapshot"}
                body={runtimeOverview.error ? "The runtime API did not provide an authoritative quota snapshot. No synthetic quota is shown." : "Only authoritative active quota snapshots render here; unknown or inactive providers stay explicit rather than guessed."}
              />
            )}
          </Card>

          <Card>
            <PanelHeader
              kicker="PHYSICAL CAPABILITY"
              title="Execution host"
              action={<Badge tone={sourceTone(host.data)}>host · {sourceAgeLabel(host.data)}</Badge>}
            />
            <div className="console-summary">
              <div><small>State</small><strong>{hostPayload?.state ?? "unavailable"}</strong></div>
              <div><small>Machine control</small><strong>{hostPayload?.machineControlState ?? "unknown"}</strong></div>
              <div><small>Control plane</small><strong>{hostPayload?.controlPlaneVersion ?? "unknown"}</strong></div>
              <div><small>Source SHA</small><strong>{hostPayload?.sourceSha?.slice(0, 12) ?? "unknown"}</strong></div>
              <div>
                <small>GPU capability</small>
                <strong>{online === true ? "host-bound · detail not projected" : online === false ? "offline" : "unavailable"}</strong>
              </div>
              <div>
                <small>Model runtimes</small>
                <strong>{online === true ? "host-bound · detail not projected" : online === false ? "offline" : "unavailable"}</strong>
              </div>
            </div>
            <p className="form-help"><Cpu size={13} /> GPU/model/runtime actions remain host-bound and fail closed while this authority is offline.</p>
          </Card>

          <Card>
            <PanelHeader
              kicker="OPERATOR SETTINGS"
              title="Cloud Control preferences"
              action={
                <Badge tone={preferences.data?.persistence === "browser" ? "live" : "neutral"}>
                  {preferences.data?.persistence ?? "loading"}
                </Badge>
              }
            />
            <div className="mission-preference-controls">
              <RangeControl
                label="Mission history"
                value={draft.historyLimit}
                min={10}
                max={100}
                step={10}
                onChange={(historyLimit) => {
                  setPreferencesDirty(true)
                  setDraft((current) => ({ ...current, historyLimit }))
                }}
                description="Number of retained mission rows shown in this view."
                formatValue={(value) => `${value} rows`}
              />
              <Switch
                label="Dense mission rows"
                checked={draft.denseOperations}
                onCheckedChange={(denseOperations) => {
                  setPreferencesDirty(true)
                  setDraft((current) => ({ ...current, denseOperations }))
                }}
                description="Reduce vertical spacing for high-volume operation review."
              />
              <SelectControl
                label="Fleet view"
                value={draft.defaultFleetView}
                options={[
                  { value: "eligible", label: "Qualified providers only" },
                  { value: "all", label: "All providers" },
                ]}
                onChange={(defaultFleetView) => {
                  setPreferencesDirty(true)
                  setDraft((current) => ({
                    ...current,
                    defaultFleetView:
                      defaultFleetView === "all" ? "all" : "eligible",
                  }))
                }}
                description="Default provider visibility for quota review."
              />
            </div>
            <div className="page-actions">
              <Button
                disabled={
                  applyPreferences.isPending ||
                  resetPreferences.isPending
                }
                onClick={() => applyPreferences.mutate()}
              >
                Apply preferences
              </Button>
              <Button
                className="button-secondary"
                disabled={
                  applyPreferences.isPending ||
                  resetPreferences.isPending
                }
                onClick={() => resetPreferences.mutate()}
              >
                Reset defaults
              </Button>
            </div>
            <p className="form-help">
              <SlidersHorizontal size={13} /> Stored locally in this browser for the historical UI only; authoritative operational state remains external.
            </p>
          </Card>

          <Card>
            <PanelHeader kicker="HOST SETTINGS" title="Runtime configuration boundary" />
            <StatusNotice
              title="Canonical settings bridge required"
              body="Global runtime settings remain owned by the existing typed preview/apply/rollback service. Cloud Control will not bypass it by writing host files or transport rows directly."
              tone="info"
            />
            <div className="data-list">
              <div className="data-row">
                <span><strong>Preview / validate</strong><small>Existing runtime-configuration owner</small></span>
                <Badge tone="warn">host-bound</Badge>
              </div>
              <div className="data-row">
                <span><strong>Apply / rollback</strong><small>Disabled until a reviewed cloud-to-host bridge exists</small></span>
                <Badge tone="neutral">disabled</Badge>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  )
}
