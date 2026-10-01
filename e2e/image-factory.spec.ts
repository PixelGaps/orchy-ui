/**
 * Test documentation — executable specification.
 * Scope: hostless browser-to-HTTP contract for every Image Factory production profile.
 * Production under test: ComfyUI/Image Factory React form, typed postApi contract and payload shaping.
 * External boundary policy: requests are intercepted at HTTP; generation/model/runtime behavior is
 * covered by Python profile tests and real-host runtime certification.
 */

import { expect, test, type Page } from "@playwright/test"

type Captured = {
  payloads: Array<Record<string, unknown>>
}

async function mockImageFactoryApi(page: Page, captured: Captured): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (request.method() === "POST" && path === "/api/image-factory/run") {
      captured.payloads.push(request.postDataJSON() as Record<string, unknown>)
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          status: "accepted",
          execution_id: `exec-${captured.payloads.length}`,
          job_id: `job-${captured.payloads.length}`,
        }),
      })
      return
    }

    let body: unknown = {}
    if (path === "/api/executions") body = []
    else if (path === "/api/image-factory/lineage") {
      body = { path: "", candidates: [] }
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
    } else if (path === "/api/configuration/comfyui") {
      body = { section: "comfyui", fields: [] }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

test("Image Factory production defaults to PBR and guards manual Generic", async ({ page }) => {
  const captured: Captured = { payloads: [] }
  await mockImageFactoryApi(page, captured)
  await page.goto("/comfyui?tab=image-factory")

  await expect(page.getByLabel("Production profile")).toHaveValue("pbr")

  await page.getByLabel("Production profile").selectOption("generic")
  await page.getByLabel("Generation prompt").fill("manual generic")
  await expect(page.getByRole("button", { name: "Start production" })).toBeDisabled()
  await expect(page.getByText("Generic requires an explicit ComfyUI workflow.")).toBeVisible()

  await page.getByLabel("ComfyUI API workflow").fill("/tmp/workflow.json")
  await expect(page.getByRole("button", { name: "Start production" })).toBeEnabled()
})

const CASES = [
  ["generic", undefined],
  ["pbr", "pbr-material"],
  ["isolated_objects", "galvanized-fasteners"],
  ["seamless_patterns", "ornamental-stone-patterns"],
  ["icon_pack", "game-assets"],
  ["sticker_pack", "game-assets"],
  ["vfx_atlas", "game-assets"],
] as const

for (const [profile, specId] of CASES) {
  test(`Image Factory browser launch contract: ${profile}`, async ({ page }) => {
    const captured: Captured = { payloads: [] }
    await mockImageFactoryApi(page, captured)
    await page.goto("/comfyui?tab=image-factory")

    await page.getByLabel("Production profile").selectOption(profile)
    await page.getByLabel("Generation prompt").fill(`contract test ${profile}`)

    if (profile === "generic") {
      await page.getByLabel("ComfyUI API workflow").fill("/tmp/workflow.json")
    }

    const requestPromise = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return (
        request.method() === "POST" &&
        url.pathname === "/api/image-factory/run"
      )
    })
    await page.getByRole("button", { name: "Start production" }).click()
    await requestPromise

    await expect.poll(() => captured.payloads.length).toBe(1)
    const payload = captured.payloads[0]
    expect(payload.profile).toBe(profile)
    expect(payload.prompt).toBe(`contract test ${profile}`)

    if (specId) {
      expect(payload.profile_spec).toMatchObject({ id: specId })
      expect(payload.batch_size).toBeUndefined()
      expect(payload.required_passes).toBeUndefined()
      expect(payload.candidate_budget).toBeUndefined()
      expect(payload.qa_threshold).toBeUndefined()
      expect(payload.max_attempts).toBeUndefined()
    } else {
      expect(payload.profile_spec).toBeUndefined()
      expect(payload.batch_size).toBe(2)
      expect(payload.required_passes).toBe(2)
      expect(payload.candidate_budget).toBe(4)
      expect(payload.qa_threshold).toBe(0.95)
      expect(payload.max_attempts).toBe(4)
    }

    await expect(
      page.getByText("Production accepted. Live state is updating."),
    ).toBeVisible()
  })
}
