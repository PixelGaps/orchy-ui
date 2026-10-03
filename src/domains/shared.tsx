import {
RefreshCw,TerminalSquare,
X
} from "lucide-react"
import {
useEffect,
useMemo,
useState
} from "react"
import {
NavLink,useSearchParams
} from "react-router-dom"
import { useMutation,useQuery } from "@tanstack/react-query"

import {
Badge,
Button,
Card,
CollapsibleSection,
CompactSummary,QueryStateNotice,notifyOperator,
PanelHeader
} from "@/components/ui/primitives"
import {
applyConfiguration,
cancelExecution,
getApi,
getConfiguration,
previewConfiguration,
} from "@/lib/api"
import type { GetPath } from "@/lib/api"
import type {
ConfigurationPreview
} from "@/lib/contracts"
import { executionPollInterval } from "@/lib/polling"
import { cn } from "@/lib/utils"

export function useExecutions() {
  return useQuery({
    queryKey: ["executions"],
    queryFn: () => getApi("/api/executions"),
    refetchInterval: (query) =>
      executionPollInterval(query.state.data),
  })
}


export function statusTone(phase?: string) {
  if (phase === "completed" || phase === "PASS") return "live" as const
  if (
    phase === "failed" ||
    phase === "timed_out" ||
    phase === "REJECT" ||
    phase === "ITEM_FAILED" ||
    phase === "PACK_FAILED"
  ) return "danger" as const
  if (
    phase === "running" ||
    phase === "retrying" ||
    phase === "cancelling" ||
    phase === "resource_blocked" ||
    phase === "REVIEW"
  ) return "warn" as const
  return "neutral" as const
}


function textValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value || fallback
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value)
  }
  return fallback
}


export function SemanticEvents({
  events,
  limit = 12,
}: Readonly<{
  events: Record<string, unknown>[]
  limit?: number
}>) {
  const values = events.slice(-limit)
  if (!values.length) return null
  const occurrences = new Map<string, number>()

  return (
    <div className="semantic-events" aria-label="Semantic execution events">
      {values.map((event) => {
        const eventClass = textValue(event.class, "log")
        const signature = JSON.stringify(event)
        const occurrence = (occurrences.get(signature) ?? 0) + 1
        occurrences.set(signature, occurrence)
        return (
          <code
            className={cn("semantic-event", `semantic-${eventClass}`)}
            key={`${signature}-${occurrence}`}
          >
            <span>{eventClass.replaceAll("_", " ")}</span>
            {textValue(event.summary)}
          </code>
        )
      })}
    </div>
  )
}


export function ExecutionPanel({
  kind,
  executionId,
  showOutput = true,
}: Readonly<{
  kind?: string
  executionId?: string
  showOutput?: boolean
}>) {
  const executions = useExecutions()
  const values = executions.data ?? []
  const e = executionId
    ? values.find((item) => item.execution_id === executionId)
    : (
        values.find(
          (item) =>
            (!kind || item.kind === kind) &&
            (item.state === "running" || item.state === "cancelling"),
        ) ??
        values.find((item) => !kind || item.kind === kind)
      )

  const cancel = useMutation({
    mutationFn: () => cancelExecution(e?.execution_id ?? ""),
    onSuccess: () => notifyOperator("Cancellation requested", "success"),
    onError: (error) => notifyOperator(error.message, "error"),
  })
  const semanticEvents = e?.evidence ?? []
  const repository =
    e?.metadata?.repository &&
    typeof e.metadata.repository === "object" &&
    !Array.isArray(e.metadata.repository)
      ? (e.metadata.repository as Record<string, unknown>)
      : undefined
  const preflight =
    repository?.preflight &&
    typeof repository.preflight === "object" &&
    !Array.isArray(repository.preflight)
      ? (repository.preflight as Record<string, unknown>)
      : undefined
  const additional = Array.isArray(repository?.additional)
    ? (repository?.additional as Array<Record<string, unknown>>)
    : []
  const machineResult =
    e?.metadata?.machine_result &&
    typeof e.metadata.machine_result === "object" &&
    !Array.isArray(e.metadata.machine_result)
      ? (e.metadata.machine_result as Record<string, unknown>)
      : undefined
  const resultEvidence =
    machineResult?.evidence &&
    typeof machineResult.evidence === "object" &&
    !Array.isArray(machineResult.evidence)
      ? (machineResult.evidence as Record<string, unknown>)
      : undefined
  const machineMetadata =
    machineResult?.metadata &&
    typeof machineResult.metadata === "object" &&
    !Array.isArray(machineResult.metadata)
      ? (machineResult.metadata as Record<string, unknown>)
      : undefined
  const diagnostics =
    machineMetadata?.diagnostics &&
    typeof machineMetadata.diagnostics === "object" &&
    !Array.isArray(machineMetadata.diagnostics)
      ? (machineMetadata.diagnostics as Record<string, unknown>)
      : undefined
  const failedChecks = Array.isArray(diagnostics?.failed_checks)
    ? diagnostics.failed_checks.map((item) => textValue(item)).filter(Boolean)
    : []
  const attemptedRepair = Array.isArray(diagnostics?.attempted_repair)
    ? diagnostics.attempted_repair.map((item) => textValue(item)).filter(Boolean)
    : []

  return (
    <Card className="execution-console">
      <PanelHeader
        kicker="LIVE EXECUTION"
        title={e?.activity || "Ready"}
        action={<Badge tone={statusTone(e?.state)}>{e?.state || "idle"}</Badge>}
      />
      <div className="console-summary" aria-live="polite">
        <div>
          <small>Task</small>
          <strong>{e?.task || "No active task"}</strong>
        </div>
        <div>
          <small>Phase</small>
          <strong>{e?.phase || "—"}</strong>
        </div>
        <div>
          <small>Worker</small>
          <strong>{e?.worker || "—"}</strong>
        </div>
        <div>
          <small>Model</small>
          <strong>{e?.model || "—"}</strong>
        </div>
        <div>
          <small>Attempt</small>
          <strong>{e ? `${e.attempt || 1} / ${e.max_attempts || 1}` : "—"}</strong>
        </div>
        <div>
          <small>Validation</small>
          <strong>{textValue(e?.validation?.status, "—")}</strong>
        </div>
        <div>
          <small>Elapsed</small>
          <strong>{e?.elapsed_ms ? `${(e.elapsed_ms / 1000).toFixed(1)}s` : "—"}</strong>
        </div>
        {repository && (
          <div>
            <small>Repository</small>
            <strong>
              {textValue(repository.remote_identity, textValue(repository.id, "—"))}
            </strong>
          </div>
        )}
        {repository && (
          <div>
            <small>Repository scope</small>
            <strong>
              Primary: {textValue(repository.id, "—")}
              {additional.length
                ? `; Additional: ${additional
                    .map((item) => textValue(item.repository_id, textValue(item.remote_identity, "unknown")))
                    .join(", ")}`
                : "; Additional: none"}
            </strong>
          </div>
        )}
        {preflight && (
          <div>
            <small>Preflight</small>
            <strong>
              {textValue(preflight.tracked_files, "—")} tracked ·{" "}
              {preflight.writable === false ? "read-only" : "writable"}
            </strong>
          </div>
        )}
        {machineResult && (
          <div data-testid="execution-machine-result">
            <small>Result</small>
            <strong>
              {textValue(machineResult.outcome, textValue(machineResult.category, "available"))}
            </strong>
          </div>
        )}
        {resultEvidence && (
          <div data-testid="execution-result-evidence">
            <small>Result evidence</small>
            <strong>
              {textValue(
                resultEvidence.summary,
                textValue(resultEvidence.evidence_outcome, "available"),
              )}
            </strong>
          </div>
        )}
        {diagnostics && (
          <div data-testid="execution-diagnostics">
            <small>Diagnostics</small>
            <strong>
              {textValue(diagnostics.failure_class, "none")}
              {" · next: "}
              {textValue(diagnostics.next_action, "—")}
              {failedChecks.length ? ` · failed: ${failedChecks.join(", ")}` : ""}
              {attemptedRepair.length ? ` · repair: ${attemptedRepair.join(", ")}` : ""}
            </strong>
          </div>
        )}
      </div>
      <SemanticEvents events={semanticEvents} />
      {e?.state === "running" && (
        <Button
          className="button-danger"
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
        >
          <X size={15} />
          {cancel.isPending ? "Cancelling…" : "Cancel"}
        </Button>
      )}
      {showOutput && (
        <pre className="terminal-output">
          {e?.error
            ? `ERROR\n${e.error}\n\n${e.output_tail || ""}`
            : e?.output_tail || "Waiting for execution output…"}
        </pre>
      )}
      {!showOutput && e?.execution_id && (
        <NavLink
          to={`/logs?tab=executions&execution=${e.execution_id}`}
          className="button button-ghost console-log-link"
        >
          <TerminalSquare size={15} /> View full log
        </NavLink>
      )}
    </Card>
  )
}


export function SectionTabs({
  tabs,
  active,
  setActive,
}: Readonly<{
  tabs: Array<{ id: string; label: string }>
  active: string
  setActive: (id: string) => void
}>) {
  return (
    <div className="section-tabs" role="tablist" aria-label="Section navigation">
      {tabs.map((tab) => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            id={`section-tab-${tab.id}`}
            aria-controls={`section-panel-${tab.id}`}
            className={cn("section-tab", selected && "section-tab-active")}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
              event.preventDefault()
              const buttons = Array.from(
                event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
              )
              const index = buttons.indexOf(event.currentTarget)
              let nextIndex = (index - 1 + buttons.length) % buttons.length
              if (event.key === "Home") nextIndex = 0
              else if (event.key === "End") nextIndex = buttons.length - 1
              else if (event.key === "ArrowRight") nextIndex = (index + 1) % buttons.length
              const next = tabs[nextIndex]
              if (next) {
                setActive(next.id)
                buttons[nextIndex]?.focus()
              }
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}


export function useDomainTab(defaultTab: string) {
  const [params, setParams] = useSearchParams()
  const active = params.get("tab") || defaultTab
  const setActive = (tab: string) => {
    const next = new URLSearchParams(params)
    next.set("tab", tab)
    setParams(next, { replace: true })
  }
  return [active, setActive] as const
}


export function JsonPanel({
  endpoint,
  title,
  kicker = "AUTHORITATIVE STATE",
}: Readonly<{
  endpoint: GetPath
  title: string
  kicker?: string
}>) {
  const query = useQuery({
    queryKey: [endpoint],
    queryFn: () => getApi(endpoint),
  })
  return (
    <Card>
      <PanelHeader
        kicker={kicker}
        title={title}
        action={
          <button className="icon-button" onClick={() => query.refetch()} title="Refresh">
            <RefreshCw size={16} className={query.isFetching ? "spin" : ""} />
          </button>
        }
      />
      {query.error ? (
        <p className="panel-error">{query.error.message}</p>
      ) : (
        <pre className="terminal-output large">
          {query.isLoading ? "Loading…" : JSON.stringify(query.data, null, 2)}
        </pre>
      )}
    </Card>
  )
}


export function configurationInitialValue(first: Readonly<{
  choices: string[]
  value: unknown
  secret: boolean
}>): string {
  const current = textValue(first.value)
  const initialValue =
    first.choices.length > 0 && !first.choices.includes(current)
      ? first.choices[0]
      : current
  return first.secret ? "" : initialValue
}

export function DomainConfiguration({
  section,
}: Readonly<{
  section: "global" | "agentic" | "llm" | "deep_research" | "comfyui"
}>) {
  const query = useQuery({
    queryKey: ["configuration", section],
    queryFn: () => getConfiguration(section),
  })
  const [field, setField] = useState("")
  const [value, setValue] = useState("")
  const [preview, setPreview] = useState<ConfigurationPreview | null>(null)

  useEffect(() => {
    if (!field && query.data?.fields.length) {
      const first = query.data.fields[0]
      setField(first.name)
      setValue(configurationInitialValue(first))
    }
  }, [field, query.data])

  const selected = query.data?.fields.find((item) => item.name === field)
  const fieldGroups = useMemo(() => {
    const fields = query.data?.fields ?? []
    if (section !== "global") {
      return [{ category: "", fields }]
    }
    const order = [
      "Storage roots",
      "Models and caches",
      "Docker / system persistence",
      "Agent workspace",
      "Output, proof and temporary storage",
    ]
    return order
      .map((category) => ({
        category,
        fields: fields.filter((item) => item.category === category),
      }))
      .filter((group) => group.fields.length)
  }, [query.data, section])

  const choose = (name: string) => {
    const item = query.data!.fields.find((entry) => entry.name === name)!
    setField(name)
    const nextValue =
      item.choices.length && !item.choices.includes(textValue(item.value))
        ? item.choices[0]
        : textValue(item.value)
    setValue(item.secret ? "" : nextValue)
    setPreview(null)
  }

  const previewMutation = useMutation({
    mutationFn: () =>
      previewConfiguration(section, {
        field,
        value,
      }),
    onSuccess: setPreview,
  })
  const applyMutation = useMutation({
    mutationFn: () =>
      applyConfiguration(section, {
        field,
        value,
        confirm: true,
        expected_current: preview?.current,
      }),
    onSuccess: () => {
      setPreview(null)
      notifyOperator("Setting applied", "success")
      void query.refetch()
    },
    onError: (error) => notifyOperator(error.message, "error"),
  })

  let inputType: "text" | "password" | "number" = "text"
  if (selected?.secret) inputType = "password"
  else if (selected?.type === "int" || selected?.type === "float") inputType = "number"

  let fieldControl = (
    <input
      type={inputType}
      step={selected?.type === "float" ? "any" : undefined}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={selected?.secret ? "Enter replacement value" : ""}
      required
    />
  )
  if (selected?.choices?.length) {
    fieldControl = (
      <select value={value} onChange={(event) => setValue(event.target.value)}>
        {selected.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
      </select>
    )
  } else if (selected?.type === "bool") {
    fieldControl = (
      <fieldset className="boolean-radio-group">
        <legend>{selected.name.replaceAll("_", " ")}</legend>
        <label>
          <input type="radio" name={`${section}-${selected.name}`} value="true" checked={value === "true"} onChange={(event) => setValue(event.target.value)} />
          <span>On</span>
        </label>
        <label>
          <input type="radio" name={`${section}-${selected.name}`} value="false" checked={value === "false"} onChange={(event) => setValue(event.target.value)} />
          <span>Off</span>
        </label>
      </fieldset>
    )
  }

  let applyLabel = "Apply confirmed change"
  if (preview?.host_apply_required) applyLabel = "Requires host-side apply"
  else if (preview?.host_critical) applyLabel = "Apply high-impact change"

  return (
    <section className="two-column">
      <Card className="settings-index-card">
        <PanelHeader kicker="CURRENT SETTINGS" title={`${section.toUpperCase()} configuration`} />
        <CompactSummary
          className="settings-summary"
          items={[
            { label: "Fields", value: query.data ? query.data.fields.length : "Unavailable" },
            { label: "Groups", value: fieldGroups.length },
            {
              label: "Selected",
              value: selected?.name?.replaceAll("_", " ") || "—",
              detail: selected?.restart_required ? "restart required" : "live-safe when allowed",
              tone: selected?.host_critical ? "warn" : "neutral",
            },
          ]}
        />
        {fieldGroups.map((group, index) => {
          const content = (
            <div className="config-grid settings-compact-grid">
              {group.fields.map((item) => {
                let displayValue = String(item.value)
                if (item.secret) displayValue = item.value ? "configured" : "not configured"
                return (
                  <button
                    type="button"
                    className={cn("config-item config-button", item.name === field && "config-selected")}
                    key={item.name}
                    aria-pressed={item.name === field}
                    onClick={() => choose(item.name)}
                  >
                    <span>{item.name.replaceAll("_", " ")}</span>
                    <strong>{displayValue}</strong>
                    <small>{item.description}</small>
                    {section === "global" && (
                      <small>
                        {item.source === "environment" ? "override" : "default"}
                        {item.path_status?.exists ? " · exists" : " · target missing"}
                        {item.host_critical ? " · host-critical" : ""}
                      </small>
                    )}
                  </button>
                )
              })}
            </div>
          )
          return section === "global" ? (
            <CollapsibleSection
              key={group.category}
              className="settings-group-disclosure"
              title={group.category}
              summary={`${group.fields.length} settings`}
              defaultOpen={index === 0}
            >
              {content}
            </CollapsibleSection>
          ) : (
            <div key={section} className="settings-group">{content}</div>
          )
        })}
      </Card>
      <Card className="form-card beam-card">
        <PanelHeader kicker="SAFE CHANGE" title={selected?.name?.replaceAll("_", " ") || "Select setting"} />
        <form
          className="control-form"
          onSubmit={(event) => {
            event.preventDefault()
            previewMutation.mutate()
          }}
        >
{fieldControl}
          {selected?.restart_required && <p className="form-help">This setting requires runtime restart/apply verification.</p>}
          {previewMutation.error && <p className="error-text">{previewMutation.error.message}</p>}
          <Button className="button-primary" disabled={!selected || previewMutation.isPending}>Preview</Button>
        </form>
        <QueryStateNotice
          error={query.error}
          isFetching={query.isFetching}
          updatedAt={query.dataUpdatedAt}
          onRetry={() => void query.refetch()}
        />
        {preview && (
          <div className="preview-block settings-preview-v2">
            <div className="settings-change-summary">
              <div><span>Current</span><strong>{textValue(preview.current, "—")}</strong></div>
              <div className="settings-change-arrow" aria-hidden="true">→</div>
              <div><span>Proposed</span><strong>{textValue(preview.proposed, "—")}</strong></div>
            </div>
            <div className="config-grid">
              <div className="config-item"><span>Validation</span><strong>{preview.allowed ? "allowed" : "blocked"}</strong><small>{preview.reason || "No additional warning"}</small></div>
              <div className="config-item"><span>Restart</span><strong>{preview.restart_required ? "required" : "not required"}</strong></div>
              <div className="config-item"><span>Host apply</span><strong>{preview.host_apply_required ? "required" : "not required"}</strong></div>
              <div className="config-item"><span>Affected</span><strong>{preview.affected_components?.join(", ") || "configuration only"}</strong></div>
            </div>
            <CollapsibleSection title="Raw preview JSON" summary="Authoritative preview payload">
              <pre>{JSON.stringify(preview, null, 2)}</pre>
            </CollapsibleSection>
            <Button
              className={preview.host_critical ? "button-danger" : "button-primary"}
              onClick={() => applyMutation.mutate()}
              disabled={
                applyMutation.isPending ||
                preview.allowed === false ||
                preview.host_apply_required === true
              }
            >
{applyLabel}
            </Button>
            {preview.host_apply_required === true && (
              <p className="form-help">
                This host-critical change is validated but not persisted from
                the Web operator. Apply and certification remain postponed
                until the host is available.
              </p>
            )}
            {applyMutation.isSuccess && <output className="success-text">Setting applied and configuration refreshed.</output>}
            {applyMutation.error && <p className="error-text" role="alert">{applyMutation.error.message}</p>}
          </div>
        )}
      </Card>
    </section>
  )
}

