import { defineConfig, devices } from "@playwright/test"

const chromiumExecutable = process.env.ORCHY_E2E_CHROMIUM
const requestedPort = Number(process.env.ORCHY_E2E_PORT || "4173")
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 4173
const baseURL = `http://127.0.0.1:${port}`
const isolatedServer = Boolean(process.env.ORCHY_E2E_PORT)

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 35 * 60 * 1000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-real-host",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumExecutable
          ? { executablePath: chromiumExecutable }
          : undefined,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !isolatedServer,
    timeout: 120_000,
  },
})
