import { describe, expect, it } from "vitest"

import type { Execution } from "./contracts"
import {
  executionPollInterval,
  hasActiveExecutions,
  healthcheckPollInterval,
  isExecutionActive,
  logsPollInterval,
  overviewPollInterval,
  runtimePollInterval,
} from "./polling"

function execution(state: string): Execution {
  return { state } as Execution
}

describe("polling policy", () => {
  it("recognizes every active execution state and rejects terminal/missing values", () => {
    for (const state of ["running", "retrying", "cancelling", "externally_running"]) {
      expect(isExecutionActive(execution(state))).toBe(true)
    }
    expect(isExecutionActive(execution("completed"))).toBe(false)
    expect(isExecutionActive(null)).toBe(false)
    expect(isExecutionActive(undefined)).toBe(false)
  })

  it("detects active collections safely", () => {
    expect(hasActiveExecutions([execution("completed"), execution("running")])).toBe(true)
    expect(hasActiveExecutions([execution("completed")])).toBe(false)
    expect(hasActiveExecutions(undefined)).toBe(false)
  })

  it("disables execution background polling", () => {
    expect(executionPollInterval([execution("running")])).toBe(false)
    expect(executionPollInterval([])).toBe(false)
  })

  it("disables healthcheck background polling", () => {
    expect(healthcheckPollInterval([{ latest: execution("retrying") } as never])).toBe(false)
    expect(healthcheckPollInterval(undefined)).toBe(false)
  })

  it("disables overview background polling", () => {
    expect(overviewPollInterval({ active_executions: [execution("running")] } as never)).toBe(false)
    expect(overviewPollInterval(undefined)).toBe(false)
  })

  it("disables logs background polling", () => {
    expect(logsPollInterval({
      executions: [execution("completed")],
      healthchecks: [execution("cancelling")],
    } as never)).toBe(false)
    expect(logsPollInterval(undefined)).toBe(false)
  })

  it("disables runtime background polling", () => {
    expect(runtimePollInterval(true)).toBe(false)
    expect(runtimePollInterval(false)).toBe(false)
  })
})
