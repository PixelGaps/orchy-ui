import { Navigate,NavLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { Badge,Card,DenseKeyValueGrid,PageHeader,PanelHeader,QueryStateNotice,SectionPanel } from "@/components/ui/primitives"
import { getApi } from "@/lib/api"
import { hasActiveExecutions,runtimePollInterval } from "@/lib/polling"
import { DomainConfiguration,SectionTabs,useDomainTab,useExecutions } from "@/domains/shared"


export function ComfyUIPage() {
  const [tab, setTab] = useDomainTab("runtime")
  const executions = useExecutions()
  const active = hasActiveExecutions(executions.data)
  const query = useQuery({
    queryKey: ["comfyui-runtime"],
    queryFn: () => getApi("/api/comfyui"),
    refetchInterval: runtimePollInterval(active),
  })
  const healthQuery = useQuery({\n    queryKey: ["operator-overview"],\n    queryFn: () => getApi("/api/operator/overview"),\n    refetchInterval: runtimePollInterval(active),\n  })\n  const health = healthQuery.data?.health?.components?.comfyui\n  const healthStale = !healthQuery.dataUpdatedAt || Date.now() - healthQuery.dataUpdatedAt > 30_000\n  const runtimeHealthy = !healthQuery.isError && !healthStale && health?.status === "ok"\n  const tabs = [
    { id: "runtime", label: "Runtime" },
    { id: "settings", label: "Settings" },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Image runtime"
        title="ComfyUI"
        description="ComfyUI runtime controls and the existing Image Factory production loop."
        badge={<Badge tone={query.isError ? "danger" : "neutral"}>CONFIG {query.isError ? "UNAVAILABLE" : "FRESH"}</Badge>}
      />
      <QueryStateNotice
        error={query.error}
        isFetching={query.isFetching}
        updatedAt={query.dataUpdatedAt}
        onRetry={() => void query.refetch()}
      />
      {tab === "image-factory" && <Navigate to="/image-factory" replace />}
      <SectionTabs tabs={tabs} active={tab} setActive={setTab} />
      <SectionPanel tabId="runtime" active={tab === "runtime"}>
        <Card>
          <PanelHeader kicker="COMFYUI RUNTIME" title="Runtime configuration" />
          <DenseKeyValueGrid
            items={[
              { label: "API URL", value: query.data?.url || "—" },
              { label: "Health URL", value: query.data?.health_url || "—" },
              { label: "Output directory", value: query.data?.output_dir || "—" },
              { label: "Default workflow", value: query.data?.workflow_path || "—" },\n              { label: "Runtime health", value: runtimeHealthy ? "ready" : healthStale ? "stale" : health?.status || "Unavailable" },
            ]}
          />
          <div className="panel-link-row">
            <NavLink className="button button-primary" to="/image-factory">Open Image Factory</NavLink>
            <NavLink className="button button-ghost" to="/healthcheck?tab=comfyui">Run ComfyUI healthcheck</NavLink>
          </div>
        </Card>
      </SectionPanel>
      <SectionPanel tabId="settings" active={tab === "settings"}>
        <DomainConfiguration section="comfyui" />
        <div className="panel-link-row">
          <NavLink className="button button-ghost" to="/settings">
            Global ComfyUI persistence paths
          </NavLink>
        </div>
      </SectionPanel>
    </>
  )
}
