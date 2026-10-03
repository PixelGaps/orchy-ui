import { Database, GitBranch, Layers3, Network, ShieldCheck } from "lucide-react"

import { Badge, Card, CompactSummary, PageHeader, PanelHeader, StatusNotice } from "@/components/ui/primitives"

const REPOSITORY = "PixelGaps/data-warehouse"
const HEAD = "30290ef4dd55a4413cde5ae5f5c02f37b646f0c8"

const layers = [
  { name: "Raw", purpose: "Immutable producer-native bytes + provenance sidecars", authority: "Retained source evidence" },
  { name: "Canonical", purpose: "Validated typed Parquet with explicit parent lineage", authority: "Canonical analytical truth" },
  { name: "Derived", purpose: "Rebuildable queries, indexes and quality projections", authority: "Projection only" },
]

const capabilities = [
  ["Data Quality", "PASS / WARN / FAIL / UNKNOWN / UNAVAILABLE", "Required FAIL/UNKNOWN/UNAVAILABLE blocks canonical publication."],
  ["Reconciliation", "Counts + lineage + schema + digest", "Unexplained loss, duplication, parent mismatch or materialization tamper fails closed."],
  ["Evidence Lake", "Immutable + content-addressed", "Corrections append and supersede; retained evidence is never overwritten."],
  ["Analytics", "Parquet + bounded DuckDB", "Process-local :memory: engine only; no resident analytical database."],
]

export function DataPlatformPage() {
  return (
    <>
      <PageHeader
        eyebrow="Shared data plane"
        title="Data Platform"
        description="Read-only operator view of the independent PixelGaps data-warehouse. This surface describes platform authority and verified implementation; runtime dataset telemetry stays unavailable until OR-891 consumer cutover exposes a canonical projection."
        badge={<Badge tone="live">CI verified</Badge>}
      />

      <CompactSummary
        items={[
          { label: "Repository", value: REPOSITORY, detail: "Independent canonical target", tone: "cyan" },
          { label: "Main", value: HEAD.slice(0, 12), detail: "Verified integration SHA", tone: "live" },
          { label: "Layers", value: "3", detail: "Raw · Canonical · Derived" },
          { label: "Query engine", value: "DuckDB", detail: "Bounded process-local :memory:" },
          { label: "Cutover", value: "OR-891", detail: "Consumer migration remains deferred", tone: "warn" },
        ]}
      />

      <StatusNotice
        title="Runtime dataset telemetry is intentionally not synthesized"
        body="OR-1027 adds observability views without creating a second data authority. Live asset counts, DQ history, reconciliation events and evidence records will appear only from a canonical server-side projection after OR-891 wiring."
        tone="info"
      />

      <section className="data-platform-grid">
        <Card>
          <PanelHeader kicker="Storage contract" title="Data layers" action={<Layers3 size={17} aria-hidden="true" />} />
          <div className="data-platform-stack">
            {layers.map((layer) => (
              <article key={layer.name} className="data-platform-row">
                <div><strong>{layer.name}</strong><small>{layer.authority}</small></div>
                <p>{layer.purpose}</p>
              </article>
            ))}
          </div>
        </Card>

        <Card>
          <PanelHeader kicker="Implementation" title="Repository health" action={<GitBranch size={17} aria-hidden="true" />} />
          <dl className="cloud-kv">
            <div><dt>Repository</dt><dd>{REPOSITORY}</dd></div>
            <div><dt>Branch</dt><dd>main</dd></div>
            <div><dt>Verified SHA</dt><dd>{HEAD.slice(0, 12)}</dd></div>
            <div><dt>CI</dt><dd><Badge tone="live">PASS</Badge></dd></div>
            <div><dt>Architecture fitness</dt><dd><Badge tone="live">PASS</Badge></dd></div>
            <div><dt>Wire contract</dt><dd>orchy.data-asset-ref.v1</dd></div>
          </dl>
        </Card>
      </section>

      <Card>
        <PanelHeader kicker="Quality plane" title="Quality, reconciliation and evidence" action={<ShieldCheck size={17} aria-hidden="true" />} />
        <div className="data-platform-capabilities">
          {capabilities.map(([name, contract, detail]) => (
            <article key={name} className="data-platform-capability">
              <div><strong>{name}</strong><Badge tone="cyan">{contract}</Badge></div>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </Card>

      <section className="data-platform-grid">
        <Card>
          <PanelHeader kicker="Lineage" title="Provenance chain" action={<Network size={17} aria-hidden="true" />} />
          <div className="data-platform-lineage" aria-label="Data lineage flow">
            <span>Producer capture</span><b aria-hidden="true">→</b><span>Raw</span><b aria-hidden="true">→</b><span>DQ gate</span><b aria-hidden="true">→</b><span>Canonical</span><b aria-hidden="true">→</b><span>Derived</span>
          </div>
          <p className="cloud-panel-note">Every canonical/derived asset carries explicit parent asset IDs, source SHA, content digest and provenance digest.</p>
        </Card>
        <Card>
          <PanelHeader kicker="Authority" title="Ownership boundary" action={<Database size={17} aria-hidden="true" />} />
          <dl className="cloud-kv">
            <div><dt>Data platform</dt><dd>PixelGaps/data-warehouse</dd></div>
            <div><dt>Operator projection</dt><dd>PixelGaps/orchy-ui</dd></div>
            <div><dt>Consumer cutover</dt><dd>OR-891</dd></div>
            <div><dt>Work state</dt><dd>Jira OR</dd></div>
          </dl>
        </Card>
      </section>
    </>
  )
}
