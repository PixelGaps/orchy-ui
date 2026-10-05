import {
Badge,CollapsibleSection,PageHeader
} from "@/components/ui/primitives"
import {
DomainConfiguration
} from "@/domains/shared"

const OPERATOR_SURFACES = [
  ["Overview", "/", "Jira/GitHub/TestOps/host projections", "Fresh/stale/unavailable semantics are explicit."],
  ["Test Assurance", "/assurance", "TestOps evidence", "Evidence projection only; TestOps remains authority."],
  ["Issues", "/issues", "Jira OR", "Implementation actions are mediated; Jira remains work-state authority."],
  ["Missions", "/missions", "ExecutionStore + CI fleet + host", "Host-bound actions fail closed while Madriguera is offline."],
  ["Queue", "/queue", "Gateway queue projection", "Supabase/provider outages remain explicit and non-authoritative."],
  ["Image Factory", "/image-factory", "Orchy Image Factory", "Generation requires the admitted host/GPU capability path."],
  ["LLM", "/llm", "Orchy runtime APIs", "Runtime detail is unavailable when the local execution host is offline."],
  ["ComfyUI", "/comfyui", "Orchy ComfyUI adapter", "GPU/runtime availability is host-bound and never synthesized."],
  ["Healthcheck", "/healthcheck", "Orchy healthcheck registry", "Checks may require host capability; results remain typed."],
  ["Logs", "/logs", "Retained execution/evidence", "Logs are evidence projections, not lifecycle authority."],
  ["Global Settings", "/settings", "Allowlisted configuration API", "Preview/apply is mediated and browser state holds no secrets."],
  ["Quotas", "/missions", "CI fleet + runtime quota adapters", "Only authoritative active snapshots render; unknown quotas fail closed."],
] as const

const PLATFORM_LIMITS = [
  ["Hosted providers", "Vercel and Netlify remain quarantined until a new explicit user order."],
  ["Background refresh", "Resident polling is forbidden. Operator refresh and event-driven streams are the allowed update paths."],
  ["Host dependence", "GPU, local model, ComfyUI and machine-control actions require the private Madriguera capability path."],
  ["Canonical state", "The browser never owns Jira work state, ExecutionStore lifecycle, TestOps evidence or privileged secrets."],
] as const

export function GlobalSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Machine configuration"
        title="Global Settings"
        description="Machine-wide storage, cache, Docker, workspace and durable output paths with allowlisted impact preview."
        badge={<Badge tone="warn">HOST PATHS</Badge>}
      />

      <CollapsibleSection
        className="operator-boundaries"
        title="Operator boundaries"
        summary={`${OPERATOR_SURFACES.length} registered surfaces · authority and platform constraints`}
      >
        <p className="operator-registry-note">
          <strong>Declared surface registry.</strong> Registered means the route is part of the operator contract; it does not assert live readiness. Live readiness is shown only by each surface&apos;s current source badges and status notices.
        </p>
        <div className="operator-parity-grid" aria-label="Registered operator surfaces">
          {OPERATOR_SURFACES.map(([label, route, authority, limitation]) => (
            <article className="operator-parity-item" key={label}>
              <div>
                <strong>{label}</strong>
                <code>{route}</code>
              </div>
              <Badge>declared</Badge>
              <span>{authority}</span>
              <small>{limitation}</small>
            </article>
          ))}
        </div>
        <div className="operator-limit-register">
          <dl>
            {PLATFORM_LIMITS.map(([term, detail]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </CollapsibleSection>

      <DomainConfiguration section="global" />
    </>
  )
}
