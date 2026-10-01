/**
 * Test documentation — executable specification.
 * Scope: real-host Image Factory gallery counters and preview placement after one production PBR batch.
 * Production under test: React gallery projection backed by the real FastAPI gallery/media endpoints.
 * External boundary policy: this spec never launches generation; the manual production workflow owns the single real-model batch.
 */
import { expect, test } from "@playwright/test"

const live = process.env.IMAGE_FACTORY_LIVE_E2E === "1"
test.skip(!live, "real-host Image Factory evidence lane only")

function countArtifacts(groups: Record<string, Record<string, Array<unknown>>>): number {
  return Object.values(groups).reduce(
    (total, subgroups) =>
      total + Object.values(subgroups).reduce(
        (subtotal, artifacts) => subtotal + artifacts.length,
        0,
      ),
    0,
  )
}

function layerCount(groups: Record<string, Record<string, Array<unknown>>>): number {
  const roles = new Set(
    Object.entries(groups.pbr ?? {})
      .filter(([role, artifacts]) => role !== "source" && artifacts.length > 0)
      .map(([role]) => role),
  )
  return roles.size
}

test("live gallery counters and previews match backend evidence", async ({ page }) => {
  await page.goto("/comfyui?tab=image-factory")

  const response = await page.request.get("/api/image-factory/gallery?profile=pbr")
  expect(response.ok()).toBeTruthy()
  const gallery = (await response.json()) as Record<string, any>
  const expected = {
    publish_ready_packs: gallery.publish_ready.length,
    passed_artifacts: countArtifacts(gallery.passed),
    failed_artifacts: countArtifacts(gallery.failed),
    passed_layers: layerCount(gallery.passed),
    failed_layers: layerCount(gallery.failed),
  }
  expect(gallery.summary).toEqual(expected)

  await expect(page.getByTestId("gallery-count-packs")).toHaveText(
    String(expected.publish_ready_packs),
  )
  await expect(page.getByTestId("gallery-count-passed")).toHaveText(
    String(expected.passed_artifacts),
  )
  await expect(page.getByTestId("gallery-count-failed")).toHaveText(
    String(expected.failed_artifacts),
  )
  await expect(page.getByTestId("gallery-count-layers-passed")).toHaveText(
    String(expected.passed_layers),
  )
  await expect(page.getByTestId("gallery-count-layers-failed")).toHaveText(
    String(expected.failed_layers),
  )

  const latestPack = gallery.publish_ready[0]
  expect(latestPack).toBeTruthy()
  const readySection = page.locator(".gallery-section-ready")
  for (const artifact of latestPack.members as Array<Record<string, any>>) {
    await expect(
      readySection.getByTestId(`gallery-pack-preview-${artifact.id}`),
    ).toHaveAttribute("src", artifact.media_url)
  }
  const passedSection = page.locator(".gallery-section-passed")
  for (const subgroups of Object.values(gallery.passed) as Array<
    Record<string, Array<Record<string, any>>>
  >) {
    for (const artifacts of Object.values(subgroups)) {
      for (const artifact of artifacts) {
        await expect(
          passedSection.getByTestId(`gallery-preview-passed-${artifact.id}`),
        ).toHaveAttribute("src", artifact.media_url)
      }
    }
  }

  const failedSection = page.locator(".gallery-section-failed")
  for (const subgroups of Object.values(gallery.failed) as Array<
    Record<string, Array<Record<string, any>>>
  >) {
    for (const artifacts of Object.values(subgroups)) {
      for (const artifact of artifacts) {
        await expect(
          failedSection.getByTestId(`gallery-preview-failed-${artifact.id}`),
        ).toHaveAttribute("src", artifact.media_url)
      }
    }
  }
})
