/**
 * OR-689 browser acceptance — deterministic Workbench UI contract.
 * Uses the canonical backend request/response and SSE shapes without a live agent runtime.
 */

import { expect, test, type Page, type Route } from "@playwright/test"

const SHA = "a".repeat(40)

type Capture = { start?: Record<string, unknown> }

function session(state = "running") {
  return {
    session_id: "session-1",
    execution_id: "exec-1",
    repository_id: "agents-sandbox",
    target_sha: SHA,
    runtime: "cline",
    effort: "HIGH",
    enabled_plugins: ["local-echo"],
    attachments: [],
    turn_count: 1,
    state: "accepted",
    parent_execution_id: null,
    execution: { execution_id: "exec-1", state },
  }
}

const eventBody = [
  'event: assistant_text\ndata: {"sequence":1,"kind":"assistant_text","payload":{"text":"Inspecting exact SHA"}}',
  'event: tool_start\ndata: {"sequence":2,"kind":"tool_start","payload":{"tool":"repository.search"}}',
  'event: patch\ndata: {"sequence":3,"kind":"patch","payload":{"changed_files":["src/example.ts"],"patch":"+ fixed"}}',
  'event: validation\ndata: {"sequence":4,"kind":"validation","payload":{"status":"PASS"}}',
].join("\n\n") + "\n\n"

async function mockWorkbench(page: Page, capture: Capture) {
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path === "/api/repositories") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "agents-sandbox",
          name: "Agents Sandbox",
          remote_identity: "PixelGaps/agents-sandbox",
          default_branch: "main",
          available: true,
          writable: true,
          reason: "",
        }]),
      })
      return
    }

    if (path === "/api/workbench/plugins") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          plugin_id: "local-echo",
          version: "1",
          transport: "stdio",
          capabilities: [],
          tools: [{ name: "echo", description: "Echo", input_schema: {}, capabilities: [] }],
        }]),
      })
      return
    }

    if (path === "/api/workbench/sessions" && request.method() === "POST") {
      capture.start = request.postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(session()),
      })
      return
    }

    if (path === "/api/workbench/sessions/session-1/events") {
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: eventBody })
      return
    }

    if (path === "/api/workbench/sessions/session-1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(session()),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "unmocked " + request.method() + " " + path }),
    })
  })
}

async function configureAndLaunch(page: Page, capture: Capture) {
  await mockWorkbench(page, capture)
  await page.goto("/workbench")

  await expect(page.getByRole("heading", { name: "Coding workspace" })).toBeVisible()
  await expect(page.getByText("WIP adapter").first()).toBeVisible()
  await expect(page.getByLabel("Repository")).toHaveValue("agents-sandbox")

  await page.getByLabel("Exact target SHA").fill(SHA)
  await page.getByLabel("Runtime").selectOption("cline")
  await page.getByLabel("Effort").selectOption("HIGH")
  await page.getByRole("checkbox", { name: /local-echo/ }).check()
  await page.getByLabel("Task").fill("Implement deterministic browser contract")
  await page.getByLabel(/Acceptance criteria/).fill("Tests pass\nNo unrelated changes")
  await page.getByRole("button", { name: /Start session/ }).click()

  await expect.poll(() => capture.start).not.toBeUndefined()
}

test("desktop Workbench launches canonical session and renders observable evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  const capture: Capture = {}
  await configureAndLaunch(page, capture)

  expect(capture.start).toMatchObject({
    task: "Implement deterministic browser contract",
    repository_id: "agents-sandbox",
    target_sha: SHA,
    runtime: "cline",
    effort: "HIGH",
    enabled_plugins: ["local-echo"],
    acceptance: ["Tests pass", "No unrelated changes"],
  })
  await expect(page.getByText("Inspecting exact SHA")).toBeVisible()
  await expect(page.locator(".workbench-changed-files code").filter({ hasText: "src/example.ts" })).toBeVisible()
  await expect(page.getByText("one-shot SSE")).toBeVisible()
  await expect(page.getByRole("button", { name: /Stop/ })).toBeEnabled()
  await expect(page.getByRole("button", { name: /Repair/ })).toBeDisabled()
})

test("mobile Workbench remains usable without horizontal document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const capture: Capture = {}
  await configureAndLaunch(page, capture)

  await expect(page.getByText("Inspecting exact SHA")).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await expect(page.getByRole("navigation", { name: "Mobile primary navigation" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Stop/ })).toBeVisible()
})
