import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  cancel: vi.fn().mockResolvedValue({ ok: true, state: "cancelled" }),
  fetchPreferences: vi.fn().mockResolvedValue({
    persistence: "browser",
    preferences: {
      historyLimit: 30,
      denseOperations: false,
      defaultFleetView: "eligible",
    },
  }),
  updatePreferences: vi.fn().mockImplementation(async (value) => value),
  resetPreferences: vi.fn().mockResolvedValue({
    historyLimit: 30,
    denseOperations: false,
    defaultFleetView: "eligible",
  }),
}))

vi.mock("@/cloud/client", () => ({
  cancelCloudOperation: mocks.cancel,
  fetchOperatorPreferences: mocks.fetchPreferences,
  resetOperatorPreferences: mocks.resetPreferences,
  updateOperatorPreferences: mocks.updatePreferences,
  sourceAgeLabel: () => "5s old",
  sourceTone: () => "live",
  useRefreshCloudSources: () => ({ isPending: false, mutate: vi.fn() }),
  useCloudSource: (source: string) => {
    if (source === "operations") {
      return {
        data: {
          state: "fresh",
          payload: {
            operations: [
              {
                id: "123e4567-e89b-42d3-a456-426614174000",
                logicalKey: "mission:gpu",
                targetSha: "a".repeat(40),
                operation: "mission.run",
                state: "running",
                priority: 10,
                resources: ["gpu"],
                attempt: 1,
                executor: null,
                createdAt: "2026-09-30T00:00:00Z",
                startedAt: null,
                finishedAt: null,
                error: null,
              },
            ],
          },
        },
      }
    }
    if (source === "fleet") {
      return {
        data: {
          state: "fresh",
          payload: {
            providers: [
              {
                provider: "blacksmith",
                priority: 1,
                limitRunnerMinutes: 3000,
                reservationRunnerMinutes: 6,
                remainingRunnerMinutes: 49,
                qualified: true,
                status: "online",
                observedAt: "2026-09-30T00:00:00Z",
                resetAt: null,
                offlineUntil: null,
                maxAgeSeconds: 604800,
                metadata: {},
              },
            ],
          },
        },
      }
    }
    return {
      data: {
        state: "fresh",
        payload: {
          hostId: "host-01",
          state: "OFFLINE",
          lastSeenAt: "2026-09-30T00:00:00Z",
          controlPlaneVersion: "execution-v2.1",
          sourceSha: "abc",
          machineControlState: "OFFLINE",
          machineControlLastSeenAt: "2026-09-30T00:00:00Z",
        },
      },
    }
  },
}))

vi.mock("@/components/ui/primitives", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/primitives")>()
  return {
    ...actual,
    notifyOperator: vi.fn(),
  }
})

import { MissionsPage } from "./page"

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MissionsPage />
    </QueryClientProvider>,
  )
}

describe("MissionsPage", () => {
  it("fails host-bound actions closed while preserving cloud state", async () => {
    renderPage()
    expect(await screen.findByText("Execution host offline")).toBeInTheDocument()
    expect(screen.getByText("GPU capability")).toBeInTheDocument()
    expect(screen.getByText("Model runtimes")).toBeInTheDocument()
    expect(screen.getAllByText("offline").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText("blacksmith")).toBeInTheDocument()
    const row = screen.getByText("mission.run").closest(".data-row")
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByRole("button", { name: /Cancel/ })).toBeDisabled()
  })

  it("applies validated slider switch and select preferences", async () => {
    renderPage()
    await screen.findByText("Cloud Control preferences")

    fireEvent.change(screen.getByLabelText("Mission history"), {
      target: { value: "60" },
    })
    fireEvent.click(screen.getByRole("switch", { name: "Dense mission rows" }))
    fireEvent.change(screen.getByLabelText("Fleet view"), {
      target: { value: "all" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply preferences" }))

    await waitFor(() =>
      expect(mocks.updatePreferences).toHaveBeenCalledWith({
        historyLimit: 60,
        denseOperations: true,
        defaultFleetView: "all",
      }),
    )
  })
})
