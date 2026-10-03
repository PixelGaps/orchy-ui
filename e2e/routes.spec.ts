/**
 * Test documentation — executable specification.
 * Scope: hostless browser coverage for canonical Web domain routes and compatibility redirects.
 * Production under test: App shell, domains/routes.tsx, route-owned page composition.
 * External boundary policy: API responses are deterministic browser intercepts; no live host,
 * Docker, GPU, model runtime or FastAPI process is required.
 */

import { expect, test, type Page } from "@playwright/test"

const ROUTES = [
  ["/", "Overview"],
  ["/assurance", "Test Assurance"],
  ["/issues", "Jira Issues"],
  ["/missions", "Missions"],
  ["/workbench", "Coding workspace"],
  ["/queue", "Queue"],
  ["/image-factory", "Image Factory"],
  ["/agentic-coding", "Agentic Coding"],
  ["/llm", "LLM"],
  ["/comfyui", "ComfyUI"],
  ["/healthcheck", "Healthcheck"],
  ["/logs", "Logs"],
  ["/settings", "Global Settings"],
] as const

const REDIRECTS = [
  ["/tasks", "/"],
  ["/validation", "/"],
  ["/comfyui/image-factory", "/image-factory"],
  ["/runtime", "/llm?tab=runtime"],
  ["/configuration", "/llm?tab=settings"],
  ["/runs", "/logs?tab=ci"],
  ["/evidence", "/logs?tab=evidence"],
] as const

async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    let body: unknown = {}
    if (path === "/api/cloud-control/sources/jira") {
      body = { source: "jira", authority: "Jira OR work state", state: "fresh", observedAt: new Date().toISOString(), ageSeconds: 0, payload: { openCount: 0, issues: [] }, errorCode: null }
    } else if (path === "/api/repositories") {
      body = []
    } else if (path === "/api/workbench/plugins") {
      body = []
    } else if (path === "/api/gateway/jobs" || path.startsWith("/api/gateway/jobs?")) {
      body = { jobs: [], next_cursor: null, total: 0 }
    } else if (path === "/api/gateway/health") {
      body = { status: "live", workers: [], components: {}, capabilities: [] }
    } else if (path === "/api/executions") body = []
    else if (path === "/api/execution") body = {}
    else if (path === "/api/repositories") body = []
    else if (path === "/api/runs") body = []
    else if (path === "/api/healthchecks") body = []
    else if (path === "/api/telemetry") {
      body = {
        timestamp: 0,
        cpu: { load1: 0, load5: 0, load15: 0 },
        ram: { used_gb: 0, total_gb: 1, available_gb: 1 },
        disk: { used_gb: 0, total_gb: 1, free_gb: 1 },
        gpu: {
          utilization_pct: null,
          temperature_c: null,
          vram_used_mib: null,
          vram_total_mib: null,
        },
      }
    } else if (path === "/api/operator/overview") {
      body = {
        health: { status: "ok", components: {} },
        telemetry: {
          timestamp: 0,
          cpu: { load1: 0, load5: 0, load15: 0 },
          ram: { used_gb: 0, total_gb: 1, available_gb: 1 },
          disk: { used_gb: 0, total_gb: 1, free_gb: 1 },
          gpu: {
            utilization_pct: null,
            temperature_c: null,
            vram_used_mib: null,
            vram_total_mib: null,
          },
        },
        active_executions: [],
        healthchecks: {},
        missions: {
          schema: "orchy.mission-overview.v1",
          required_health: {
            status: "unknown",
            total: 0,
            green: 0,
            failed: 0,
            running: 0,
          },
          required: [],
          exploratory: [],
        },
        quotas: [],
      }
    } else if (path === "/api/agentic/handbook") {
      body = { available: true, reason: "", total_tasks: 2863, matched_tasks: 2863, offset: 0, limit: 50, summary: { not_run: 2863, partial: 0, completed: 0, failed: 0, blocked: 0, has_issues: 0 }, tasks: [] }
    } else if (path === "/api/validation") {
      body = { passed: true, output: "", elapsed_ms: 0 }
    } else if (path === "/api/runtime") {
      body = { containers: [], model: "", base_url: "", health_url: "" }
    } else if (path === "/api/llm") {
      body = {
        containers: [],
        model: "",
        base_url: "",
        health_url: "",
        models: {},
        configuration: { section: "llm", fields: [] },
      }
    } else if (path === "/api/deep-research/runtime") {
      body = {
        ready: false,
        model: "deep-research",
        model_present: true,
        capabilities: ["text", "structured_output", "streaming"],
      }
    } else if (path === "/api/comfyui") {
      body = {
        url: "",
        health_url: "",
        workflow_path: "",
        pbr_source_workflow_path: "",
        pbr_map_workflow_path: "",
        pbr_source_image_node_id: "",
        isolated_object_workflow_path: "",
        output_dir: "",
        configuration: { section: "comfyui", fields: [] },
      }
    } else if (path === "/api/logs") {
      body = {
        executions: [],
        jobs: [],
        healthchecks: [],
        ci_runs: [],
        evidence: {},
      }
    } else if (path.startsWith("/api/configuration/")) {
      body = {
        section: path.split("/").at(-1) || "global",
        fields: [],
      }
    } else if (path === "/api/image-factory/lineage") {
      body = { path: "", candidates: [] }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

test.describe("hostless operator route contract", () => {
  for (const [path, heading] of ROUTES) {
    test(`${path} renders its owning domain page`, async ({ page }) => {
      await mockApi(page)
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : path}`))
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible()
    })
  }

  for (const [legacy, canonical] of REDIRECTS) {
    test(`${legacy} redirects to ${canonical}`, async ({ page }) => {
      await mockApi(page)
      await page.goto(legacy)
      await expect(page).toHaveURL(
        new RegExp(canonical.replace(/[?]/g, "\\?") + "$"),
      )
    })
  }
})
