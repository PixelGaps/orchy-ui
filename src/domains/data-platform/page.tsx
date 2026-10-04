import { BarChart3, Database, GitBranch, Layers3, Network, ShieldCheck } from "lucide-react"

import { Badge, Card, CompactSummary, PageHeader, PanelHeader, StatusNotice } from "@/components/ui/primitives"

const REPOSITORY = "PixelGaps/data-warehouse"
const HEAD = "594ac3149ae800ccbfd8ec51e94ef2f84d2b4e11"

const layers = [
  { name: "Raw", purpose: "Immutable producer-native bytes + provenance sidecars", authority: "Retained source evidence" },
  { name: "Canonical", purpose: "Validated typed Parquet with explicit parent lineage", authority: "Canonical analytical truth" },
  { name: "Derived", purpose: "Rebuildable queries, indexes and quality projections", authority: "Projection only" },
]

const qaDimensions = [
  ["Contracts & schema", "JSON Schema + typed asset contracts", "Schema evolution and invalid payloads fail closed."],
  ["Completeness", "Required fields + nullability", "Blocking missing/null values prevent canonical publication."],
  ["Uniqueness", "Duplicate-key detection", "Duplicate accounting is explicit and reconciled."],
  ["Range & domain", "Numeric bounds + accepted values", "Out-of-domain records become quality evidence, never silent coercion."],
  ["Freshness", "Reference-time checks", "Stale and future timestamps are deterministic failures."],
  ["Referential integrity", "Parent/key existence", "Missing references and orphan lineage fail closed."],
  ["Lineage", "Raw → Canonical → Derived", "Every canonical/derived asset retains explicit parent identity and source SHA."],
  ["Reconciliation", "Rows + rejects + duplicates + digest", "Received = accepted + rejected; materialization tamper is detected."],
  ["Transformation correctness", "Independent DuckDB oracle", "Generated Parquet is checked independently of producer implementation."],
  ["Generative invariants", "Hypothesis / metamorphic", "Variable valid datasets exercise conservation and deterministic identity."],
  ["Idempotency & resilience", "Retry + content addressing", "Repeated capture is stable and tampered bytes fail verification."],
  ["Evidence immutability", "Append / supersede", "Failed and passing history is retained; evidence is never overwritten."],
  ["Drift governance", "Measured baseline only", "Missing baseline is UNAVAILABLE; thresholds are never invented."],
  ["Availability semantics", "UNKNOWN / UNAVAILABLE", "Missing oracle/source state can never be reported as PASS."],
]

const analyses = [
  ["Quality history", "DQ outcomes and dimension-level failures over retained evidence.", "Available after canonical runtime projection"],
  ["Reconciliation analysis", "Loss, reject, duplicate, schema and digest deltas by producer/dataset.", "Available after canonical runtime projection"],
  ["Evidence history", "Append/supersede chronology with immutable evidence identity.", "Implemented; live projection pending"],
  ["Lineage analysis", "Producer → raw → canonical → derived ancestry and orphan detection.", "Implemented; live projection pending"],
  ["Producer coverage", "7/7 repositories classified; four current durable producers have forward-ingestion contracts.", "Forward-only audit complete"],
  ["Drift analysis", "Volume/distribution comparison only against measured retained baselines.", "UNAVAILABLE until measured baseline exists"],
]

export function DataPlatformPage() {
  return (
    <>
      <PageHeader eyebrow="Shared data plane" title="Data Platform"
        description="Top-level Data Warehouse, Data QA and analytical observability. Capability contracts are shown now; live dataset metrics remain unavailable until a canonical server-side projection is wired."
        badge={<Badge tone="live">QA qualified</Badge>} />

      <CompactSummary items={[
        { label: "Repository", value: REPOSITORY, detail: "Independent canonical target", tone: "cyan" },
        { label: "Main", value: HEAD.slice(0, 12), detail: "Forward-ingestion audit integrated", tone: "live" },
        { label: "QA dimensions", value: qaDimensions.length, detail: "Layer 13 advanced assurance", tone: "live" },
        { label: "Producer audit", value: "7 / 7", detail: "All current PixelGaps repos classified", tone: "live" },
        { label: "Cutover", value: "OR-891", detail: "Consumer migration still pending", tone: "warn" },
      ]} />

      <StatusNotice title="Capability is verified; live telemetry is not fabricated"
        body="Data QA, reconciliation, Evidence Lake and analytical projections are implemented and qualified. Until OR-891 exposes the canonical runtime projection, this page deliberately shows contracts and availability rather than invented asset counts, trends or health scores."
        tone="info" />

      <section className="data-platform-grid">
        <Card><PanelHeader kicker="Storage contract" title="Data layers" action={<Layers3 size={17} aria-hidden="true" />} />
          <div className="data-platform-stack">{layers.map((layer) => <article key={layer.name} className="data-platform-row"><div><strong>{layer.name}</strong><small>{layer.authority}</small></div><p>{layer.purpose}</p></article>)}</div>
        </Card>
        <Card><PanelHeader kicker="Implementation" title="Repository health" action={<GitBranch size={17} aria-hidden="true" />} />
          <dl className="cloud-kv"><div><dt>Repository</dt><dd>{REPOSITORY}</dd></div><div><dt>Branch</dt><dd>main</dd></div><div><dt>Verified SHA</dt><dd>{HEAD.slice(0,12)}</dd></div><div><dt>Normal CI</dt><dd><Badge tone="live">PASS</Badge></dd></div><div><dt>TestOps Layer 13</dt><dd><Badge tone="live">PASS</Badge></dd></div><div><dt>Ingestion policy</dt><dd>Forward only · no historical backfill</dd></div></dl>
        </Card>
      </section>

      <Card><PanelHeader kicker="Layer 13" title="Data QA dimensions" action={<ShieldCheck size={17} aria-hidden="true" />} />
        <div className="data-platform-capabilities">{qaDimensions.map(([name, contract, detail]) => <article key={name} className="data-platform-capability"><div><strong>{name}</strong><Badge tone="cyan">{contract}</Badge></div><p>{detail}</p></article>)}</div>
      </Card>

      <Card><PanelHeader kicker="Analytical plane" title="Analysis & diagnostics" action={<BarChart3 size={17} aria-hidden="true" />} />
        <div className="data-platform-capabilities">{analyses.map(([name, detail, state]) => <article key={name} className="data-platform-capability"><div><strong>{name}</strong><Badge tone={state.includes("complete") || state.startsWith("Implemented") ? "live" : state.startsWith("UNAVAILABLE") ? "warn" : "neutral"}>{state}</Badge></div><p>{detail}</p></article>)}</div>
      </Card>

      <section className="data-platform-grid">
        <Card><PanelHeader kicker="Lineage" title="Provenance chain" action={<Network size={17} aria-hidden="true" />} />
          <div className="data-platform-lineage" aria-label="Data lineage flow"><span>Producer capture</span><b aria-hidden="true">→</b><span>Raw</span><b aria-hidden="true">→</b><span>DQ gate</span><b aria-hidden="true">→</b><span>Canonical</span><b aria-hidden="true">→</b><span>Derived</span></div>
          <p className="cloud-panel-note">Canonical/derived assets carry parent IDs, source SHA, content digest and provenance digest.</p>
        </Card>
        <Card><PanelHeader kicker="Authority" title="Ownership & remaining gates" action={<Database size={17} aria-hidden="true" />} />
          <dl className="cloud-kv"><div><dt>Data platform</dt><dd>PixelGaps/data-warehouse</dd></div><div><dt>Advanced QA</dt><dd>TestOps · Layer 13</dd></div><div><dt>Operator projection</dt><dd>PixelGaps/orchy-ui</dd></div><div><dt>Consumer cutover</dt><dd>OR-891</dd></div><div><dt>Scale gate</dt><dd>OR-892 · evidence-triggered only</dd></div></dl>
        </Card>
      </section>
    </>
  )
}
