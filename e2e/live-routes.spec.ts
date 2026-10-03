import { expect, test } from "@playwright/test"

const routes = [
  ["/", /Overview/i],
  ["/assurance", /Test Assurance/i],
  ["/issues", /Jira Issues/i],
  ["/missions", /Missions/i],
  ["/workbench", /Coding workspace/i],
  ["/queue", /^Queue$/i],
  ["/image-factory", /Image Factory/i],
  ["/llm", /LLM/i],
  ["/comfyui", /ComfyUI/i],
  ["/healthcheck", /Healthcheck/i],
  ["/logs", /Logs/i],
  ["/settings", /Global Settings/i],
] as const

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  for (const [path, heading] of routes) {
    test(`${viewport.name} ${path} renders against live Tailscale backend`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      const pageErrors: string[] = []
      const failedAssets: string[] = []
      page.on("pageerror", (error) => pageErrors.push(error.message))
      page.on("requestfailed", (request) => {
        const url = request.url()
        if (url.includes("/assets/") || url.endsWith(".js") || url.endsWith(".css")) {
          failedAssets.push(`${url}: ${request.failure()?.errorText || "failed"}`)
        }
      })

      const response = await page.goto(path, { waitUntil: "networkidle" })
      expect(response?.status(), `${path} document status`).toBeLessThan(400)
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible()
      await expect(page.locator("#orchy-main-content")).toBeVisible()
      expect(pageErrors, `${path} page errors`).toEqual([])
      expect(failedAssets, `${path} failed assets`).toEqual([])

      if (path === "/issues") {
        await expect(page.getByText("Jira unavailable")).toHaveCount(0)
        const jira = await page.request.get("/api/cloud-control/sources/jira")
        expect(jira.ok()).toBeTruthy()
        expect((await jira.json()).state).toBe("fresh")
      }
      if (path === "/queue") {
        const health = await page.request.get("/api/gateway/health")
        expect(health.ok()).toBeTruthy()
        const body = await health.json()
        expect(body.available).toBe(true)
        expect(body.status).toBe("live")
      }
    })
  }
}
