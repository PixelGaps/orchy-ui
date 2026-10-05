import {
Archive,CheckCircle2,Factory,
FileText,ImageIcon,ShieldCheck
} from "lucide-react"
import {
SyntheticEvent,useState
} from "react"
import { useMutation,useQuery } from "@tanstack/react-query"

import {
Badge,
Button,
Card,
CollapsibleSection,
CompactSummary,
CopyButton,
EmptyState,
FreshnessBadge,
QueryStateNotice,notifyOperator,
PageHeader,
PanelHeader
} from "@/components/ui/primitives"
import { getApi,postApi } from "@/lib/api"
import type {
Candidate,GalleryArtifact,
GalleryGroups,
GalleryPack,
GalleryPayload,ImageFactoryProfile,
IsolatedObjectResult,PBRResult
} from "@/lib/contracts"
import { cn } from "@/lib/utils"
import {
ExecutionPanel,statusTone,useExecutions
} from "@/domains/shared"

export function parseObjectSpec(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value || "{}")
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Profile spec must be a JSON object.")
  }
  return parsed as Record<string, unknown>
}


function NumberField({
  label,
  value,
  setValue,
  min = 1,
  max,
  step,
}: Readonly<{
  label: string
  value: string
  setValue: (value: string) => void
  min?: number
  max?: number
  step?: string
}>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        min={min}
        max={max}
        step={step}
      />
    </label>
  )
}


function CandidateCard({ candidate }: Readonly<{ candidate: Candidate }>) {
  const score =
    candidate.score == null
      ? "—"
      : `${(candidate.score * 100).toFixed(1)}`
  let scoreDelta = "—"
  if (candidate.score_delta != null) {
    const prefix = candidate.score_delta >= 0 ? "+" : ""
    scoreDelta = `${prefix}${(candidate.score_delta * 100).toFixed(1)}`
  }
  return (
    <article className="candidate-card">
      <div className="candidate-head">
        <div>
          <span className="kicker">ATTEMPT {candidate.attempt ?? "—"}</span>
          <strong>{candidate.id?.slice(0, 8) || "candidate"}</strong>
        </div>
        <Badge tone={statusTone(candidate.decision)}>
          {candidate.decision || "unknown"}
        </Badge>
      </div>
      <div className="score-row">
        <div>
          <small>Score</small>
          <strong>{score}</strong>
        </div>
        <div>
          <small>Δ parent</small>
          <strong className={(candidate.score_delta ?? 0) >= 0 ? "positive" : "negative"}>
            {scoreDelta}
          </strong>
        </div>
      </div>
      {candidate.failure_codes?.length ? (
        <div className="chip-list">
          {candidate.failure_codes.slice(0, 4).map((failure) => (
            <span className="failure-chip" key={failure}>{failure}</span>
          ))}
        </div>
      ) : (
        <div className="chip-list">
          <span className="success-chip"><CheckCircle2 size={13} /> clean gate</span>
        </div>
      )}
      <small className="candidate-path">{candidate.path || "artifact pending"}</small>
    </article>
  )
}


function GalleryArtifactCard({
  artifact,
  tone,
  onSelect,
}: Readonly<{
  artifact: GalleryArtifact
  tone: "passed" | "failed"
  onSelect?: (artifact: GalleryArtifact) => void
}>) {
  const score =
    artifact.score == null ? "—" : (artifact.score * 100).toFixed(1)
  return (
    <button
      type="button"
      className={cn("gallery-artifact-card", `gallery-artifact-${tone}`)}
      onClick={() => onSelect?.(artifact)}
      data-artifact-id={artifact.id}
      data-profile={artifact.profile}
      data-subcategory={artifact.subcategory}
      data-tone={tone}
    >
      <div className="gallery-image-frame">
        <img
          data-testid={`gallery-preview-${tone}-${artifact.id}`}
          src={artifact.media_url}
          alt={`${artifact.profile} ${artifact.subcategory} attempt ${artifact.attempt}`}
          loading="lazy"
        />
        {artifact.selected && <span className="gallery-selected">SELECTED</span>}
      </div>
      <div className="gallery-artifact-meta">
        <div>
          <span className="kicker">{artifact.profile}</span>
          <strong>{artifact.subcategory.replaceAll("_", " ")}</strong>
        </div>
        <Badge tone={tone === "passed" ? "live" : "danger"}>
          {artifact.status}
        </Badge>
      </div>
      <div className="gallery-stat-row">
        <span>attempt {artifact.attempt || "—"}</span>
        <span>score {score}</span>
      </div>
      {artifact.failure_codes?.length ? (
        <div className="chip-list">
          {artifact.failure_codes.slice(0, 4).map((failure) => (
            <span className="failure-chip" key={failure}>{failure}</span>
          ))}
        </div>
      ) : (
        <div className="chip-list">
          <span className="success-chip">
            <CheckCircle2 size={13} /> clean gate
          </span>
        </div>
      )}
      <small className="candidate-path">
        {artifact.job_id} · {artifact.run_id || artifact.id.slice(0, 8)}
      </small>
    </button>
  )
}


function GalleryStatusSection({
  title,
  subtitle,
  tone,
  groups,
  onSelect,
}: Readonly<{
  title: string
  subtitle: string
  tone: "passed" | "failed"
  groups: GalleryGroups
  onSelect?: (artifact: GalleryArtifact) => void
}>) {
  const profileEntries = Object.entries(groups)
  const artifactCount = profileEntries.reduce(
    (total, [, subgroups]) =>
      total +
      Object.values(subgroups).reduce(
        (subtotal, artifacts) => subtotal + artifacts.length,
        0,
      ),
    0,
  )

  return (
    <Card className={cn("gallery-section", `gallery-section-${tone}`)}>
      <PanelHeader
        kicker={tone === "passed" ? "GREEN / PASSED" : "RED / FAILED"}
        title={title}
        action={
          <Badge tone={tone === "passed" ? "live" : "danger"}>
            {artifactCount} artifacts
          </Badge>
        }
      />
      <p className="gallery-section-copy">{subtitle}</p>
      {artifactCount ? (
        <div className="gallery-profile-stack">
          {profileEntries.map(([profile, subgroups]) => (
            <section className="gallery-profile-group" key={profile}>
              <h3>{profile.replaceAll("_", " ")}</h3>
              {Object.entries(subgroups).map(([subcategory, artifacts]) => (
                <div className="gallery-subgroup" key={subcategory}>
                  <div className="gallery-subgroup-head">
                    <strong>{subcategory.replaceAll("_", " ")}</strong>
                    <span>{artifacts.length}</span>
                  </div>
                  <div className="gallery-artifact-grid">
                    {artifacts.map((artifact) => (
                      <GalleryArtifactCard
                        artifact={artifact}
                        tone={tone}
                        onSelect={onSelect}
                        key={artifact.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title={tone === "passed" ? "No passed artifacts yet" : "No failed artifacts"}
          body={
            tone === "passed"
              ? "Artifacts that clear QA will collect here by profile and layer."
              : "Rejected attempts remain visible here even after repair succeeds."
          }
        />
      )}
    </Card>
  )
}


function GallerySummary({ summary }: Readonly<{ summary: GalleryPayload["summary"] }>) {
  const counters = [
    ["Latest window: packs ready", summary.publish_ready_packs, "gallery-count-packs"],
    ["Latest window: passed artifacts", summary.passed_artifacts, "gallery-count-passed"],
    ["Latest window: failed artifacts", summary.failed_artifacts, "gallery-count-failed"],
    ["Latest window: layers passed", summary.passed_layers, "gallery-count-layers-passed"],
    ["Latest window: layers failed", summary.failed_layers, "gallery-count-layers-failed"],
  ] as const

  return (
    <Card className="gallery-section gallery-summary">
      <PanelHeader
        kicker="E2E EVIDENCE"
        title="Production gallery counters"
      />
      <p className="gallery-section-copy">
        Bounded latest-gallery window returned by the API (currently up to 200 artifacts); these are not lifetime totals.
      </p>
      <div className="config-grid">
        {counters.map(([label, value, testId]) => (
          <div className="config-item" key={testId}>
            <span>{label}</span>
            <strong data-testid={testId}>{value}</strong>
          </div>
        ))}
      </div>
    </Card>
  )
}


function PublishReadyGallery({ packs }: Readonly<{ packs: GalleryPack[] }>) {
  return (
    <Card className="gallery-section gallery-section-ready">
      <PanelHeader
        kicker="GOLD / PUBLISH READY"
        title="Finished packs"
        action={<Badge tone="warn">{packs.length} packs</Badge>}
      />
      <p className="gallery-section-copy">
        Complete collections that passed their final pack or family QA and are ready for publication.
      </p>
      {packs.length ? (
        <div className="gallery-pack-stack">
          {packs.map((pack) => (
            <article className="gallery-pack-card" key={pack.id}>
              <div className="gallery-pack-head">
                <div>
                  <span className="kicker">{pack.profile}</span>
                  <h3>{pack.id}</h3>
                </div>
                <div className="chip-list">
                  <span className="gallery-ready-chip">
                    <ShieldCheck size={13} /> PUBLISH READY
                  </span>
                  <span className="gallery-pack-count">
                    {pack.member_count} members
                  </span>
                </div>
              </div>
              <div className="gallery-pack-members">
                {pack.members.map((artifact) => (
                  <div
                    className="gallery-pack-member"
                    data-artifact-id={artifact.id}
                    data-subcategory={artifact.subcategory}
                    key={artifact.id}
                  >
                    <img
                      data-testid={`gallery-pack-preview-${artifact.id}`}
                      src={artifact.media_url}
                      alt={`${pack.id} ${artifact.subcategory}`}
                      loading="lazy"
                    />
                    <span>{artifact.subcategory.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
              <div className="gallery-pack-foot">
                <span>{pack.manifest ? "manifest ready" : "no manifest"}</span>
                <span>{pack.archive ? "archive ready" : "collection ready"}</span>
                <span>QA {pack.qa_status}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No publish-ready packs yet"
          body="A complete pack appears here only after its final family or pack QA passes."
        />
      )}
    </Card>
  )
}


export function ImageFactory({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const [showExperimentalProfiles, setShowExperimentalProfiles] = useState(false)
  const [gallerySearch, setGallerySearch] = useState("")
  const [selectedArtifactId, setSelectedArtifactId] = useState("")
  const [form, setForm] = useState({
    profile: "pbr" as ImageFactoryProfile,
    prompt: "",
    workflow_path: "",
    batch_size: "2",
    required_passes: "2",
    candidate_budget: "4",
    qa_threshold: "0.95",
    max_attempts: "4",
    pbr_spec: `{
  "id": "pbr-material",
  "required_maps": ["albedo", "normal", "roughness", "metallic", "height", "ao"]
}`,
    object_spec: `{
  "id": "galvanized-fasteners",
  "items": [
    {"id": "hex-bolt", "label": "galvanized hex bolt"},
    {"id": "flange-nut", "label": "galvanized flange nut"}
  ]
}`,
    pattern_spec: `{
  "id": "ornamental-stone-patterns",
  "patterns": [
    {"id": "ornamental-a", "label": "ornamental stone repeat"},
    {"id": "ornamental-b", "label": "alternate ornamental stone repeat"}
  ]
}`,
    product_spec: `{
  "id": "game-assets",
  "items": [
    {"id": "asset-a", "label": "primary asset"},
    {"id": "asset-b", "label": "alternate asset"}
  ],
  "atlas": {"columns": 2}
}`,
  })

  const executions = useExecutions()
  const imageExecution = (executions.data ?? []).find(
    (item) =>
      item.kind === "image_factory" &&
      (item.state === "running" || item.state === "cancelling"),
  )
  const lineage = useQuery({
    queryKey: ["lineage"],
    queryFn: () => getApi("/api/image-factory/lineage"),
    refetchInterval: imageExecution ? 1500 : false,
  })
  const gallery = useQuery({
    queryKey: ["image-factory-gallery"],
    queryFn: () => getApi("/api/image-factory/gallery"),
    refetchInterval: imageExecution ? 1500 : 10000,
  })

  const filterGroups = (groups: GalleryGroups): GalleryGroups => {
    const query = gallerySearch.trim().toLowerCase()
    if (!query) return groups
    return Object.fromEntries(
      Object.entries(groups)
        .map(([profile, subgroups]) => [
          profile,
          Object.fromEntries(
            Object.entries(subgroups)
              .map(([subcategory, artifacts]) => [
                subcategory,
                artifacts.filter((artifact) =>
                  [
                    artifact.id,
                    artifact.job_id,
                    artifact.profile,
                    artifact.subcategory,
                    artifact.status,
                    ...(artifact.failure_codes ?? []),
                  ]
                    .join(" ")
                    .toLowerCase()
                    .includes(query),
                ),
              ])
              .filter(([, artifacts]) => (artifacts as GalleryArtifact[]).length),
          ),
        ])
        .filter(([, subgroups]) => Object.keys(subgroups as Record<string, unknown>).length),
    ) as GalleryGroups
  }
  const allGalleryArtifacts = [
    ...Object.values(gallery.data?.passed ?? {}).flatMap((group) => Object.values(group).flat()),
    ...Object.values(gallery.data?.failed ?? {}).flatMap((group) => Object.values(group).flat()),
  ]
  const selectedArtifact =
    allGalleryArtifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null

  const genericWorkflowMissing =
    form.profile === "generic" && !form.workflow_path.trim()

  const mutation = useMutation({
    mutationFn: () => {
      let profileSpec: Record<string, unknown> | undefined
      if (form.profile === "pbr") profileSpec = parseObjectSpec(form.pbr_spec)
      else if (form.profile === "isolated_objects") profileSpec = parseObjectSpec(form.object_spec)
      else if (form.profile === "seamless_patterns") profileSpec = parseObjectSpec(form.pattern_spec)
      else if (["icon_pack", "sticker_pack", "vfx_atlas"].includes(form.profile)) {
        profileSpec = parseObjectSpec(form.product_spec)
      }
      return postApi("/api/image-factory/run", {
        profile: form.profile,
        profile_spec: profileSpec,
        prompt: form.prompt,
        workflow_path: form.workflow_path || undefined,
        batch_size:
          form.profile === "generic" ? Number(form.batch_size) : undefined,
        required_passes:
          form.profile === "generic" ? Number(form.required_passes) : undefined,
        candidate_budget:
          form.profile === "generic" && form.candidate_budget
            ? Number(form.candidate_budget)
            : undefined,
        qa_threshold:
          form.profile === "generic" && form.qa_threshold
            ? Number(form.qa_threshold)
            : undefined,
        max_attempts:
          form.profile === "generic" ? Number(form.max_attempts) : undefined,
      })
    },
    onSuccess: () => notifyOperator("Image Factory production accepted", "success"),
    onError: (error) => notifyOperator(error.message, "error"),
  })

  const candidates = lineage.data?.candidates ?? []
  const latest = candidates.slice(0, 12)
  const latestPbrExecution = (executions.data ?? []).find(
    (item) =>
      item.kind === "image_factory" &&
      item.metadata?.profile === "pbr" &&
      item.result &&
      typeof item.result === "object",
  )
  const pbrResult = latestPbrExecution?.result as PBRResult | undefined
  const latestObjectExecution = (executions.data ?? []).find(
    (item) =>
      item.kind === "image_factory" &&
      item.metadata?.profile === "isolated_objects" &&
      item.result &&
      typeof item.result === "object",
  )
  const objectResult =
    latestObjectExecution?.result as IsolatedObjectResult | undefined

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow="Universal production"
          title="Image Factory"
          description="Batch generation → QA → repair → regeneration → lineage comparison."
          badge={<FreshnessBadge updatedAt={gallery.dataUpdatedAt} error={gallery.isError} staleAfterMs={20_000} />}
        />
      )}
      <QueryStateNotice
        error={gallery.error}
        isFetching={gallery.isFetching}
        updatedAt={gallery.dataUpdatedAt}
        onRetry={() => void gallery.refetch()}
      />

      <CompactSummary
        className="factory-command-summary"
        items={[
          { label: "Profile", value: form.profile.replaceAll("_", " "), detail: "current launch policy", tone: "cyan" },
          {
            label: "Execution",
            value: imageExecution?.state ?? "idle",
            detail: imageExecution?.phase ?? "no active production",
            tone: imageExecution ? "live" : "neutral",
          },
          { label: "Lineage", value: candidates.length, detail: "tracked candidates" },
          {
            label: "Publish ready",
            value: gallery.data ? gallery.data.publish_ready.length : "Unavailable",
            detail: "retained packages",
            tone: gallery.data?.publish_ready?.length ? "live" : "neutral",
          },
        ]}
      />

      <section className="two-column factory-grid factory-command-grid">
        <Card className="form-card">
          <PanelHeader kicker="PRODUCTION POLICY" title="Launch batch" />
          <form
            className="control-form"
            onSubmit={(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
              event.preventDefault()
              mutation.mutate()
            }}
          >
            <label className="field">
              <span>Production profile</span>
              <select
                value={form.profile}
                onChange={(event) =>
                  setForm({
                    ...form,
                    profile: event.target.value as ImageFactoryProfile,
                  })
                }
              >
                <optgroup label="V1 supported">
                  <option value="pbr">PBR material package</option>
                  <option value="icon_pack">2D game UI / item icon pack</option>
                </optgroup>
                {showExperimentalProfiles && (
                  <optgroup label="Experimental / deferred">
                    <option value="generic">Generic image batch</option>
                    <option value="isolated_objects">Transparent object pack</option>
                    <option value="seamless_patterns">Seamless pattern pack</option>
                    <option value="sticker_pack">LINE-style sticker pack</option>
                    <option value="vfx_atlas">Game VFX particle sprite atlas</option>
                  </optgroup>
                )}
              </select>
            </label>

            <label htmlFor="if-prompt">Generation prompt</label>
            <textarea
              id="if-prompt"
              rows={7}
              value={form.prompt}
              onChange={(event) =>
                setForm({ ...form, prompt: event.target.value })
              }
              required
              placeholder="Describe the sellable asset and the visual requirements QA must enforce."
            />

            <CollapsibleSection
              className="factory-policy-details"
              deferContent
              title="Profile & advanced controls"
              summary="Expert profiles, raw specs, QA budgets and workflow overrides"
            >
              <label className="agentic-inline-toggle">
                <input
                  type="checkbox"
                  checked={showExperimentalProfiles}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    setShowExperimentalProfiles(enabled)
                    if (!enabled && !["pbr", "icon_pack"].includes(form.profile)) {
                      setForm({ ...form, profile: "pbr" })
                    }
                  }}
                />
                <span>Show experimental / deferred profiles</span>
              </label>
              <label className="field">
                <span>ComfyUI API workflow override</span>
                <input
                  value={form.workflow_path}
                  onChange={(event) => setForm({ ...form, workflow_path: event.target.value })}
                  placeholder="Uses IMAGE_FACTORY_WORKFLOW_PATH when empty"
                />
              </label>
            {form.profile === "generic" && (
              <>
                {genericWorkflowMissing && (
                  <p className="error-text">
                    Generic requires an explicit ComfyUI workflow.
                  </p>
                )}
                <div className="form-grid">
                <NumberField
                  label="Batch"
                  value={form.batch_size}
                  setValue={(value) => setForm({ ...form, batch_size: value })}
                />
                <NumberField
                  label="Required passes"
                  value={form.required_passes}
                  setValue={(value) => setForm({ ...form, required_passes: value })}
                />
                <NumberField
                  label="Candidate budget"
                  value={form.candidate_budget}
                  setValue={(value) => setForm({ ...form, candidate_budget: value })}
                />
                <NumberField
                  label="QA threshold"
                  value={form.qa_threshold}
                  setValue={(value) => setForm({ ...form, qa_threshold: value })}
                  min={0}
                  max={100}
                  step="0.01"
                />
                <NumberField
                  label="Max attempts"
                  value={form.max_attempts}
                  setValue={(value) => setForm({ ...form, max_attempts: value })}
                />
                </div>
              </>
            )}
            {form.profile === "pbr" && (
              <>
                <div className="form-grid">
                  <label className="field">
                    <span>Material ID</span>
                    <input
                      value={String((JSON.parse(form.pbr_spec || "{}") as { id?: string }).id || "")}
                      onChange={(event) => {
                        const spec = JSON.parse(form.pbr_spec || "{}") as Record<string, unknown>
                        setForm({ ...form, pbr_spec: JSON.stringify({ ...spec, id: event.target.value }, null, 2) })
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>Required maps</span>
                    <input
                      value={((JSON.parse(form.pbr_spec || "{}") as { required_maps?: string[] }).required_maps || []).join(", ")}
                      onChange={(event) => {
                        const spec = JSON.parse(form.pbr_spec || "{}") as Record<string, unknown>
                        const required_maps = event.target.value.split(",").map((value) => value.trim()).filter(Boolean)
                        setForm({ ...form, pbr_spec: JSON.stringify({ ...spec, required_maps }, null, 2) })
                      }}
                    />
                  </label>
                </div>
                <CollapsibleSection title="Raw PBR JSON · Expert" summary="Authoritative profile payload">
                  <label className="field factory-raw-json">
                    <span>PBR specification JSON</span>
                    <textarea
                      rows={8}
                      value={form.pbr_spec}
                      onChange={(event) => setForm({ ...form, pbr_spec: event.target.value })}
                      spellCheck={false}
                    />
                  </label>
                </CollapsibleSection>
              </>
            )}
            {form.profile === "isolated_objects" && (
              <label className="field">
                <span>Transparent object-pack spec (JSON)</span>
                <textarea
                  rows={10}
                  value={form.object_spec}
                  onChange={(event) =>
                    setForm({ ...form, object_spec: event.target.value })
                  }
                  spellCheck={false}
                />
                <small className="form-help">
                  Each item reuses the shared candidate, QA, repair and lineage loop; pack QA rejects exact/near duplicates.
                </small>
              </label>
            )}
            {form.profile === "seamless_patterns" && (
              <label className="field">
                <span>Seamless-pattern spec (JSON)</span>
                <textarea
                  rows={10}
                  value={form.pattern_spec}
                  onChange={(event) =>
                    setForm({ ...form, pattern_spec: event.target.value })
                  }
                  spellCheck={false}
                />
                <small className="form-help">
                  Deterministic X/Y seam gates run before semantic QA; pack diversity drives selective repair.
                </small>
              </label>
            )}
            {["icon_pack", "sticker_pack", "vfx_atlas"].includes(form.profile) && (
              <>
                {form.profile === "icon_pack" && (
                  <div className="form-grid">
                    <label className="field">
                      <span>Icon pack ID</span>
                      <input
                        value={String((JSON.parse(form.product_spec || "{}") as { id?: string }).id || "")}
                        onChange={(event) => {
                          const spec = JSON.parse(form.product_spec || "{}") as Record<string, unknown>
                          setForm({ ...form, product_spec: JSON.stringify({ ...spec, id: event.target.value }, null, 2) })
                        }}
                      />
                    </label>
                    <label className="field">
                      <span>Icon labels</span>
                      <input
                        value={((JSON.parse(form.product_spec || "{}") as { items?: Array<{ label?: string }> }).items || []).map((item) => item.label || "").filter(Boolean).join(", ")}
                        onChange={(event) => {
                          const spec = JSON.parse(form.product_spec || "{}") as Record<string, unknown>
                          const labels = event.target.value.split(",").map((value) => value.trim()).filter(Boolean)
                          const items = labels.map((label, index) => ({ id: `icon-${index + 1}`, label }))
                          setForm({ ...form, product_spec: JSON.stringify({ ...spec, items }, null, 2) })
                        }}
                      />
                    </label>
                  </div>
                )}
                <CollapsibleSection title="Raw product JSON · Expert" summary="Authoritative pack payload">
                  <label className="field factory-raw-json">
                    <span>Product specification JSON</span>
                    <textarea
                      rows={10}
                      value={form.product_spec}
                      onChange={(event) => setForm({ ...form, product_spec: event.target.value })}
                      spellCheck={false}
                    />
                  </label>
                </CollapsibleSection>
              </>
            )}

            </CollapsibleSection>

            {genericWorkflowMissing && (
              <p className="panel-warning">
                Start production is blocked: Generic requires an explicit ComfyUI workflow. Open Profile & advanced controls to configure it.
              </p>
            )}
            <div className="factory-preflight" aria-label="Launch preflight">
              <span><small>Support</small><strong>{["pbr", "icon_pack"].includes(form.profile) ? "V1 supported" : "Experimental"}</strong></span>
              <span><small>Candidate budget</small><strong>{form.profile === "generic" ? form.candidate_budget : "profile default"}</strong></span>
              <span><small>Attempts</small><strong>{form.profile === "generic" ? form.max_attempts : "profile default"}</strong></span>
              <span><small>Resource</small><strong>GPU · detached execution</strong></span>
            </div>
            {mutation.error && <p className="error-text">{mutation.error.message}</p>}
            {mutation.isSuccess && (
              <p className="success-text">Production accepted. Live state is updating.</p>
            )}

            <Button
              className="button-primary"
              disabled={mutation.isPending || genericWorkflowMissing}
            >
              <Factory size={16} />
              {mutation.isPending ? "Submitting…" : "Start production"}
            </Button>
          </form>
        </Card>

        <ExecutionPanel kind="image_factory" showOutput={false} />
      </section>

      {pbrResult && (
        <CollapsibleSection
          className="lineage-panel factory-result-disclosure"
          title={pbrResult.package?.id || "Latest PBR package"}
          summary={`PBR · ${pbrResult.status || "result"} · ${Object.keys(pbrResult.selected_maps ?? {}).length} selected maps`}
          badge={<Badge tone={statusTone(pbrResult.status)}>{pbrResult.status || "result"}</Badge>}
        >
        <div className="factory-result-body">
          <div className="config-grid">
            <div className="config-item">
              <span>family gate</span>
              <strong>{pbrResult.family_qa?.decision || pbrResult.family_qa?.status || "—"}</strong>
            </div>
            <div className="config-item">
              <span>selected maps</span>
              <strong>{Object.keys(pbrResult.selected_maps ?? {}).length}</strong>
            </div>
            <div className="config-item">
              <span>family attempts</span>
              <strong>{pbrResult.family_history ? pbrResult.family_history.length : "Unavailable"}</strong>
            </div>
            <div className="config-item">
              <span>package</span>
              <strong>{pbrResult.package ? "ready" : "not produced"}</strong>
            </div>
          </div>

          {pbrResult.family_qa?.failure_codes?.length ? (
            <div className="chip-list">
              {pbrResult.family_qa.failure_codes.map((failure) => (
                <span className="failure-chip" key={failure}>{failure}</span>
              ))}
            </div>
          ) : null}

          {Object.keys(pbrResult.selected_maps ?? {}).length ? (
            <div className="data-list">
              {Object.entries(pbrResult.selected_maps!).map(([role, path]) => (
                <div className="data-row" key={role}>
                  <span className="row-icon"><ImageIcon size={15} /></span>
                  <div><strong>{role}</strong><small className="candidate-path">{path}</small></div>
                  <Badge tone="live">selected</Badge>
                </div>
              ))}
            </div>
          ) : null}

          {pbrResult.package && (
            <div className="data-list">
              <div className="data-row">
                <span className="row-icon"><FileText size={15} /></span>
                <div><strong>manifest</strong><small className="candidate-path">{pbrResult.package.manifest || "—"}</small></div>
                <Badge tone="cyan">manifest</Badge>
              </div>
              <div className="data-row">
                <span className="row-icon"><Archive size={15} /></span>
                <div><strong>archive</strong><small className="candidate-path">{pbrResult.package.archive || "—"}</small></div>
                <Badge tone="cyan">package</Badge>
              </div>
            </div>
          )}
        </div>
        </CollapsibleSection>
      )}

      {objectResult && (
        <CollapsibleSection
          className="lineage-panel factory-result-disclosure"
          title={objectResult.package?.id || "Latest object pack"}
          summary={`Object pack · ${objectResult.status || "result"} · ${Object.keys(objectResult.selected_items ?? {}).length} selected items`}
          badge={<Badge tone={statusTone(objectResult.status)}>{objectResult.status || "result"}</Badge>}
        >
        <div className="factory-result-body">
          <div className="config-grid">
            <div className="config-item">
              <span>pack gate</span>
              <strong>{objectResult.pack_qa?.decision || objectResult.pack_qa?.status || "—"}</strong>
            </div>
            <div className="config-item">
              <span>selected items</span>
              <strong>{Object.keys(objectResult.selected_items ?? {}).length}</strong>
            </div>
            <div className="config-item">
              <span>pack attempts</span>
              <strong>{objectResult.pack_history ? objectResult.pack_history.length : "Unavailable"}</strong>
            </div>
            <div className="config-item">
              <span>package</span>
              <strong>{objectResult.package ? "ready" : "not produced"}</strong>
            </div>
          </div>

          {objectResult.pack_qa?.failure_codes?.length ? (
            <div className="chip-list">
              {objectResult.pack_qa.failure_codes.map((failure) => (
                <span className="failure-chip" key={failure}>{failure}</span>
              ))}
            </div>
          ) : null}

          {Object.keys(objectResult.selected_items ?? {}).length ? (
            <div className="data-list">
              {Object.entries(objectResult.selected_items!).map(([itemId, path]) => (
                <div className="data-row" key={itemId}>
                  <span className="row-icon"><ImageIcon size={15} /></span>
                  <div><strong>{itemId}</strong><small className="candidate-path">{path}</small></div>
                  <Badge tone="live">selected</Badge>
                </div>
              ))}
            </div>
          ) : null}

          {objectResult.package && (
            <div className="data-list">
              <div className="data-row">
                <span className="row-icon"><FileText size={15} /></span>
                <div><strong>manifest</strong><small className="candidate-path">{objectResult.package.manifest || "—"}</small></div>
                <Badge tone="cyan">manifest</Badge>
              </div>
              <div className="data-row">
                <span className="row-icon"><Archive size={15} /></span>
                <div><strong>archive</strong><small className="candidate-path">{objectResult.package.archive || "—"}</small></div>
                <Badge tone="cyan">package</Badge>
              </div>
            </div>
          )}
        </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        className="lineage-panel factory-lineage-disclosure"
        title="QA lineage"
        summary={`${candidates.length} tracked candidates · parent → child evolution`}
      >
      <div className="factory-result-body">
        {latest.length ? (
          <div className="candidate-grid">
            {latest.map((candidate, index) => (
              <CandidateCard
                candidate={candidate}
                key={candidate.id || `${candidate.path}-${index}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No production lineage yet"
            body="Launch a batch. Failed attempts and regenerated children will appear here automatically."
          />
        )}
      </div>
      </CollapsibleSection>

      {gallery.error ? (
        <Card className="gallery-section">
          <p className="panel-error">{gallery.error.message}</p>
        </Card>
      ) : (
        <>
          {gallery.data?.summary ? (
            <GallerySummary summary={gallery.data.summary} />
          ) : null}
          <PublishReadyGallery packs={gallery.data?.publish_ready ?? []} />
          <div className="gallery-toolbar">
            <input
              value={gallerySearch}
              onChange={(event) => setGallerySearch(event.target.value)}
              placeholder="Search artifact, profile, failure…"
              aria-label="Search Image Factory gallery"
            />
            <span>{allGalleryArtifacts.length} retained artifacts</span>
          </div>
          {selectedArtifact && (
            <Card className="gallery-artifact-detail">
              <PanelHeader
                kicker="SELECTED ARTIFACT"
                title={selectedArtifact.id}
                action={<CopyButton value={selectedArtifact.relative_path || selectedArtifact.media_url} label="Copy artifact path" />}
              />
              <div className="config-grid">
                <div className="config-item"><span>Profile</span><strong>{selectedArtifact.profile}</strong></div>
                <div className="config-item"><span>Layer</span><strong>{selectedArtifact.subcategory}</strong></div>
                <div className="config-item"><span>Status</span><strong>{selectedArtifact.status}</strong></div>
                <div className="config-item"><span>Score</span><strong>{selectedArtifact.score == null ? "—" : (selectedArtifact.score * 100).toFixed(1)}</strong></div>
              </div>
              <small className="candidate-path">{selectedArtifact.relative_path}</small>
              {selectedArtifact.failure_codes?.length ? (
                <div className="chip-list">
                  {selectedArtifact.failure_codes.map((code) => <span key={code} className="failure-chip">{code}</span>)}
                </div>
              ) : null}
            </Card>
          )}
          <CollapsibleSection
            className="gallery-section factory-gallery-disclosure"
            deferContent
            title="Passed artifacts"
            summary="QA-cleared individual outputs by profile and production layer"
          >
            <GalleryStatusSection
              title="Passed artifacts"
              subtitle="Individual outputs that cleared QA, grouped by profile and production layer."
              tone="passed"
              groups={filterGroups(gallery.data?.passed ?? {})}
              onSelect={(artifact) => setSelectedArtifactId(artifact.id)}
            />
          </CollapsibleSection>
          <CollapsibleSection
            className="gallery-section factory-gallery-disclosure"
            deferContent
            title="Failed artifacts"
            summary="Rejected attempts retained for diagnosis and repair lineage"
          >
            <GalleryStatusSection
              title="Failed artifacts"
              subtitle="Rejected attempts remain visible for diagnosis and repair lineage."
              tone="failed"
              groups={filterGroups(gallery.data?.failed ?? {})}
              onSelect={(artifact) => setSelectedArtifactId(artifact.id)}
            />
          </CollapsibleSection>
        </>
      )}

      {imageExecution && (
        <div className="factory-floating-status">
          <span className="live-dot" />
          <strong>{imageExecution.activity}</strong>
          <span>{imageExecution.state} · {imageExecution.phase}</span>
        </div>
      )}
    </>
  )
}
