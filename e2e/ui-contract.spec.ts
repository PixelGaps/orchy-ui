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
