import { defineConfig, devices } from "@playwright/test"

const baseURL = (process.env.ORCHY_LIVE_BASE_URL || "http://100.92.206.7:23236").replace(/\/$/, "")
const chromiumExecutable = process.env.ORCHY_E2E_CHROMIUM

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{
    name: "chromium-live-tailnet",
    use: {
      ...devices["Desktop Chrome"],
      launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : undefined,
    },
  }],
})
