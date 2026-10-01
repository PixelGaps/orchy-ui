import {
ExternalLink,
Play,
RefreshCw,
Search,
Square,
} from "lucide-react"
import { SyntheticEvent,useState } from "react"
import { useMutation,useQuery } from "@tanstack/react-query"

import {
Badge,
Button,
Card,
CollapsibleSection,
CompactSummary,EmptyState,
FreshnessBadge,
PageHeader,
PanelHeader,
QueryStateNotice,
SectionPanel,
notifyOperator
} from "@/components/ui/primitives"
import { getApi,postApi } from "@/lib/api"
import type { DeepResearchResponse } from "@/lib/contracts"
import {
DomainConfiguration,
SectionTabs,
useDomainTab,
} from "@/domains/shared"


function ResearchAnswer({ value }: Readonly<{ value: string }>) {
  const lines = value.split("\n")
  const occurrences = new Map<string, number>()
  return (
    <div className="research-rich-answer">
      {lines.map((line) => {
        const trimmed = line.trim()
        const signature = trimmed || "blank"
        const occurrence = (occurrences.get(signature) ?? 0) + 1
        occurrences.set(signature, occurrence)
        const key = `${signature}-${occurrence}`
        if (!trimmed) return <div className="research-spacer" key={key} />
        if (trimmed.startsWith("### ")) return <h4 key={key}>{trimmed.slice(4)}</h4>
        if (trimmed.startsWith("## ")) return <h3 key={key}>{trimmed.slice(3)}</h3>
        if (trimmed.startsWith("# ")) return <h2 key={key}>{trimmed.slice(2)}</h2>
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return <div className="research-bullet" key={key}><span>•</span><p>{trimmed.slice(2)}</p></div>
        }
        const orderedListMatch = /^(\d+)\.\s/.exec(trimmed)
        if (orderedListMatch) {
          return <div className="research-bullet" key={key}><span>{orderedListMatch[1]}.</span><p>{trimmed.replace(/^\d+\.\s*/, "")}</p></div>
        }
        return <p key={key}>{line}</p>
      })}
    </div>
  )
}


export function runtimeSummary(
  ready: boolean,
  modelPresent: boolean,
): { value: string; tone: "live" | "warn" | "neutral" } {
  if (ready) return { value: "ready", tone: "live" }
  if (modelPresent) return { value: "installed", tone: "warn" }
  return { value: "offline", tone: "neutral" }
}

export function authorityTone(authority: string | undefined): "live" | "warn" | "neutral" {
  if (authority === "primary") return "live"
  if (authority === "secondary") return "warn"
  return "neutral"
}


export function DeepResearchPage() {
  const [tab, setTab] = useDomainTab("research")
  const [question, setQuestion] = useState("")
  const [maxQueries, setMaxQueries] = useState(3)
  const [maxSources, setMaxSources] = useState(6)
  const [result, setResult] = useState<DeepResearchResponse | null>(null)
  const runtime = useQuery({
    queryKey: ["deep-research-runtime"],
    queryFn: () => getApi("/api/deep-research/runtime"),
    refetchInterval: 5000,
  })

  const notifyMutationError = (error: Error) => notifyOperator(error.message, "error")

  const research = useMutation({
    mutationFn: () =>
      postApi("/api/deep-research/run", {
        question,
        max_queries: maxQueries,
        max_sources: maxSources,
      }),
    onSuccess: (response) => {
      setResult(response)
      notifyOperator(`Deep Research completed with ${response.evidence_count} sources`, "success")
    },
    onError: notifyMutationError,
  })

  const startRuntime = useMutation({
    mutationFn: () => postApi("/api/deep-research/runtime/start", {}),
    onSuccess: () => {
      notifyOperator("Deep Research runtime started", "success")
      void runtime.refetch()
    },
    onError: notifyMutationError,
  })

  const stopRuntime = useMutation({
    mutationFn: () => postApi("/api/deep-research/runtime/stop", {}),
    onSuccess: () => {
      notifyOperator("Deep Research runtime stopped", "success")
      void runtime.refetch()
    },
    onError: notifyMutationError,
  })

  const tabs = [
    { id: "research", label: "Research" },
    { id: "runtime", label: "Runtime" },
    { id: "settings", label: "Settings" },
  ]
  const runtimeData = runtime.data
  const ready = runtimeData?.ready === true
  const runtimeState = runtimeSummary(ready, runtimeData?.model_present === true)

  const submit = (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault()
    research.mutate()
  }
  return (
    <>
      <PageHeader
        eyebrow="LLM research"
        title="Deep Research"
        description="Bounded local-model web research with evidence lineage and cited synthesis."
        badge={<FreshnessBadge updatedAt={runtime.dataUpdatedAt} error={runtime.isError} staleAfterMs={15_000} />}
      />
      <QueryStateNotice
        error={runtime.error}
        isFetching={runtime.isFetching}
        updatedAt={runtime.dataUpdatedAt}
        onRetry={() => void runtime.refetch()}
      />
      <SectionTabs tabs={tabs} active={tab} setActive={setTab} />
      <CompactSummary
        className="deep-research-summary"
        items={[
          {
            label: "Runtime",
            value: runtimeState.value,
            tone: runtimeState.tone,
          },
          { label: "Model", value: runtimeData?.model || "—" },
          { label: "Queries", value: maxQueries, detail: "per research run" },
          { label: "Sources", value: maxSources, detail: "evidence cap" },
        ]}
      />

      <SectionPanel tabId="research" active={tab === "research"}>
        <section className="two-column">
          <Card className="form-card deep-research-form">
            <PanelHeader kicker="RESEARCH MISSION" title="Ask a bounded research question" />
            <form className="control-form" onSubmit={submit}>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Compare the strongest evidence for…"
                rows={8}
                minLength={3}
                maxLength={12000}
                required
              />
              <fieldset className="research-presets" aria-label="Research depth preset">
                {[
                  ["Quick", 1, 3],
                  ["Standard", 3, 6],
                  ["Thorough", 5, 10],
                ].map(([label, queries, sources]) => (
                  <button
                    type="button"
                    className={`button button-ghost button-compact ${maxQueries === queries && maxSources === sources ? "is-active" : ""}`}
                    key={String(label)}
                    onClick={() => {
                      setMaxQueries(Number(queries))
                      setMaxSources(Number(sources))
                    }}
                  >{label}</button>
                ))}
              </fieldset>
              <CollapsibleSection
                className="research-budget-disclosure"
                title="Advanced research budget"
                summary={`${maxQueries} queries · ${maxSources} evidence sources`}
              >
                <div className="form-grid">
                  <label>
                    <span>Search queries</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={maxQueries}
                      onChange={(event) => setMaxQueries(Number(event.target.value))}
                    />
                  </label>
                  <label>
                    <span>Evidence sources</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxSources}
                      onChange={(event) => setMaxSources(Number(event.target.value))}
                    />
                  </label>
                </div>
              </CollapsibleSection>
              {!ready && (
                <div className="inline-recovery">
                  <p className="form-help">Deep Research runtime is offline.</p>
                  <Button
                    type="button"
                    className="button-ghost"
                    onClick={() => startRuntime.mutate()}
                    disabled={startRuntime.isPending}
                  >
                    <Play size={14} /> {startRuntime.isPending ? "Starting…" : "Start runtime"}
                  </Button>
                </div>
              )}
              {research.error && (
                <p className="error-text">{research.error.message}</p>
              )}
              <Button
                className="button-primary"
                disabled={!ready || research.isPending || question.trim().length < 3}
              >
                <Search size={15} />
                {research.isPending ? "Researching…" : "Run Deep Research"}
              </Button>
            </form>
          </Card>

          <Card>
            <PanelHeader
              kicker="LATEST SYNTHESIS"
              title={result ? `${result.evidence_count} grounded sources` : "No mission yet"}
              action={
                result ? <Badge tone="cyan">{result.ranking_mode.replaceAll("_", " ")}</Badge> : null
              }
            />
            {result ? (
              <>
                <ResearchAnswer value={result.answer} />
                <CollapsibleSection title="Raw synthesis" summary="Plain-text model output">
                  <pre className="terminal-output research-answer">{result.answer}</pre>
                </CollapsibleSection>
                <CollapsibleSection
                  className="research-query-disclosure"
                  title="Search plan"
                  summary={`${result.queries.length} executed queries`}
                >
                  <div className="semantic-events">
                    {result.queries.map((query) => (
                      <code className="semantic-event semantic-log" key={query}>
                        <span>query</span>{query}
                      </code>
                    ))}
                  </div>
                </CollapsibleSection>
              </>
            ) : (
              <EmptyState
                title="Research output will appear here"
                body="The model plans searches, gathers bounded evidence, then synthesizes only from the collected source extracts."
              />
            )}
          </Card>
        </section>
        {result && (
        <CollapsibleSection
          className="research-evidence-disclosure"
          title="Evidence lineage"
          summary={`${result.sources.length} sources used by the synthesis`}
        >
          <div className="data-list">
            {result.sources.map((source) => (
              <a
                className="data-row"
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="row-icon"><ExternalLink size={15} /></span>
                <div>
                  <strong>{source.id} · {source.title}</strong>
                  <small>
                    {[source.domain, source.published_at, source.snippet, source.query].filter(Boolean).join(" · ")}
                  </small>
                </div>
                <Badge
                  tone={authorityTone(source.authority)}
                >
                  {(source.authority || "unknown").toUpperCase()}
                </Badge>
              </a>
            ))}
          </div>
        </CollapsibleSection>
        )}
      </SectionPanel>

      <SectionPanel tabId="runtime" active={tab === "runtime"}>
        <Card>
          <PanelHeader
            kicker="LOCAL REASONING RUNTIME"
            title={runtimeData?.model || "Deep Research model"}
            action={
              <button
                className="icon-button"
                onClick={() => runtime.refetch()}
                title="Refresh"
              >
                <RefreshCw size={16} className={runtime.isFetching ? "spin" : ""} />
              </button>
            }
          />
          <CompactSummary
            items={[
              { label: "Provider", value: runtimeData?.provider || "—" },
              { label: "Runtime", value: ready ? "ready" : runtimeData?.detail || "offline", tone: ready ? "live" : "neutral" },
              { label: "Capabilities", value: runtimeData?.capabilities?.length ?? 0 },
            ]}
          />
          <CollapsibleSection
            className="runtime-detail-disclosure"
            title="Runtime details"
            summary="Model path and capability contract"
          >
            <div className="config-grid">
              <div className="config-item">
                <span>model path</span>
                <strong>{runtimeData?.model_path || "—"}</strong>
              </div>
              <div className="config-item">
                <span>capabilities</span>
                <strong>{runtimeData?.capabilities?.join(", ") || "—"}</strong>
              </div>
            </div>
          </CollapsibleSection>
          {(startRuntime.error || stopRuntime.error) && (
            <p className="panel-error">
              {startRuntime.error?.message || stopRuntime.error?.message}
            </p>
          )}
          <div className="panel-link-row">
            {ready ? (
              <Button
                className="button-danger"
                onClick={() => stopRuntime.mutate()}
                disabled={stopRuntime.isPending}
              >
                <Square size={15} />
                {stopRuntime.isPending ? "Stopping…" : "Stop runtime"}
              </Button>
            ) : (
              <Button
                className="button-primary"
                onClick={() => startRuntime.mutate()}
                disabled={startRuntime.isPending}
              >
                <Play size={15} />
                {startRuntime.isPending ? "Starting…" : "Start runtime"}
              </Button>
            )}
          </div>
        </Card>
      </SectionPanel>

      <SectionPanel tabId="settings" active={tab === "settings"}>
        <DomainConfiguration section="deep_research" />
      </SectionPanel>
    </>
  )
}
