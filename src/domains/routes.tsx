import type { ComponentType } from "react"
import {
CircleGauge,
Cog,
Factory,
Home,
Server,
ShieldCheck,
TerminalSquare,
ListChecks,
} from "lucide-react"
import { Navigate,Route,Routes } from "react-router-dom"

const hosted = import.meta.env.PROD && !(import.meta.env.VITE_ORCHY_API_BASE_URL ?? "").trim()

const allDomainNav = [
  { to: "/", label: "Overview", icon: Home, group: "Command" },
  { to: "/assurance", label: "Test Assurance", icon: ShieldCheck, group: "Command" },
  { to: "/issues", label: "Issues", icon: ListChecks, group: "Command" },
  { to: "/missions", label: "Missions", icon: CircleGauge, group: "Command" },
  { to: "/queue", label: "Queue", icon: ListChecks, group: "Command" },
  { to: "/image-factory", label: "Image Factory", icon: Factory, group: "Workflows" },
  { to: "/llm", label: "LLM", icon: Server, group: "Runtimes" },\n  { to: "/workbench", label: "Workbench", icon: Code2, group: "Workflows" },
  { to: "/comfyui", label: "ComfyUI", icon: Factory, group: "Runtimes" },
  { to: "/healthcheck", label: "Healthcheck", icon: ShieldCheck, group: "Operations" },
  { to: "/logs", label: "Logs", icon: TerminalSquare, group: "Operations" },
  { to: "/settings", label: "Global Settings", icon: Cog, group: "Operations" },
]

const hostedRoutes = new Set(["/", "/assurance", "/issues", "/missions", "/logs"])
export const domainNav = hosted ? allDomainNav.filter((item) => hostedRoutes.has(item.to)).map((item) => item.to === "/logs" ? { ...item, label: "Runs" } : item) : allDomainNav

type DomainPages = {
  Overview: ComponentType
  Assurance: ComponentType
  Issues: ComponentType
  Missions: ComponentType
  Queue: ComponentType
  ImageFactory: ComponentType
  LLM: ComponentType
  ComfyUI: ComponentType
  Healthcheck: ComponentType
  Logs: ComponentType
  GlobalSettings: ComponentType
}

export function DomainRoutes({ pages }: Readonly<{ pages: DomainPages }>) {
  return (
    <Routes>
      <Route path="/" element={<pages.Overview />} />
      <Route path="/assurance" element={<pages.Assurance />} />
      <Route path="/issues" element={<pages.Issues />} />
      <Route path="/missions" element={<pages.Missions />} />
      <Route path="/queue" element={hosted ? <Navigate to="/missions" replace /> : <pages.Queue />} />
      <Route path="/image-factory" element={hosted ? <Navigate to="/missions" replace /> : <pages.ImageFactory />} />
      <Route path="/llm" element={hosted ? <Navigate to="/missions" replace /> : <pages.LLM />} />\n      <Route path="/workbench" element={hosted ? <Navigate to="/missions" replace /> : <pages.Workbench />} />
      <Route path="/comfyui" element={hosted ? <Navigate to="/missions" replace /> : <pages.ComfyUI />} />
      <Route path="/healthcheck" element={hosted ? <Navigate to="/" replace /> : <pages.Healthcheck />} />
      <Route path="/logs" element={<pages.Logs />} />
      <Route path="/settings" element={hosted ? <Navigate to="/missions" replace /> : <pages.GlobalSettings />} />
      <Route path="/tasks" element={<Navigate to="/" replace />} />
      <Route path="/validation" element={<Navigate to="/" replace />} />
      <Route path="/comfyui/image-factory" element={<Navigate to="/image-factory" replace />} />
      <Route path="/runtime" element={<Navigate to="/llm?tab=runtime" replace />} />
      <Route path="/configuration" element={<Navigate to="/llm?tab=settings" replace />} />
      <Route path="/runs" element={<Navigate to="/logs?tab=ci" replace />} />
      <Route path="/evidence" element={<Navigate to="/logs?tab=evidence" replace />} />
    </Routes>
  )
}
