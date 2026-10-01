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

  it("selects fast and idle execution intervals", () => {
    expect(executionPollInterval([execution("running")])).toBe(750)
    expect(executionPollInterval([])).toBe(5000)
  })

  it("selects healthcheck intervals from latest execution state", () => {
    expect(healthcheckPollInterval([{ latest: execution("retrying") } as never])).toBe(1000)
    expect(healthcheckPollInterval([{ latest: execution("completed") } as never])).toBe(5000)
    expect(healthcheckPollInterval(undefined)).toBe(5000)
  })

  it("selects overview intervals from backend active executions", () => {
    expect(overviewPollInterval({ active_executions: [execution("running")] } as never)).toBe(1500)
    expect(overviewPollInterval(undefined)).toBe(5000)
  })

  it("combines log execution and healthcheck activity", () => {
    expect(logsPollInterval({
      executions: [execution("completed")],
      healthchecks: [execution("cancelling")],
    } as never)).toBe(750)
    expect(logsPollInterval(undefined)).toBe(5000)
  })

  it("selects runtime active and idle intervals", () => {
    expect(runtimePollInterval(true)).toBe(2000)
    expect(runtimePollInterval(false)).toBe(10000)
  })
})
