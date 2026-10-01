/**
 * Test documentation — executable specification
 * Hostless browser contract for explicit New Task repository selection.
 */
import { expect, test } from "@playwright/test"

test("New Task requires explicit repository scope and submits selected repos", async ({ page }) => {
  const payloads: Array<Record<string, unknown>> = []

  await page.route("**/api/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === "/api/repositories" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "orchy",
            name: "Orchy",
            remote_identity: "PixelGaps/orchy",
            default_branch: "main",
            available: true,
            writable: true,
            reason: "",
          },
          {
            id: "secondary",
            name: "Secondary",
            remote_identity: "PixelGaps/secondary",
            default_branch: "main",
            available: true,
            writable: true,
            reason: "",
          },
        ]),
      })
      return
    }
    if (path === "/api/tasks" && request.method() === "POST") {
      payloads.push(request.postDataJSON() as Record<string, unknown>)
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ status: "accepted", execution_id: "exec-canary" }),
      })
      return
    }
    if (path === "/api/executions") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
        {
          execution_id: "exec-unrelated",
          state: "running",
          kind: "task",
          task: "unrelated task",
          output_tail: "OTHER",
          evidence: [],
          validation: {},
          metadata: {},
        },
        {
          execution_id: "exec-canary",
          state: "completed",
          kind: "task",
          task: "list repo files",
          output_tail: "INSPECTION_RESULT=README.md",
          evidence: [],
          validation: {},
          metadata: {
            repository: { id: "orchy", preflight: { tracked_files: 2, writable: true } },
            machine_result: {
              outcome: "success",
              evidence: { summary: "Execution passed" },
              metadata: {
                diagnostics: {
                  phase: "COMPLETE",
                  failure_class: "",
                  attempted_repair: [],
                  failed_checks: [],
                  next_action: "ACCEPT",
                  attempt: 1,
                  max_attempts: 3,
                },
              },
            },
          },
        }]),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })

  await page.goto("/llm?tab=agentic")
  await page.getByRole("button", { name: /Repository scope/ }).click()
  await expect(page.getByLabel("Primary repository")).toBeVisible()
  await page.getByLabel("Primary repository").selectOption("orchy")
  await page.getByLabel("Multi-repo task").check()
  await page.getByRole("checkbox", { name: "Include repository Secondary" }).check()
  await expect(page.getByText(/Primary: Orchy/)).toBeVisible()
  await expect(page.getByText(/Additional: secondary/)).toBeVisible()

  await page.getByLabel("Outcome").fill("Update both declared repositories")
  await page.getByRole("button", { name: "Run task" }).click()

  await expect.poll(() => payloads.length).toBe(1)
  expect(payloads[0]).toMatchObject({
    task: "Update both declared repositories",
    repository_id: "orchy",
    additional_repository_ids: ["secondary"],
  })
  await expect(page.getByText("2 tracked · writable")).toBeVisible()
  await expect(page.getByText("list repo files")).toBeVisible()
  await expect(page.getByText("unrelated task")).not.toBeVisible()
  await expect(page.getByTestId("execution-machine-result")).toContainText("success")
  await expect(page.getByTestId("execution-result-evidence")).toContainText("Execution passed")
  await expect(page.getByTestId("execution-diagnostics")).toContainText("next: ACCEPT")
})


test("unavailable repository cannot be launched", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === "/api/repositories") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "orchy",
            name: "Orchy",
            remote_identity: "PixelGaps/orchy",
            default_branch: "main",
            available: false,
            writable: true,
            reason: "checkout unavailable",
          },
        ]),
      })
      return
    }
    if (path === "/api/executions") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })

  await page.goto("/llm?tab=agentic")
  await page.getByRole("button", { name: /Repository scope/ }).click()
  await page.getByLabel("Outcome").fill("inspect repository")
  await expect(page.getByRole("button", { name: "Run task" })).toBeDisabled()
})
