/**
 * Test documentation — executable specification.
 * Scope: hostless Deep Research operator product flow.
 * Production under test: Deep Research page and typed API contract.
 * External boundary policy: model/web responses are deterministic browser intercepts.
 */

import { expect, test } from "@playwright/test"


test("Deep Research submits bounded mission and renders sources", async ({ page }) => {
  let requestBody: Record<string, unknown> = {}

  await page.route("**/api/deep-research/runtime", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ready: true,
        provider: "vllm",
        model: "deep-research",
        capabilities: ["text", "structured_output", "streaming"],
        model_present: true,
      }),
    })
  })
  await page.route("**/api/deep-research/run", async (route) => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        question: "Compare local reasoning models",
        model: "deep-research",
        queries: ["local reasoning model benchmark", "small reasoning models"],
        evidence_count: 2,
        ranking_mode: "lexical_fallback",
        answer: "A grounded answer [S1] [S2]",
        sources: [
          {
            id: "S1",
            title: "Source one",
            url: "https://example.com/one",
            query: "local reasoning model benchmark",
          },
          {
            id: "S2",
            title: "Source two",
            url: "https://example.com/two",
            query: "small reasoning models",
          },
        ],
        usage: {},
        reasoning_tokens: 10,
      }),
    })
  })

  await page.goto("/deep-research")
  await expect(
    page.getByRole("heading", { name: "Deep Research", exact: true }),
  ).toBeVisible()

  await page
    .getByPlaceholder("Compare the strongest evidence for…")
    .fill("Compare local reasoning models")
  await page.getByRole("button", { name: /Research budget/ }).click()
  await page.getByLabel("Search queries").fill("2")
  await page.getByLabel("Evidence sources").fill("4")
  await page.getByRole("button", { name: "Run Deep Research" }).click()

  await expect(page.getByText("A grounded answer [S1] [S2]")).toBeVisible()
  await page.getByRole("button", { name: /Evidence lineage/ }).click()
  await expect(
    page.getByRole("link", { name: /S1 · Source one/ }),
  ).toHaveAttribute("href", "https://example.com/one")
  expect(requestBody).toEqual({
    question: "Compare local reasoning models",
    max_queries: 2,
    max_sources: 4,
  })
})


test("Deep Research exposes its dedicated settings section", async ({ page }) => {
  await page.route("**/api/deep-research/runtime", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ready: false,
        model: "deep-research",
        model_present: true,
      }),
    })
  })

  await page.route("**/api/configuration/deep_research", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        section: "deep_research",
        fields: [
          {
            name: "max_sources",
            value: 6,
            type: "int",
            choices: [],
            restart_required: false,
            secret: false,
            description: "Maximum fetched evidence sources per research mission.",
          },
        ],
      }),
    })
  })

  await page.goto("/deep-research?tab=settings")

  await expect(page.getByText("DEEP_RESEARCH configuration")).toBeVisible()
  await expect(
    page.getByText("Maximum fetched evidence sources per research mission."),
  ).toBeVisible()
})
