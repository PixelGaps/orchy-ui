/**
 * Test documentation — executable specification.
 * Scope: fast hostless UI contract for compact layout, progressive disclosure,
 * navigation/accessibility and preserved operator affordances.
 * External boundary policy: deterministic browser intercepts only; no live host,
 * GPU, model runtime, healthcheck or Mission execution.
 */

import { expect, test, type Page } from "@playwright/test"

async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    let body: unknown = {}

    if (path === "/api/operator/overview") {
      body = {
        health: { status: "healthy", components: {} },
        telemetry: {
          timestamp: 0,
          cpu: { load1: 0, load5: 0, load15: 0 },
          ram: { used_gb: 8, total_gb: 16, available_gb: 8 },
          disk: { used_gb: 10, total_gb: 100, free_gb: 90 },
          gpu: { utilization_pct: 0, temperature_c: 40, vram_used_mib: 0, vram_total_mib: 16384 },
        },
        active_executions: [],
        healthchecks: {},
        missions: {
          schema: "orchy.mission-overview.v1",
          required_health: { status: "green", total: 0, green: 0, failed: 0, running: 0 },
          required: [],
          exploratory: [],
        },
        quotas: [],
      }
    } else if (path === "/api/telemetry") {
      body = {
        timestamp: 0,
        cpu: { load1: 0, load5: 0, load15: 0 },
        ram: { used_gb: 8, total_gb: 16, available_gb: 8 },
        disk: { used_gb: 10, total_gb: 100, free_gb: 90 },
        gpu: { utilization_pct: 0, temperature_c: 40, vram_used_mib: 0, vram_total_mib: 16384 },
      }
    } else if (path === "/api/repositories") {
      body = [{
        id: "orchy", name: "Orchy", remote_identity: "PixelGaps/orchy",
        default_branch: "main", available: true, writable: true, reason: "",
      }]
    } else if (path === "/api/executions") {
      body = []
    } else if (path === "/api/logs") {
      body = {
        executions: [{
          execution_id: "exec-1", state: "completed", kind: "task",
          task: "compact UI audit", activity: "compact UI audit",
          phase: "done", worker: "local", model: "qwen", evidence: [],
          validation: { status: "PASS" }, output_tail: "PASS", metadata: {},
        }],
        jobs: [], healthchecks: [], ci_runs: [], evidence: {},
      }
    } else if (path === "/api/healthchecks") {
      body = [{
        id: "system-docker", domain: "system", label: "Docker",
        description: "Docker host certification", resource_class: "cpu_only",
        gpu_required: false, latest: null,
      }]
    } else if (path.startsWith("/api/configuration/")) {
      const section = path.split("/").at(-1) || "global"
      body = {
        section,
        fields: section === "global" ? [
          {
            name: "storage_root", value: "/mnt/nvme", type: "string", choices: [],
            restart_required: false, secret: false, description: "Storage root",
            category: "Storage roots", source: "default", host_critical: true,
            path_status: { exists: true },
          },
          {
            name: "model_cache", value: "/mnt/nvme/models", type: "string", choices: [],
            restart_required: false, secret: false, description: "Model cache",
            category: "Models and caches", source: "default", host_critical: false,
            path_status: { exists: true },
          },
        ] : [],
      }
    } else if (path === "/api/image-factory/lineage") {
      body = { path: "", candidates: [] }
    } else if (path === "/api/image-factory/gallery") {
      body = { summary: {}, publish_ready: [], passed: {}, failed: {} }
    } else if (path === "/api/image-factory/profiles") {
      body = {}
    } else if (path === "/api/comfyui") {
      body = {
        url: "", health_url: "", workflow_path: "", pbr_source_workflow_path: "",
        pbr_map_workflow_path: "", pbr_source_image_node_id: "",
        isolated_object_workflow_path: "", output_dir: "",
        configuration: { section: "comfyui", fields: [] },
      }
    } else if (path === "/api/llm") {
      body = { containers: [], model: "", base_url: "", health_url: "", models: {} }
    } else if (path === "/api/capabilities") {
      body = { entries: [] }
    } else if (path === "/api/deep-research/runtime") {
      body = { ready: false, model: "deep-research", model_present: true, capabilities: [] }
    } else if (path === "/api/agentic/handbook") {
      body = {
        available: true,
        reason: "",
        total_tasks: 2863,
        matched_tasks: 2863,
        ranking_state: "available",
        issue_source: { state: "fresh", observedAt: "2026-10-03T08:00:00Z", errorCode: null },
        current_task: {
          campaign_task_id: "multi-swe-bench-final:facebook__zstd-1008",
          task_id: "facebook__zstd-1008",
          ordinal: 1,
          execution_rank: 1,
          state: "blocked",
          issues: ["OR-986", "OR-988"],
        },
        summary: { not_run: 2862, partial: 0, completed: 0, failed: 0, blocked: 1, has_issues: 1 },
        tasks: [{
          ordinal: 1,
          execution_rank: 1,
          information_value: 0.82,
          execution_score: 0.21,
          campaign_task_id: "multi-swe-bench-final:facebook__zstd-1008",
          suite_id: "multi-swe-bench-final",
          suite_version: "hf-2a28fe1c8d1d",
          task_id: "facebook__zstd-1008",
          task_version: "sha256:task",
          title: "Fix hashLog3 size when copying cdict tables",
          summary: "Fix hashLog3 size when copying cdict tables",
          repository: "facebook/zstd",
          capability_tags: ["code-editing", "issue-resolution", "c"],
          state: "blocked",
          issues: ["OR-986", "OR-988"],
          lanes: {
            chatgpt: null,
            aider: {
              lane: "aider",
              run_id: "run-aider-2",
              captured_at: "2026-10-03T08:00:00Z",
              outcome: "INVALID",
              failure_kind: "BENCHMARK_RUNTIME",
              agent: "aider",
              agent_version: "1.0",
              model: "local",
              profile: "bounded",
              release_id: "runner@abc",
              config_digest: "sha256:config",
              jira_key: "OR-988",
              supersedes_run_id: "run-aider-1",
              improvement: "Bound context",
              improvement_version: "runner@abc",
              diagnosis: "context exhaustion",
              recommendation: "retain bounded slice",
              residual_limitation: "not yet rerun",
              changed_files: [],
              patch_digest: "",
              diff_digest: "",
              oracle_result: "",
              oracle_version: "oracle-v1",
              validation_outcome: "INVALID",
              implementation_summary: "",
              evidence_ref: "/evidence/run-aider-2.json",
              before_after_delta: {
                from_run_id: "run-aider-1",
                from_outcome: "FAIL",
                to_outcome: "INVALID",
                from_validation: "FAIL",
                to_validation: "INVALID",
                outcome_changed: true,
              },
            },
            cline: null,
          },
          history: [],
        }],
      }
    } else if (path === "/api/cloud-control/sources/jira") {
      const assuranceKeys = ["OR-590","OR-594","OR-598","OR-600","OR-601","OR-602","OR-603","OR-604","OR-605","OR-606","OR-607","OR-608"]
      const assuranceIssues = assuranceKeys.map((key, index) => ({
        key, summary: `Layer ${index + 1}`, status: "Done", statusCategory: "Done",
        priority: "High", type: "Task", parentKey: "OR-620", labels: [],
        browseUrl: `https://example.invalid/${key}`, updated: "2026-10-05T22:00:00Z",
      }))
      const extraIssues = Array.from({ length: 48 }, (_, index) => ({
        key: `OR-${3000 + index}`, summary: `Bounded issue ${index + 1}`,
        status: "To Do", statusCategory: "To Do", priority: "High", type: "Task",
        parentKey: null, labels: ["ux"], browseUrl: `https://example.invalid/OR-${3000 + index}`,
        updated: "2026-10-05T22:00:00Z",
      }))
      body = {
        state: "fresh", authority: "Jira", observedAt: "2026-10-05T22:00:00Z",
        payload: { openCount: 48, byStatus: { Done: 12, "To Do": 48 }, issues: [...assuranceIssues, ...extraIssues] },
      }
    } else if (path === "/api/cloud-control/sources/testops") {
      const ids = ["fast-web","fast-python","property-state-machine","security","fuzz","performance","portability","flakes","coverage-static-sonar","mutation","browser-e2e","live-chaos-soak-recovery"]
      const keys = ["OR-590","OR-594","OR-598","OR-600","OR-601","OR-602","OR-603","OR-604","OR-605","OR-606","OR-607","OR-608"]
      body = {
        state: "fresh", authority: "TestOps", observedAt: "2026-10-05T22:00:00Z",
        payload: {
          target: "PixelGaps/orchy",
          layers: ids.map((layerId, index) => ({
            layerId, runId: `run-${index + 1}`, revision: "a".repeat(40),
            outcome: "PASS", finishedAt: "2026-10-05T22:00:00Z",
            durationMs: 100 + index, jiraMilestone: keys[index],
          })),
          findings: [],
        },
      }
    } else if (path === "/api/validation") {
      body = { passed: true, output: "PASS", elapsed_ms: 1 }
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  })
}

test("desktop shell preserves navigation, skip target and compact control", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockApi(page)
  await page.goto("/")
  await expect(page.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#orchy-main-content")
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Compact navigation" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible()
})

test("mobile shell exposes explicit navigation drawer without losing routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page)
  await page.goto("/")
  const mobileNav = page.getByRole("navigation", { name: "Mobile primary navigation" })
  await expect(mobileNav).toBeVisible()
  const menu = mobileNav.getByRole("button", { name: "More navigation" })
  await expect(menu).toBeVisible()
  await menu.click()
  const primaryNav = page.getByRole("navigation", { name: "Primary navigation" })
  await expect(primaryNav.getByRole("link", { name: "Image Factory" })).toBeVisible()
  await expect(primaryNav.getByRole("link", { name: "Global Settings" })).toBeVisible()
})

test("progressive disclosure preserves secondary operator detail and actions", async ({ page }) => {
  await mockApi(page)

  await page.goto("/llm?tab=agentic")
  const repositoryScope = page.getByRole("button", { name: /Repository scope/ })
  await expect(repositoryScope).toHaveAttribute("aria-expanded", "false")
  await repositoryScope.click()
  await expect(page.getByLabel("Primary repository")).toBeVisible()
  await expect(page.getByRole("button", { name: "Run task" })).toBeVisible()

  await page.goto("/settings")
  const storage = page.getByRole("button", { name: /Storage roots/ })
  await expect(storage).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("button", { name: "storage root /mnt/nvme" })).toBeVisible()

  await page.goto("/logs?tab=executions")
  await expect(page.getByLabel("Filter operational runs")).toBeVisible()
  await expect(page.getByRole("button", { name: /Raw execution output/ })).toBeVisible()
})

test("compact Image Factory keeps launch surface primary and advanced detail optional", async ({ page }) => {
  await mockApi(page)
  await page.goto("/image-factory")
  await expect(page.getByRole("heading", { name: "Image Factory", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /Profile & advanced controls/ })).toHaveAttribute("aria-expanded", "false")
  await expect(page.getByRole("button", { name: /Start production/i })).toBeVisible()
})


test("Agentic Handbook exposes bounded 2,863-task authority, filters and drill-down evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await mockApi(page)
  await page.goto("/agentic-coding?tab=handbook")

  await expect(page.getByRole("heading", { name: "Agentic Coding", exact: true })).toBeVisible()
  await expect(page.getByText("2,863-TASK CAPABILITY BOOK")).toBeVisible()
  await expect(page.getByText("2863", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("facebook__zstd-1008", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("r1", { exact: true })).toBeVisible()
  await expect(page.getByText("OR-986", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("UNKNOWN", { exact: true }).first()).toBeVisible()

  await page.locator("details.handbook-task").first().locator("summary").click()
  await expect(page.getByText("sha256:config", { exact: true })).toBeVisible()
  await expect(page.getByText(/FAIL → INVALID/).first()).toBeVisible()
  await expect(page.getByText("not yet rerun", { exact: true })).toBeVisible()

  await page.getByLabel("Search handbook tasks").fill("zstd")
  await expect(page.getByLabel("Filter handbook state")).toBeVisible()
  await expect(page.getByText("1–50 of 2863", { exact: true })).toBeVisible()
})

test("Agentic Handbook remains usable at mobile width without rendering hidden lane columns", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page)
  await page.goto("/agentic-coding?tab=handbook")
  await expect(page.getByLabel("Search handbook tasks")).toBeVisible()
  await expect(page.getByLabel("Filter handbook state")).toBeVisible()
  await expect(page.getByText("Has Jira issues", { exact: true })).toBeVisible()
  await expect(page.locator("details.handbook-task").first()).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})


test("OR-983 mobile dense surfaces remain bounded, navigable and touch-safe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page)

  await page.goto("/issues")
  await expect(page.getByRole("heading", { name: "Jira Issues", exact: true })).toBeVisible()
  await expect(page.locator(".issue-row")).toHaveCount(40)
  await expect(page.getByRole("button", { name: /Show 40 more/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)

  await page.goto("/assurance")
  await expect(page.locator(".assurance-layer")).toHaveCount(6)
  await page.getByRole("button", { name: "Show all 12 layers" }).click()
  await expect(page.locator(".assurance-layer")).toHaveCount(12)

  await page.goto("/settings")
  const boundaries = page.getByRole("button", { name: /Operator boundaries/ })
  await boundaries.click()
  await expect(page.getByText("Declared surface registry.")).toBeVisible()
  const shortControls = await page.locator("button:visible, a.button:visible").evaluateAll((nodes) =>
    nodes.filter((node) => node.getBoundingClientRect().height < 44).map((node) => ({
      text: (node.textContent || "").trim(),
      height: node.getBoundingClientRect().height,
    })),
  )
  expect(shortControls).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
})
