/**
 * Test documentation — executable specification.
 * Scope: hostless Mission Board truth/interaction fixtures.
 * Production under test: Overview Mission Board rendering, filters, typed summaries and actions.
 * External boundary policy: deterministic API fixtures only; no live host/GPU/model work.
 */

import { expect, test, type Page } from "@playwright/test"

type MockOptions = {
  failLaunch?: boolean
  failRerun?: boolean
}

function run(
  execution_id: string,
  {
    terminal = true,
    successful = true,
    elapsed_ms = 120_000,
    passed_steps = 2,
    failed_steps = 0,
    state = terminal ? "completed" : "externally_running",
  }: {
    terminal?: boolean
    successful?: boolean | null
    elapsed_ms?: number
    passed_steps?: number
    failed_steps?: number
    state?: string
  } = {},
) {
  return {
    execution_id,
    state,
    terminal,
    successful: terminal ? successful : null,
    phase: terminal ? "terminal" : "detached",
    activity: state,
    target: "abcdef123456",
    started_at: 1_780_000_000,
    updated_at: 1_780_000_100,
    elapsed_ms,
    error: successful === false ? "fixture failure" : "",
    test_count: passed_steps + failed_steps,
    passed_steps,
    failed_steps,
    running_steps: terminal ? 0 : 1,
    pending_steps: 0,
    steps: [
      {
        id: "one",
        label: "Generate",
        status: terminal ? (successful ? "PASS" : "FAIL") : "RUNNING",
        elapsed_ms,
        error: "",
        log: "",
      },
    ],
    result_summary: {
      adapter_id: "generic",
      kind: "generic",
      available: terminal,
      status: successful === false ? "FAIL" : terminal ? "PASS" : "RUNNING",
      successful: terminal ? successful : null,
      elapsed_ms,
      step_total: passed_steps + failed_steps,
      passed_steps,
      failed_steps,
      evidence_available: terminal,
    },
  }
}

function mission(
  key: string,
  label: string,
  {
    state,
    tier,
    missionClass = "required",
    family = "image-factory",
    summary = null,
    launchable = false,
  }: {
    state: "NEW" | "LIVE" | "CLEARED" | "FAILED" | "STALE"
    tier: "QUICK" | "STANDARD" | "LONG" | "EPIC" | "MARATHON"
    missionClass?: "required" | "exploratory"
    family?: string
    summary?: Record<string, unknown> | null
    launchable?: boolean
  },
) {
  const isNew = state === "NEW"
  const isLive = state === "LIVE"
  const isFailed = state === "FAILED"
  const stale = state === "STALE"
  const terminal = !isNew && !isLive
  const latest = terminal
    ? {
        ...run(`${key}-terminal`, {
          successful: !isFailed,
          elapsed_ms:
            tier === "QUICK" ? 120_000 :
            tier === "STANDARD" ? 600_000 :
            tier === "LONG" ? 1_200_000 :
            tier === "EPIC" ? 2_400_000 : 4_800_000,
          failed_steps: isFailed ? 1 : 0,
          passed_steps: isFailed ? 1 : 2,
        }),
        result_summary: summary ?? run("x").result_summary,
      }
    : null
  const active = isLive
    ? run(`${key}-active`, {
        terminal: false,
        successful: null,
        elapsed_ms: 400_000,
        passed_steps: 1,
        failed_steps: 0,
      })
    : null

  return {
    key,
    label,
    class: missionClass,
    registered: true,
    family,
    description: `${label} deterministic fixture`,
    icon_token: "activity",
    tags: [family],
    resource_class: "cpu_only",
    launch: launchable
      ? {
          kind: "fixture-launch",
          first_launch_supported: true,
          parameters: [],
          fixed_parameters: {},
        }
      : null,
    default_expected_duration_ms: 300_000,
    output_summary_adapter_id: "generic",
    evidence_route: "/logs?tab=executions&execution={execution_id}",
    output_route: family === "image-factory" ? "/image-factory" : "/logs",
    never_run: isNew,
    run_count: isNew ? 0 : isLive ? 2 : 3,
    terminal_count: isNew ? 0 : isLive ? 1 : 3,
    clear_count: isNew || isFailed ? 0 : 2,
    failure_count: isFailed ? 1 : 0,
    first_run_at: isNew ? null : 1_779_999_000,
    last_run_at: isNew ? null : 1_780_000_100,
    last_clear_at: isNew || isFailed ? null : 1_780_000_100,
    success_streak: isNew || isFailed ? 0 : 2,
    best_elapsed_ms: latest?.elapsed_ms ?? null,
    latest_clear_target: stale ? "oldsha" : "abcdef123456",
    current_target: "abcdef123456",
    latest_clear_stale: stale,
    statistics_scope: "retained_execution_window",
    runtime_estimate: {
      estimate_ms:
        tier === "QUICK" ? 120_000 :
        tier === "STANDARD" ? 600_000 :
        tier === "LONG" ? 1_200_000 :
        tier === "EPIC" ? 2_400_000 : 4_800_000,
      tier,
      source: terminal ? "successful_median" : "catalog_default",
      observation_count: terminal ? 3 : 0,
      confidence: terminal ? "medium" : "default",
      display_hint: "fixture runtime estimate",
    },
    recent_history: latest ? [latest] : active ? [active] : [],
    history_limit: 10,
    history_truncated: false,
    active,
    latest,
    output_summary: summary,
    can_rerun: terminal,
    rerun_execution_id: latest?.execution_id ?? null,
  }
}

const PBR_SUMMARY = {
  adapter_id: "pbr-qualification",
  kind: "pbr_qualification",
  available: true,
  status: "PASS",
  package_id: "pbr-pack",
  publish_ready: true,
  passed_layers: 6,
  failed_layers: 0,
  family_qa: "PASS",
  repair_clear: true,
  repair_score_delta: 0.1,
  manifest_available: true,
  archive_available: true,
  preview_count: 2,
  evidence_available: true,
}

const ICON_SUMMARY = {
  adapter_id: "icon-qualification",
  kind: "icon_qualification",
  available: true,
  status: "PASS",
  package_id: "icon-pack",
  item_count: 12,
  pack_qa: "PASS",
  gallery_cataloged: true,
  manifest_available: true,
  archive_available: true,
  evidence_available: true,
}

function missionPayload() {
  const required = [
    mission("new-quick", "New Quick Mission", {
      state: "NEW",
      tier: "QUICK",
      launchable: true,
    }),
    mission("icon-cleared", "Cleared Icon Mission", {
      state: "CLEARED",
      tier: "LONG",
      summary: ICON_SUMMARY,
    }),
    mission("pbr-stale", "Stale PBR Mission", {
      state: "STALE",
      tier: "MARATHON",
      summary: PBR_SUMMARY,
    }),
  ]
  const exploratory = [
    mission("research-live", "Live Research Mission", {
      state: "LIVE",
      tier: "STANDARD",
      missionClass: "exploratory",
      family: "research",
    }),
    mission("research-failed", "Failed Research Mission", {
      state: "FAILED",
      tier: "EPIC",
      missionClass: "exploratory",
      family: "research",
    }),
  ]

  return {
    schema: "orchy.mission-overview.v1",
    required_health: {
      status: "unknown",
      total: required.length,
      green: 1,
      failed: 0,
      running: 0,
    },
    required,
    exploratory,
  }
}

async function mockApi(page: Page, options: MockOptions = {}) {
  await page.route("**/api/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (request.method() === "POST" && path.includes("/api/missions/catalog/")) {
      if (options.failLaunch) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ detail: "fixture launch rejected" }),
        })
        return
      }
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          status: "accepted",
          mission_id: "launched-1",
          execution_id: "launched-1",
        }),
      })
      return
    }

    if (request.method() === "POST" && path.endsWith("/rerun")) {
      if (options.failRerun) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ detail: "fixture rerun rejected" }),
        })
        return
      }
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          status: "accepted",
          mission_id: "rerun-1",
          execution_id: "rerun-1",
        }),
      })
      return
    }

    let body: unknown = {}
    if (path === "/api/executions") body = []
    else if (path === "/api/telemetry") {
      body = {
        timestamp: 1_780_000_000,
        cpu: { load1: 0, load5: 0, load15: 0 },
        ram: { used_gb: 0, total_gb: 1, available_gb: 1 },
        disk: { used_gb: 0, total_gb: 1, free_gb: 1 },
        gpu: {
          utilization_pct: 0,
          temperature_c: 30,
          vram_used_mib: 0,
          vram_total_mib: 16_384,
        },
      }
    } else if (path === "/api/operator/overview") {
      body = {
        health: { status: "ok", components: {} },
        active_executions: [],
        healthchecks: {},
        missions: missionPayload(),
        quotas: [],
      }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

function card(page: Page, label: string) {
  return page.locator(".mission-card").filter({ hasText: label })
}

test("Mission Board renders all evidence-derived states and difficulty tiers", async ({ page }) => {
  await mockApi(page)
  await page.goto("/?section=missions")

  const expectations = [
    ["New Quick Mission", "NEW", "QUICK"],
    ["Live Research Mission", "LIVE", "STANDARD"],
    ["Cleared Icon Mission", "CLEARED", "LONG"],
    ["Failed Campaign Mission", "FAILED", "EPIC"],
    ["Stale PBR Mission", "STALE", "MARATHON"],
  ] as const

  for (const [label, state, tier] of expectations) {
    const value = card(page, label)
    await expect(value).toBeVisible()
    await expect(value).toContainText(state)
    await expect(value).toContainText(tier)
  }
})

test("Mission Board renders typed PBR icon and campaign outputs without raw JSON guessing", async ({ page }) => {
  await mockApi(page)
  await page.goto("/?section=missions")

  await expect(card(page, "Stale PBR Mission")).toContainText("pbr-pack")
  await expect(card(page, "Stale PBR Mission")).toContainText("6 pass / 0 fail")
  await expect(card(page, "Stale PBR Mission")).toContainText("Repair Clear")

  await expect(card(page, "Cleared Icon Mission")).toContainText("icon-pack")
  await expect(card(page, "Cleared Icon Mission")).toContainText("12")
  await expect(card(page, "Cleared Icon Mission")).toContainText("retained")

  await expect(card(page, "Failed Research Mission")).toContainText("Status")
  await expect(card(page, "Failed Research Mission")).toContainText("Failed")
})

test("Mission Board filters status family class and difficulty", async ({ page }) => {
  await mockApi(page)
  await page.goto("/?section=missions")

  await page.getByLabel("Filter Missions by status").selectOption("STALE")
  await expect(card(page, "Stale PBR Mission")).toBeVisible()
  await expect(card(page, "Cleared Icon Mission")).toHaveCount(0)

  await page.getByLabel("Filter Missions by status").selectOption("ALL")
  await page.getByLabel("Filter Missions by family").selectOption("research")
  await expect(card(page, "Live Research Mission")).toBeVisible()
  await expect(card(page, "New Quick Mission")).toHaveCount(0)

  await page.getByLabel("Filter Missions by family").selectOption("ALL")
  await page.getByLabel("Filter Missions by difficulty").selectOption("QUICK")
  await expect(card(page, "New Quick Mission")).toBeVisible()
  await expect(card(page, "Stale PBR Mission")).toHaveCount(0)
})

test("Mission Launcher separates Required and Exploratory catalog choices", async ({ page }) => {
  await mockApi(page)
  await page.goto("/?section=missions")

  const required = page.getByLabel("Select Required Missions Mission")
  const exploratory = page.getByLabel("Select Exploratory Missions Mission")
  await expect(required).toBeVisible()
  await expect(exploratory).toBeVisible()
  await expect(required.locator('option[value="new-quick"]')).toHaveCount(1)
  await expect(required.locator('option[value="campaign-live"]')).toHaveCount(0)
  await expect(exploratory.locator('option[value="campaign-live"]')).toHaveCount(0)
  await expect(page.getByText("Only typed catalog Missions are available; arbitrary commands are not accepted.")).toHaveCount(2)

  await required.selectOption("new-quick")
  await page.getByRole("button", { name: "Launch Mission" }).first().click()
  await expect.poll(async () => page.locator(".mission-card").count()).toBeGreaterThan(0)
})

test("Mission cards keep primary actions visible and disclose retained history on demand", async ({ page }) => {
  await mockApi(page)
  await page.goto("/?section=missions")

  const value = card(page, "Cleared Icon Mission")
  await expect(value.getByRole("button", { name: /Evidence & history/ })).toHaveAttribute("aria-expanded", "false")
  await expect(value.getByRole("button", { name: "Rerun" })).toBeVisible()

  await value.getByRole("button", { name: /Evidence & history/ }).click()
  await expect(value.getByRole("button", { name: /Evidence & history/ })).toHaveAttribute("aria-expanded", "true")
  await expect(value).toContainText("Last clear")
  await expect(value).toContainText("icon-pack")
})

test("Mission Board surfaces launch and rerun admission errors", async ({ page }) => {
  await mockApi(page, { failLaunch: true, failRerun: true })
  await page.goto("/?section=missions")

  const newCard = card(page, "New Quick Mission")
  await newCard.getByRole("button", { name: "Launch" }).click()
  await expect(newCard.getByRole("alert")).toContainText("fixture launch rejected")

  const clearedCard = card(page, "Cleared Icon Mission")
  await clearedCard.getByRole("button", { name: "Rerun" }).click()
  await expect(clearedCard.getByRole("alert")).toContainText("fixture rerun rejected")
})
