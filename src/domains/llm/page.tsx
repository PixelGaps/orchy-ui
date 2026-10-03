import {
Server
} from "lucide-react"
import {
NavLink
} from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import {
Badge,Card,
CollapsibleSection,
CompactSummary,
DenseKeyValueGrid,FreshnessBadge,PageHeader,
PanelHeader,
QueryStateNotice,
SectionPanel
} from "@/components/ui/primitives"
import { getApi } from "@/lib/api"
import { hasActiveExecutions,runtimePollInterval } from "@/lib/polling"
import { Tasks } from "@/domains/llm/agentic/page"
import {
DomainConfiguration,SectionTabs,useDomainTab,
useExecutions
} from "@/domains/shared"

export function LLMPage() {
  const [tab, setTab] = useDomainTab("runtime")
  const executions = useExecutions()
  const active = hasActiveExecutions(executions.data)
  const query = useQuery({
    queryKey: ["llm-runtime"],
    queryFn: () => getApi("/api/llm"),
    refetchInterval: runtimePollInterval(active),
  })
  const capabilitiesQuery = useQuery({
    queryKey: ["capability-registry"],
    queryFn: () => getApi("/api/capabilities"),
  })
  const tabs = [
    { id: "runtime", label: "Runtime" },
    { id: "agentic", label: "Agentic" },
    { id: "models", label: "Models" },
    { id: "capabilities", label: "Capabilities" },
    { id: "settings", label: "Settings" },
  ]
  const data = query.data
  return (
    <>
      <PageHeader
        eyebrow="Local inference"
        title="LLM"
        description="vLLM runtime, served models, context controls and inference configuration."
        badge={<FreshnessBadge updatedAt={query.dataUpdatedAt} error={query.isError} />}
      />
      <QueryStateNotice
        error={query.error}
        isFetching={query.isFetching}
        updatedAt={query.dataUpdatedAt}
        onRetry={() => void query.refetch()}
      />
      <SectionTabs tabs={tabs} active={tab} setActive={setTab} />
      <SectionPanel tabId="runtime" active={tab === "runtime"}>
        <Card className="runtime-console-card">
          <PanelHeader kicker="INFERENCE RUNTIME" title={String(data?.model || "Runtime status")} />
          <CompactSummary
            items={[
              { label: "Model", value: String(data?.model || "—"), tone: data?.model ? "live" : "neutral" },
              { label: "Containers", value: data ? (Array.isArray(data.containers) ? data.containers.length : "Unavailable") : "Unavailable" },
              { label: "Runtime", value: data ? (data.model ? "ready" : "idle") : "Unavailable", tone: data?.model ? "live" : "neutral" },
            ]}
          />
          <CollapsibleSection
            className="runtime-detail-disclosure"
            title="Runtime endpoints"
            summary="Base URL, health URL and adapter details"
          >
            <DenseKeyValueGrid
              items={[
                { label: "served model", value: String(data?.model || "—") },
                { label: "base url", value: String(data?.base_url || "—") },
                { label: "health url", value: String(data?.health_url || "—") },
                { label: "containers", value: data ? (Array.isArray(data.containers) ? data.containers.length : "Unavailable") : "Unavailable" },
              ]}
            />
          </CollapsibleSection>
          <div className="panel-link-row"><NavLink className="button button-ghost" to="/healthcheck?tab=llm">Run LLM healthchecks</NavLink></div>
        </Card>
      </SectionPanel>
      <SectionPanel tabId="agentic" active={tab === "agentic"}>
        <Tasks embedded />
      </SectionPanel>
      <SectionPanel tabId="models" active={tab === "models"}>
        <Card>
          <PanelHeader kicker="MODEL INVENTORY" title="Available models" />
          {Object.entries(data?.models ?? {}).map(([runtime, models]) => (
            <CollapsibleSection
              key={runtime}
              className="runtime-model-group"
              title={runtime}
              summary={`${models.length} models`}
              defaultOpen
            >
              <div className="data-list">
                {models.map((model) => (
                  <div className="data-row" key={`${runtime}-${model}`}>
                    <span className="row-icon"><Server size={15} /></span>
                    <div><strong>{model}</strong><small>{runtime}</small></div>
                    <Badge tone="cyan">{runtime}</Badge>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          ))}
        </Card>
      </SectionPanel>
      <SectionPanel tabId="capabilities" active={tab === "capabilities"}>
        <Card>
          <PanelHeader kicker="LOCAL AI PLATFORM" title="Capability registry" />
          <CompactSummary
            items={[
              { label: "Capabilities", value: capabilitiesQuery.data ? capabilitiesQuery.data.entries.length : "Unavailable" },
              {
                label: "Available",
                value: capabilitiesQuery.data ? capabilitiesQuery.data.entries.filter((entry) => entry.status === "available").length : "Unavailable",
                tone: "live",
              },
              {
                label: "Host required",
                value: capabilitiesQuery.data ? capabilitiesQuery.data.entries.filter((entry) => entry.status === "host-required").length : "Unavailable",
                tone: "cyan",
              },
            ]}
          />
          <div className="data-list runtime-capability-list">
            {(capabilitiesQuery.data?.entries ?? []).map((entry) => {
              let tone: "live" | "cyan" | "neutral" = "neutral"
              if (entry.status === "available") tone = "live"
              else if (entry.status === "host-required") tone = "cyan"
              return (
                <div className="data-row" key={entry.id}>
                  <span className="row-icon"><Server size={15} /></span>
                  <div>
                    <strong>{entry.label}</strong>
                    <small>{entry.platform} · {entry.reason || entry.capabilities.join(", ") || "contract available"}</small>
                  </div>
                  <Badge tone={tone}>{entry.status}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      </SectionPanel>
      <SectionPanel tabId="settings" active={tab === "settings"}>
        <DomainConfiguration section="llm" />
        <div className="panel-link-row">
          <NavLink className="button button-ghost" to="/settings">
            Global model/cache paths
          </NavLink>
        </div>
      </SectionPanel>
    </>
  )
}

