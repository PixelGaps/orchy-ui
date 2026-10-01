import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  executions: [] as any[],
  lineage: { candidates: [] as any[] },
  gallery: {
    data: undefined as any,
    error: null as Error | null,
  },
  mutation: {
    isPending: false,
    isSuccess: false,
    error: null as Error | null,
  },
}))

const apiMocks = vi.hoisted(() => ({
  getApi: vi.fn().mockResolvedValue({}),
  postApi: vi.fn(() => Promise.resolve({ accepted: true })),
}))

vi.mock("motion/react", async () => {
  const React = await import("react")
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      article: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <article {...props}>{children}</article>
      ),
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      ),
    },
  }
})

vi.mock("@/lib/api", () => apiMocks)

vi.mock("@/domains/shared", () => ({
  useExecutions: () => ({ data: state.executions }),
  ExecutionPanel: ({ kind, showOutput }: { kind?: string; showOutput?: boolean }) => (
    <div>execution:{kind}:{String(showOutput)}</div>
  ),
  DomainConfiguration: () => null,
  JsonPanel: () => null,
  SectionTabs: () => null,
  SemanticEvents: () => null,
  statusTone: (value?: string) =>
    value === "PASS" || value === "completed" ? "live"
      : value === "REJECT" || value === "failed" ? "danger"
        : "neutral",
  useDomainTab: () => ["factory", vi.fn()] as const,
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((options: {
    queryKey?: unknown[]
    queryFn?: () => unknown
  }) => {
    const key = String(options.queryKey?.[0] ?? "")
    void options.queryFn?.()
    if (key === "lineage") {
      return {
        data: state.lineage,
        error: null,
        isError: false,
        isFetching: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      }
    }
    if (key === "image-factory-gallery") {
      return {
        data: state.gallery.data,
        error: state.gallery.error,
        isError: Boolean(state.gallery.error),
        isFetching: false,
        dataUpdatedAt: 1,
        refetch: vi.fn(),
      }
    }
    return {
      data: undefined,
      error: null,
      isError: false,
      isFetching: false,
      dataUpdatedAt: 1,
      refetch: vi.fn(),
    }
  }),
  useMutation: vi.fn((options: {
    mutationFn?: () => unknown
    onSuccess?: () => void
    onError?: (error: Error) => void
  }) => ({
    ...state.mutation,
    mutate: vi.fn(() => {
      void options.mutationFn?.()
      if (state.mutation.error) options.onError?.(state.mutation.error)
      else if (state.mutation.isSuccess) options.onSuccess?.()
    }),
  })),
}))

import { ImageFactory, parseObjectSpec } from "./page"

function renderFactory(embedded = false) {
  return render(
    <MemoryRouter>
      <ImageFactory embedded={embedded} />
    </MemoryRouter>,
  )
}

function artifact(id: string, passed = true) {
  return {
    id,
    profile: "pbr",
    subcategory: "albedo_map",
    attempt: 1,
    media_url: `/media/${id}.png`,
    selected: passed,
    score: passed ? 0.99 : null,
    status: passed ? "PASS" : "REJECT",
    failure_codes: passed ? [] : ["SEAM"],
    job_id: "job-1",
    run_id: passed ? "run-1" : "",
  }
}

describe("Image Factory component coverage", () => {
  beforeEach(() => {
    state.executions = []
    state.lineage = { candidates: [] }
    state.gallery = { data: undefined, error: null }
    state.mutation = { isPending: false, isSuccess: false, error: null }
    vi.clearAllMocks()
  })

  it("renders active execution, PBR/object results, lineage and complete gallery states", () => {
    state.executions = [
      {
        execution_id: "active",
        kind: "image_factory",
        state: "running",
        activity: "Generating",
        phase: "qa",
        metadata: { profile: "generic" },
      },
      {
        execution_id: "pbr",
        kind: "image_factory",
        state: "completed",
        metadata: { profile: "pbr" },
        result: {
          status: "PASS",
          family_qa: { decision: "PASS", failure_codes: ["WARN"] },
          selected_maps: { albedo: "/pbr/albedo.png" },
          family_history: [{ attempt: 1 }],
          package: { id: "pbr-pack", manifest: "/pbr/manifest.json", archive: "/pbr/pack.zip" },
        },
      },
      {
        execution_id: "objects",
        kind: "image_factory",
        state: "completed",
        metadata: { profile: "isolated_objects" },
        result: {
          status: "PASS",
          pack_qa: { status: "PASS", failure_codes: ["NOTE"] },
          selected_items: { bolt: "/obj/bolt.png" },
          pack_history: [{ attempt: 1 }],
          package: { id: "object-pack", manifest: "/obj/manifest.json", archive: "/obj/pack.zip" },
        },
      },
    ]
    state.lineage = {
      candidates: [
        {
          id: "candidate-positive",
          attempt: 1,
          score: 0.98,
          score_delta: 0.02,
          decision: "PASS",
          failure_codes: [],
          path: "/candidate/a.png",
        },
        {
          id: "candidate-negative",
          attempt: 2,
          score: null,
          score_delta: -0.03,
          decision: "REJECT",
          failure_codes: ["BLUR", "EDGE", "COLOR", "SEAM", "EXTRA"],
          path: "",
        },
      ],
    }
    const passed = artifact("passed", true)
    const failed = artifact("failed", false)
    state.gallery.data = {
      summary: {
        publish_ready_packs: 1,
        passed_artifacts: 1,
        failed_artifacts: 1,
        passed_layers: 1,
        failed_layers: 1,
      },
      publish_ready: [
        {
          id: "ready-pack",
          profile: "pbr",
          member_count: 1,
          members: [passed],
          manifest: "/ready/manifest.json",
          archive: "",
          qa_status: "PASS",
        },
      ],
      passed: { pbr: { albedo_map: [passed] } },
      failed: { pbr: { albedo_map: [failed] } },
    }

    renderFactory()

    expect(screen.getByRole("heading", { name: "Image Factory" })).toBeInTheDocument()
    expect(screen.getByText("Generating")).toBeInTheDocument()
    expect(screen.getByText("pbr-pack")).toBeInTheDocument()
    expect(screen.getByText("object-pack")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /QA lineage/ }))
    expect(screen.getAllByText("candidat")).toHaveLength(2)
    expect(screen.getByText("BLUR")).toBeInTheDocument()
    expect(screen.getByTestId("gallery-count-packs")).toHaveTextContent("1")
    fireEvent.click(screen.getByRole("button", { name: /Passed artifacts/ }))
    fireEvent.click(screen.getByRole("button", { name: /Failed artifacts/ }))
    expect(screen.getByTestId("gallery-preview-passed-passed")).toBeInTheDocument()
    expect(screen.getByTestId("gallery-preview-failed-failed")).toBeInTheDocument()
    expect(screen.getByTestId("gallery-pack-preview-passed")).toBeInTheDocument()
    expect(screen.getByText("manifest ready")).toBeInTheDocument()
    expect(screen.getByText("collection ready")).toBeInTheDocument()
    expect(screen.getByText("Generating")).toBeInTheDocument()
  })

  it("covers empty gallery and lineage plus gallery error", () => {
    state.gallery.data = {
      publish_ready: [],
      passed: {},
      failed: {},
    }
    const { rerender } = renderFactory(true)
    expect(screen.queryByRole("heading", { name: "Image Factory" })).not.toBeInTheDocument()
    expect(screen.getByText("No production lineage yet")).toBeInTheDocument()
    expect(screen.getByText("No publish-ready packs yet")).toBeInTheDocument()
    expect(screen.getByText("No passed artifacts yet")).toBeInTheDocument()
    expect(screen.getByText("No failed artifacts")).toBeInTheDocument()

    state.gallery = { data: undefined, error: new Error("gallery unavailable") }
    rerender(<MemoryRouter><ImageFactory embedded /></MemoryRouter>)
    expect(screen.getAllByText("gallery unavailable").length).toBeGreaterThan(0)
    const retry = screen.queryByRole("button", { name: /Retry/ })
    if (retry) fireEvent.click(retry)
  })

  it("covers every production profile form and executes the profile-specific request builders", () => {
    renderFactory()

    const profile = screen.getByRole("combobox", { name: "Production profile" })
    const prompt = screen.getByLabelText("Generation prompt")
    fireEvent.change(prompt, { target: { value: "premium asset" } })
    fireEvent.click(screen.getByRole("button", { name: /Profile & advanced controls/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: /Show experimental/ }))
    expect(screen.getByRole("option", { name: "Transparent object pack" })).toBeInTheDocument()

    fireEvent.change(profile, { target: { value: "generic" } })
    expect(screen.getByText("Generic requires an explicit ComfyUI workflow.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Start production/ })).toBeDisabled()

    const workflow = screen.getByPlaceholderText("Uses IMAGE_FACTORY_WORKFLOW_PATH when empty")
    fireEvent.change(workflow, { target: { value: "/workflows/generic.json" } })
    const batch = screen.getByLabelText("Batch")
    const passes = screen.getByLabelText("Required passes")
    fireEvent.change(passes, { target: { value: "4" } })
    const budget = screen.getByLabelText("Candidate budget")
    const threshold = screen.getByLabelText("QA threshold")
    const attempts = screen.getByLabelText("Max attempts")
    fireEvent.change(batch, { target: { value: "3" } })
    fireEvent.change(passes, { target: { value: "2" } })
    fireEvent.change(budget, { target: { value: "7" } })
    fireEvent.change(threshold, { target: { value: "0.88" } })
    fireEvent.change(attempts, { target: { value: "5" } })
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))

    fireEvent.change(profile, { target: { value: "pbr" } })
    expect(screen.getByText("Material ID")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))

    fireEvent.change(profile, { target: { value: "isolated_objects" } })
    expect(screen.getByText("Transparent object-pack spec (JSON)")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))

    fireEvent.change(profile, { target: { value: "seamless_patterns" } })
    expect(screen.getByText("Seamless-pattern spec (JSON)")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))

    for (const value of ["icon_pack", "sticker_pack", "vfx_atlas"]) {
      fireEvent.change(profile, { target: { value } })
      expect(screen.getByRole("button", { name: /Raw product JSON/ })).toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: /Start production/ }))
    }

    expect(apiMocks.postApi).toHaveBeenCalledTimes(7)
  })

  it("covers structured production profile editors", () => {
    renderFactory()

    const prompt = screen.getByLabelText("Generation prompt")
    fireEvent.change(prompt, { target: { value: "edited asset" } })
    fireEvent.click(screen.getByRole("button", { name: /Profile & advanced controls/ }))

    const materialId = screen.getByLabelText("Material ID")
    const requiredMaps = screen.getByLabelText("Required maps")
    fireEvent.change(materialId, { target: { value: "stone-wall" } })
    fireEvent.change(requiredMaps, { target: { value: "albedo, normal, roughness, " } })
    fireEvent.click(screen.getByRole("button", { name: /Raw PBR JSON/ }))
    const rawPbr = screen.getByRole("button", { name: /Raw PBR JSON/ }).closest("section")?.querySelector("textarea")
    expect(rawPbr).toBeInstanceOf(HTMLTextAreaElement)
    fireEvent.change(rawPbr!, { target: { value: '{"id":"raw-pbr","required_maps":["albedo"]}' } })
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))

    expect(apiMocks.postApi).toHaveBeenLastCalledWith(
      "/api/image-factory/run",
      expect.objectContaining({
        profile: "pbr",
        profile_spec: expect.objectContaining({
          id: "raw-pbr",
          required_maps: ["albedo"],
        }),
      }),
    )

    const experimental = screen.getByRole("checkbox", { name: /Show experimental/ })
    fireEvent.click(experimental)
    const profile = screen.getByRole("combobox", { name: "Production profile" })
    expect(screen.getByRole("option", { name: "Transparent object pack" })).toBeInTheDocument()

    fireEvent.change(profile, { target: { value: "isolated_objects" } })
    const objectLabel = screen.getByText("Transparent object-pack spec (JSON)").closest("label")
    const objectSpec = objectLabel?.querySelector("textarea")
    expect(objectSpec).toBeInstanceOf(HTMLTextAreaElement)
    fireEvent.change(objectSpec, {
      target: { value: '{"id":"edited-objects","items":[{"id":"bolt","label":"bolt"}]}' },
    })
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))
    expect(apiMocks.postApi).toHaveBeenLastCalledWith(
      "/api/image-factory/run",
      expect.objectContaining({
        profile: "isolated_objects",
        profile_spec: expect.objectContaining({ id: "edited-objects" }),
      }),
    )

    fireEvent.change(profile, { target: { value: "seamless_patterns" } })
    const patternLabel = screen.getByText("Seamless-pattern spec (JSON)").closest("label")
    const patternSpec = patternLabel?.querySelector("textarea")
    expect(patternSpec).toBeInstanceOf(HTMLTextAreaElement)
    fireEvent.change(patternSpec, {
      target: { value: '{"id":"edited-patterns","patterns":[{"id":"p1","label":"repeat"}]}' },
    })
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))
    expect(apiMocks.postApi).toHaveBeenLastCalledWith(
      "/api/image-factory/run",
      expect.objectContaining({
        profile: "seamless_patterns",
        profile_spec: expect.objectContaining({ id: "edited-patterns" }),
      }),
    )

    fireEvent.change(profile, { target: { value: "icon_pack" } })
    const iconId = screen.getByLabelText("Icon pack ID")
    const iconLabels = screen.getByLabelText("Icon labels")
    fireEvent.change(iconId, { target: { value: "hud-icons" } })
    fireEvent.change(iconLabels, { target: { value: "Sword, Shield, , Potion" } })
    fireEvent.click(screen.getByRole("button", { name: /Raw product JSON/ }))
    const rawProduct = screen.getByRole("button", { name: /Raw product JSON/ }).closest("section")?.querySelector("textarea")
    expect(rawProduct).toBeInstanceOf(HTMLTextAreaElement)
    fireEvent.change(rawProduct!, { target: { value: '{"id":"raw-icons","items":[{"id":"i1","label":"Icon"}]}' } })
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))

    expect(apiMocks.postApi).toHaveBeenLastCalledWith(
      "/api/image-factory/run",
      expect.objectContaining({
        profile: "icon_pack",
        profile_spec: expect.objectContaining({
          id: "raw-icons",
          items: [{ id: "i1", label: "Icon" }],
        }),
      }),
    )
  })

  it("covers gallery filtering/selection and experimental profile reset", () => {
    const passed = {
      ...artifact("selected-pass", true),
      relative_path: "gallery/pbr/selected-pass.png",
    }
    const failed = {
      ...artifact("selected-fail", false),
      profile: "icons",
      subcategory: "inventory_icon",
      relative_path: "gallery/icons/selected-fail.png",
      failure_codes: ["EDGE", "ALPHA"],
      score: 0.42,
    }
    state.gallery.data = {
      summary: {
        publish_ready_packs: 0,
        passed_artifacts: 1,
        failed_artifacts: 1,
        passed_layers: 1,
        failed_layers: 1,
      },
      publish_ready: [],
      passed: { pbr: { albedo_map: [passed] } },
      failed: { icons: { inventory_icon: [failed] } },
    }

    renderFactory()

    fireEvent.click(screen.getByRole("button", { name: /Passed artifacts/ }))
    fireEvent.click(screen.getByRole("button", { name: /Failed artifacts/ }))

    const search = screen.getByLabelText("Search Image Factory gallery")
    fireEvent.change(search, { target: { value: "EDGE" } })
    expect(screen.queryByTestId("gallery-preview-passed-selected-pass")).not.toBeInTheDocument()
    expect(screen.getByTestId("gallery-preview-failed-selected-fail")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("gallery-preview-failed-selected-fail").closest("button")!)
    expect(screen.getByText("SELECTED ARTIFACT")).toBeInTheDocument()
    expect(screen.getByText("selected-fail")).toBeInTheDocument()
    expect(screen.getByText("42.0")).toBeInTheDocument()
    expect(screen.getAllByText("ALPHA").length).toBeGreaterThan(0)
    expect(screen.getByText("gallery/icons/selected-fail.png")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Profile & advanced controls/ }))
    const experimental = screen.getByRole("checkbox", { name: /Show experimental/ })
    fireEvent.click(experimental)

    const profile = screen.getByDisplayValue("PBR material package")
    fireEvent.change(profile, { target: { value: "seamless_patterns" } })
    expect(screen.getByDisplayValue("Seamless pattern pack")).toBeInTheDocument()

    fireEvent.click(experimental)
    expect(screen.getByDisplayValue("PBR material package")).toBeInTheDocument()
  })

  it("covers mutation pending, error and accepted states", () => {
    state.mutation = {
      isPending: true,
      isSuccess: true,
      error: new Error("submit failed"),
    }
    renderFactory()
    expect(screen.getByText("submit failed")).toBeInTheDocument()
    expect(screen.getByText("Production accepted. Live state is updating.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Submitting/ })).toBeDisabled()
  })

  it("executes mutation success and error callbacks through form submission", () => {
    state.mutation = { isPending: false, isSuccess: true, error: null }
    const { rerender } = renderFactory()
    fireEvent.change(screen.getByLabelText("Generation prompt"), { target: { value: "success asset" } })
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))
    expect(apiMocks.postApi).toHaveBeenCalled()

    state.mutation = { isPending: false, isSuccess: false, error: new Error("submit failed") }
    rerender(<MemoryRouter><ImageFactory /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText("Generation prompt"), { target: { value: "error asset" } })
    fireEvent.click(screen.getByRole("button", { name: /Start production/ }))
    expect(screen.getByText("submit failed")).toBeInTheDocument()
  })

  it("covers PBR/object result fallbacks and sparse lineage candidates", () => {
    state.executions = [
      {
        execution_id: "pbr-fallback",
        kind: "image_factory",
        state: "completed",
        metadata: { profile: "pbr" },
        result: {
          status: "",
          family_qa: { status: "REVIEW", failure_codes: [] },
          selected_maps: {},
          family_history: null,
          package: null,
        },
      },
      {
        execution_id: "obj-fallback",
        kind: "image_factory",
        state: "completed",
        metadata: { profile: "isolated_objects" },
        result: {
          status: "",
          pack_qa: { status: "REVIEW", failure_codes: [] },
          selected_items: {},
          pack_history: null,
          package: null,
        },
      },
    ]
    state.lineage = {
      candidates: [{
        id: "",
        attempt: null,
        score: 0,
        score_delta: null,
        decision: "",
        failure_codes: [],
        path: "",
      }],
    }
    state.gallery.data = { publish_ready: [], passed: {}, failed: {} }

    renderFactory()
    expect(screen.getAllByText("result").length).toBeGreaterThan(0)
    expect(screen.getAllByText("REVIEW").length).toBeGreaterThan(0)
    expect(screen.getAllByText("not produced")).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: /QA lineage/ }))
    expect(screen.getByText("candidate")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    expect(screen.getByText("artifact pending")).toBeInTheDocument()
  })

  it("covers selected artifact media fallback and empty search result groups", () => {
    const fallback = {
      ...artifact("fallback", true),
      relative_path: "",
      media_url: "/media/fallback.png",
      score: null,
      failure_codes: [],
    }
    state.gallery.data = {
      publish_ready: [],
      passed: { pbr: { albedo_map: [fallback] } },
      failed: {},
    }
    renderFactory()
    fireEvent.click(screen.getByRole("button", { name: /Passed artifacts/ }))
    fireEvent.click(screen.getByTestId("gallery-preview-passed-fallback").closest("button")!)
    expect(screen.getByText("SELECTED ARTIFACT")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText("Search Image Factory gallery"), {
      target: { value: "no-match-anywhere" },
    })
    expect(screen.getByText("No passed artifacts yet")).toBeInTheDocument()
  })

  it("covers empty structured specs and sparse packaged result fallbacks", () => {
    state.executions = [
      { execution_id: "p", kind: "image_factory", state: "completed", metadata: { profile: "pbr" }, result: {
        status: null, family_qa: null, selected_maps: null, family_history: undefined,
        package: { id: "", manifest: "", archive: "" },
      } },
      { execution_id: "o", kind: "image_factory", state: "completed", metadata: { profile: "isolated_objects" }, result: {
        status: null, pack_qa: null, selected_items: null, pack_history: undefined,
        package: { id: "", manifest: "", archive: "" },
      } },
    ]
    renderFactory()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ready").length).toBeGreaterThan(0)

    const profile = screen.getByRole("combobox", { name: "Production profile" })
    fireEvent.change(screen.getByLabelText("Material ID"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Required maps"), { target: { value: "" } })

    fireEvent.change(profile, { target: { value: "icon_pack" } })
    fireEvent.change(screen.getByLabelText("Icon pack ID"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Icon labels"), { target: { value: "" } })
  })

  it("covers gallery pack fallbacks and artifact score/status fallbacks", () => {
    const bare = {
      ...artifact("bare", true),
      score: null,
      selected: false,
      attempt: 0,
      run_id: "",
      failure_codes: [],
    }
    state.gallery.data = {
      summary: {
        publish_ready_packs: 1,
        passed_artifacts: 1,
        failed_artifacts: 0,
        passed_layers: 1,
        failed_layers: 0,
      },
      publish_ready: [
        {
          id: "bare-pack",
          profile: "icons",
          member_count: 1,
          members: [bare],
          manifest: "",
          archive: "/pack.zip",
          qa_status: "PASS",
        },
      ],
      passed: { icons: { item: [bare] } },
      failed: {},
    }
    renderFactory()
    expect(screen.getByText("no manifest")).toBeInTheDocument()
    expect(screen.getByText("archive ready")).toBeInTheDocument()
    expect(screen.getAllByText("clean gate").length).toBeGreaterThan(0)
  })
  it("validates raw product profile JSON as object-only", () => {
    expect(parseObjectSpec("")).toEqual({})
    expect(parseObjectSpec('{"id":"ok"}')).toEqual({id:"ok"})
    expect(()=>parseObjectSpec("[]")).toThrow("Profile spec must be a JSON object.")
    expect(()=>parseObjectSpec("null")).toThrow("Profile spec must be a JSON object.")
    expect(()=>parseObjectSpec('"text"')).toThrow("Profile spec must be a JSON object.")
  })


  it("covers Image Factory nullish execution, lineage and gallery filter fallbacks", () => {
    state.executions = undefined as any
    state.lineage = undefined as any
    state.gallery.data = {
      summary: {
        publish_ready_packs: 0,
        passed_artifacts: 1,
        failed_artifacts: 0,
        passed_layers: 1,
        failed_layers: 0,
      },
      publish_ready: [],
      passed: {
        icons: {
          inventory_icon: [{
            ...artifact("no-failures", true),
            failure_codes: undefined,
          }],
        },
      },
      failed: {},
    }
    renderFactory()
    expect(screen.getByText("Lineage").parentElement).toHaveTextContent("0")
    fireEvent.click(screen.getByRole("button", { name: /Passed artifacts/ }))
    fireEvent.change(screen.getByLabelText("Search Image Factory gallery"), { target: { value: "no-failures" } })
    expect(screen.getByTestId("gallery-preview-passed-no-failures")).toBeInTheDocument()
  })

  it("covers empty raw PBR and icon spec editor fallbacks", () => {
    renderFactory()
    fireEvent.click(screen.getByRole("button", { name: /Profile & advanced controls/ }))
    fireEvent.click(screen.getByRole("button", { name: /Raw PBR JSON/ }))
    const pbrRaw = screen.getByLabelText("PBR specification JSON")
    fireEvent.change(pbrRaw, { target: { value: "" } })
    expect(screen.getByLabelText("Material ID")).toHaveValue("")
    expect(screen.getByLabelText("Required maps")).toHaveValue("")
    fireEvent.change(screen.getByLabelText("Required maps"), { target: { value: "albedo, , normal" } })
    fireEvent.change(pbrRaw, { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Material ID"), { target: { value: "mat-x" } })

    fireEvent.change(screen.getByRole("combobox", { name: "Production profile" }), { target: { value: "icon_pack" } })
    fireEvent.click(screen.getByRole("button", { name: /Raw product JSON/ }))
    const raw = screen.getByLabelText("Product specification JSON")
    fireEvent.change(raw, { target: { value: "" } })
    expect(screen.getByLabelText("Icon pack ID")).toHaveValue("")
    expect(screen.getByLabelText("Icon labels")).toHaveValue("")
    fireEvent.change(screen.getByLabelText("Icon labels"), { target: { value: "sword, , shield" } })
    fireEvent.change(raw, { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Icon pack ID"), { target: { value: "icons-x" } })
    fireEvent.change(raw, { target: { value: JSON.stringify({ items: [{}] }) } })
    expect(screen.getByLabelText("Icon labels")).toHaveValue("")
  })

  it("covers result objects with absent selected maps/items", () => {
    state.executions = [
      {
        execution_id: "pbr-empty",
        kind: "image_factory",
        state: "completed",
        metadata: { profile: "pbr" },
        result: {
          status: "",
          family_qa: {},
          selected_maps: undefined,
          family_history: undefined,
          package: undefined,
        },
      },
      {
        execution_id: "objects-empty",
        kind: "image_factory",
        state: "completed",
        metadata: { profile: "isolated_objects" },
        result: {
          status: "",
          pack_qa: {},
          selected_items: undefined,
          pack_history: undefined,
          package: undefined,
        },
      },
    ]
    renderFactory()
    expect(screen.getByText("Latest PBR package")).toBeInTheDocument()
    expect(screen.getByText("Latest object pack")).toBeInTheDocument()
    expect(screen.getAllByText("not produced").length).toBeGreaterThanOrEqual(2)
  })

})
