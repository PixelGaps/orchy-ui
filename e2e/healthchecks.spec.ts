/**
 * Test documentation — executable specification.
 * Scope: end-to-end coverage for healthchecks.
 * Production under test: test support / repository contract.
 * Documentation contract: test names describe scenarios; comments explain non-obvious setup,
 * invariants, failure semantics, or external boundaries rather than restating assertions.
 */

import { expect, test, type APIRequestContext, type Page } from "@playwright/test"

type HealthcheckLatest = {
  execution_id?: string
  state?: string
  error?: string
  output_tail?: string
}

type HealthcheckItem = {
  id: string
  label: string
  latest?: HealthcheckLatest | null
}

type HealthcheckCase = {
  id: string
  timeoutMs: number
}

// Ordered to minimize expensive GPU runtime switches on the single-GPU host.
const HEALTHCHECKS: HealthcheckCase[] = [
  { id: "system-docker", timeoutMs: 2 * 60_000 },
  { id: "system-nvidia", timeoutMs: 2 * 60_000 },
  { id: "image-factory-workflow-discovery", timeoutMs: 2 * 60_000 },
  { id: "aider-adapter", timeoutMs: 5 * 60_000 },
  { id: "gpu-vllm-adapter", timeoutMs: 10 * 60_000 },
  { id: "representative-runtime", timeoutMs: 12 * 60_000 },
  { id: "vllm-multimodal-adapter", timeoutMs: 15 * 60_000 },
  { id: "comfyui-adapter", timeoutMs: 10 * 60_000 },
  { id: "image-factory-runtime", timeoutMs: 30 * 60_000 },
]

const TERMINAL_STATES = new Set([
  "completed",
  "failed",
  "cancelled",
  "timed_out",
  "resource_blocked",
])

async function readHealthchecks(
  request: APIRequestContext,
): Promise<HealthcheckItem[]> {
  const response = await request.get("/api/healthchecks")
  expect(response.ok(), await response.text()).toBeTruthy()
  return response.json() as Promise<HealthcheckItem[]>
}

async function waitForExecution(
  request: APIRequestContext,
  id: string,
  executionId: string,
  timeoutMs: number,
): Promise<HealthcheckLatest> {
  const deadline = Date.now() + timeoutMs
  let last: HealthcheckLatest = {}

  while (Date.now() < deadline) {
    const checks = await readHealthchecks(request)
    const item = checks.find((candidate) => candidate.id === id)
    if (!item) throw new Error(`healthcheck disappeared from catalog: ${id}`)

    const latest = item.latest ?? {}
    if (latest.execution_id === executionId) {
      last = latest
      if (latest.state && TERMINAL_STATES.has(latest.state)) return latest
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  throw new Error(
    `healthcheck ${id} timed out waiting for ${executionId}; ` +
      `last=${JSON.stringify(last)}`,
  )
}

async function openHealthcheckDashboard(page: Page): Promise<void> {
  await page.goto("/")
  await page.getByRole("link", { name: "Healthcheck", exact: true }).first().click()
  await expect(page).toHaveURL(/\/healthcheck(?:\?|$)/)
  await expect(page.getByRole("heading", { name: "Healthcheck", exact: true })).toBeVisible()
}

test.describe("real-host healthchecks from dashboard", () => {
  test.describe.configure({ mode: "serial" })

  test("dashboard E2E coverage matches the backend healthcheck catalog", async ({
    page,
    request,
  }) => {
    await openHealthcheckDashboard(page)

    const actual = (await readHealthchecks(request)).map((item) => item.id).sort()
    const covered = HEALTHCHECKS.map((item) => item.id).sort()
    const rendered = (
      await page.locator("[data-healthcheck-id]").evaluateAll((cards) =>
        cards
          .map((card) => card.getAttribute("data-healthcheck-id"))
          .filter((id): id is string => Boolean(id)),
      )
    ).sort()

    expect(actual).toEqual(covered)
    expect(rendered).toEqual(covered)
  })

  for (const healthcheck of HEALTHCHECKS) {
    test(`${healthcheck.id}: dashboard Run button completes the real healthcheck`, async ({
      page,
      request,
    }) => {
      test.setTimeout(healthcheck.timeoutMs + 60_000)
      await openHealthcheckDashboard(page)

      const card = page.locator(
        `[data-healthcheck-id="${healthcheck.id}"]`,
      )
      const item = (await readHealthchecks(request)).find(
        (candidate) => candidate.id === healthcheck.id,
      )
      if (!item) throw new Error(`healthcheck missing from catalog: ${healthcheck.id}`)
      await page.getByRole("button", { name: new RegExp(item.label, "i") }).click()
      await expect(card).toBeVisible()

      const runButton = page.getByTestId(
        `healthcheck-run-${healthcheck.id}`,
      )
      await expect(runButton).toBeEnabled()

      const runResponsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url())
        return (
          response.request().method() === "POST" &&
          url.pathname === `/api/healthchecks/${healthcheck.id}/run`
        )
      })

      await runButton.click()
      const runResponse = await runResponsePromise
      expect(runResponse.status()).toBe(202)

      const accepted = (await runResponse.json()) as {
        execution_id?: string
      }
      expect(accepted.execution_id).toBeTruthy()

      const latest = await waitForExecution(
        request,
        healthcheck.id,
        accepted.execution_id!,
        healthcheck.timeoutMs,
      )

      expect(
        latest.state,
        [
          `${healthcheck.id} did not pass from the dashboard.`,
          `error=${latest.error || "<none>"}`,
          `output_tail=${latest.output_tail || "<none>"}`,
        ].join("\n"),
      ).toBe("completed")

      await expect(
        page.getByTestId(`healthcheck-state-${healthcheck.id}`),
      ).toHaveText("completed", { timeout: 10_000 })

      await expect(card.getByRole("link", { name: "View log" })).toBeVisible()
    })
  }
})
