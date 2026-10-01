/**
 * Test documentation — executable specification.
 * Scope: browser -> Vite -> real FastAPI -> execution service -> PBR CLI -> real PBR QA/repair/package.
 * External boundary policy: only generation/source semantic QA/prompt-repair model calls use the
 * explicit deterministic replay session configured by the workflow.
 */

import { promises as fs } from "node:fs"

import { expect, test } from "@playwright/test"

test.describe.configure({ mode: "serial" })

let replayExecution: Record<string, any> | undefined
let replayGallery: Record<string, any> | undefined

function countArtifacts(groups: Record<string, Record<string, Array<unknown>>>): number {
  return Object.values(groups).reduce(
    (total, subgroups) =>
      total +
      Object.values(subgroups).reduce(
        (subtotal, artifacts) => subtotal + artifacts.length,
        0,
      ),
    0,
  )
}

function pbrLayerCount(groups: Record<string, Record<string, Array<unknown>>>): number {
  const layerNames = new Set(
    Object.entries(groups.pbr ?? {})
      .filter(([subcategory, artifacts]) => subcategory !== "source" && artifacts.length > 0)
      .map(([subcategory]) => subcategory),
  )
  return layerNames.size
}

test("PBR replay crosses the full hostless Web-to-package path", async ({ page }) => {
  await page.goto("/comfyui?tab=image-factory")

  await page.getByLabel("Production profile").selectOption("pbr")
  await page.getByLabel("Generation prompt").fill(
    "premium weathered limestone full-stack replay",
  )
  await page.getByRole("button", { name: "Start production" }).click()

  await expect(
    page.getByText("Production accepted. Live state is updating."),
  ).toBeVisible()

  let execution: Record<string, unknown> | undefined
  await expect
    .poll(
      async () => {
        const response = await page.request.get("/api/executions")
        const executions = (await response.json()) as Array<Record<string, any>>
        execution = executions.find(
          (item) =>
            item.kind === "image_factory" &&
            item.metadata?.profile === "pbr",
        )
        return {
          state: execution?.state,
          status: (execution?.result as Record<string, unknown> | undefined)
            ?.status,
        }
      },
      { timeout: 60_000 },
    )
    .toEqual({ state: "completed", status: "PASS" })

  replayExecution = execution
  const result = execution?.result as Record<string, any>
  expect(Object.keys(result.selected_maps ?? {})).toHaveLength(6)
  expect(result.family_qa?.decision).toBe("PASS")
  expect(result.package?.manifest).toBeTruthy()
  expect(result.package?.archive).toBeTruthy()

  const galleryResponse = await page.request.get(
    "/api/image-factory/gallery?profile=pbr",
  )
  expect(galleryResponse.ok()).toBeTruthy()
  const gallery = (await galleryResponse.json()) as Record<string, any>
  replayGallery = gallery

  expect(gallery.publish_ready).toHaveLength(1)
  expect(gallery.publish_ready[0].status).toBe("PUBLISH_READY")
  expect(gallery.publish_ready[0].member_count).toBe(7)
  expect(gallery.failed.pbr.roughness).toHaveLength(1)
  expect(gallery.failed.pbr.roughness[0].status).toBe("FAIL")
  expect(gallery.passed.pbr.roughness.some(
    (item: Record<string, unknown>) => item.selected === true,
  )).toBeTruthy()

  const mediaResponse = await page.request.get(
    gallery.passed.pbr.roughness.find(
      (item: Record<string, unknown>) => item.selected === true,
    ).media_url,
  )
  expect(mediaResponse.ok()).toBeTruthy()
  expect(mediaResponse.headers()["content-type"]).toContain("image/")

  await page.reload()
  await expect(page.getByText("PBR PACKAGE")).toBeVisible()
  await expect(page.getByText("ready", { exact: true })).toBeVisible()
  const pbrPanel = page.locator(".lineage-panel").filter({ hasText: "PBR PACKAGE" })
  await expect(
    pbrPanel.locator(".config-item").filter({ hasText: "selected maps" }).locator("strong"),
  ).toHaveText("6")

  const readySection = page.locator(".gallery-section-ready")
  const passedSection = page.locator(".gallery-section-passed")
  const failedSection = page.locator(".gallery-section-failed")
  await expect(readySection).toContainText("PUBLISH READY")
  await expect(readySection.locator(".gallery-pack-member")).toHaveCount(7)
  await expect(passedSection).toContainText("roughness")
  await expect(failedSection).toContainText("roughness")
  await expect(failedSection).toContainText("pbr_scalar_map_not_grayscale")

  const galleryImages = page.locator(".gallery-section img")
  expect(await galleryImages.count()).toBeGreaterThan(0)
  await expect(galleryImages.first()).toHaveAttribute("loading", "lazy")

  const missingMedia = await page.request.get(
    "/api/image-factory/media/does-not-exist",
  )
  expect(missingMedia.status()).toBe(404)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(async () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true)

  await page.route("**/api/image-factory/gallery**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schema: "orchy.image-factory-gallery.v1",
        updated_at: 0,
        summary: {
          publish_ready_packs: 0,
          passed_artifacts: 0,
          failed_artifacts: 0,
          passed_layers: 0,
          failed_layers: 0,
        },
        publish_ready: [],
        passed: {},
        failed: {},
      }),
    })
  })
  await page.reload()
  await expect(page.getByText("No passed artifacts yet")).toBeVisible()
  await expect(page.getByText("No failed artifacts")).toBeVisible()
  await expect(page.getByText("No publish-ready packs yet")).toBeVisible()

  await page.unroute("**/api/image-factory/gallery**")
  await page.route("**/api/image-factory/gallery**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ detail: "forced gallery failure" }),
    })
  })
  await page.reload()
  await expect(page.locator(".panel-error")).toBeVisible()
})

test("PBR repair lineage proves score improvement after a rejected layer", async () => {
  const result = replayExecution?.result as Record<string, any>
  expect(result).toBeTruthy()

  const attempts = result.maps.roughness[0].pipeline.attempts as Array<Record<string, any>>
  expect(attempts).toHaveLength(2)

  const rejected = attempts[0]
  const repaired = attempts[1]
  expect(rejected.decision).not.toBe("PASS")
  expect(repaired.decision).toBe("PASS")
  expect(repaired.score).toBeGreaterThan(rejected.score)
  expect(repaired.score_delta).toBeGreaterThan(0)
  expect(repaired.parent_image_id).toBe(rejected.image_id)
  expect(repaired.resolved_failures).toContain("pbr_scalar_map_not_grayscale")
  expect(repaired.new_failures ?? []).not.toContain("pbr_scalar_map_not_grayscale")
})

test("gallery counters equal backend artifact, pack and PBR-layer truth", async ({ page }) => {
  const gallery = replayGallery as Record<string, any>
  expect(gallery).toBeTruthy()

  const expected = {
    publish_ready_packs: gallery.publish_ready.length,
    passed_artifacts: countArtifacts(gallery.passed),
    failed_artifacts: countArtifacts(gallery.failed),
    passed_layers: pbrLayerCount(gallery.passed),
    failed_layers: pbrLayerCount(gallery.failed),
  }
  expect(gallery.summary).toEqual(expected)
  expect(expected).toEqual({
    publish_ready_packs: 1,
    passed_artifacts: 7,
    failed_artifacts: 1,
    passed_layers: 6,
    failed_layers: 1,
  })

  await page.goto("/comfyui?tab=image-factory")
  await expect(page.getByTestId("gallery-count-packs")).toHaveText("1")
  await expect(page.getByTestId("gallery-count-passed")).toHaveText("7")
  await expect(page.getByTestId("gallery-count-failed")).toHaveText("1")
  await expect(page.getByTestId("gallery-count-layers-passed")).toHaveText("6")
  await expect(page.getByTestId("gallery-count-layers-failed")).toHaveText("1")
})

test("gallery previews render in the correct ready, passed and failed sections", async ({ page }) => {
  const gallery = replayGallery as Record<string, any>
  expect(gallery).toBeTruthy()
  await page.goto("/comfyui?tab=image-factory")

  const readySection = page.locator(".gallery-section-ready")
  for (const artifact of gallery.publish_ready[0].members as Array<Record<string, any>>) {
    const preview = readySection.getByTestId(`gallery-pack-preview-${artifact.id}`)
    await expect(preview).toHaveAttribute("src", artifact.media_url)
  }

  const passedSection = page.locator(".gallery-section-passed")
  for (const subgroups of Object.values(gallery.passed) as Array<Record<string, Array<Record<string, any>>>>) {
    for (const artifacts of Object.values(subgroups)) {
      for (const artifact of artifacts) {
        const preview = passedSection.getByTestId(`gallery-preview-passed-${artifact.id}`)
        await expect(preview).toHaveAttribute("src", artifact.media_url)
      }
    }
  }

  const failedSection = page.locator(".gallery-section-failed")
  for (const subgroups of Object.values(gallery.failed) as Array<Record<string, Array<Record<string, any>>>>) {
    for (const artifacts of Object.values(subgroups)) {
      for (const artifact of artifacts) {
        const preview = failedSection.getByTestId(`gallery-preview-failed-${artifact.id}`)
        await expect(preview).toHaveAttribute("src", artifact.media_url)
      }
    }
  }
})


test("PBR replay terminal provider failure is observable through the real execution path", async ({ page }) => {
  const sessionPath = process.env.IMAGE_FACTORY_REPLAY_SESSION
  expect(sessionPath).toBeTruthy()
  const original = await fs.readFile(sessionPath!, "utf-8")
  const session = JSON.parse(original) as Record<string, any>
  session.generation.source = [
    {
      error: "provider",
      message: "forced full-stack terminal provider failure",
    },
  ]

  await fs.writeFile(sessionPath!, JSON.stringify(session, null, 2), "utf-8")
  try {
    await page.goto("/comfyui?tab=image-factory")
    await page.getByLabel("Production profile").selectOption("pbr")
    const prompt = "terminal provider failure fixture"
    await page.getByLabel("Generation prompt").fill(prompt)
    await page.getByRole("button", { name: "Start production" }).click()

    await expect(
      page.getByText("Production accepted. Live state is updating."),
    ).toBeVisible()

    let execution: Record<string, any> | undefined
    await expect
      .poll(
        async () => {
          const response = await page.request.get("/api/executions")
          const executions = (await response.json()) as Array<Record<string, any>>
          execution = executions.find(
            (item) =>
              item.kind === "image_factory" &&
              item.metadata?.profile === "pbr" &&
              String(item.task ?? "").includes(prompt),
          )
          return {
            state: execution?.state,
            status: execution?.result?.status,
          }
        },
        { timeout: 60_000 },
      )
      .toEqual({ state: "completed", status: "SOURCE_FAILED" })

    expect(execution?.result?.passed).toBe(false)
    expect(execution?.result?.package).toBeNull()
    expect(execution?.result?.source?.status).toBe("ERROR")
    expect(execution?.result?.source?.error).toContain(
      "forced full-stack terminal provider failure",
    )
  } finally {
    await fs.writeFile(sessionPath!, original, "utf-8")
  }
})
