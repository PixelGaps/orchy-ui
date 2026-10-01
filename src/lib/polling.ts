import type {
Execution,
HealthcheckItem,
LogsPayload,
OverviewPayload,
} from "@/lib/contracts"

const ACTIVE_STATES = new Set([
  "running",
  "retrying",
  "cancelling",
  "externally_running",
])

export function isExecutionActive(
  execution: Execution | null | undefined,
): boolean {
  return Boolean(execution && ACTIVE_STATES.has(execution.state))
}

export function hasActiveExecutions(
  executions: Execution[] | null | undefined,
): boolean {
  return Boolean(executions?.some(isExecutionActive))
}

export function executionPollInterval(
  _executions: Execution[] | null | undefined,
): false {
  return false
}

export function healthcheckPollInterval(
  _items: HealthcheckItem[] | null | undefined,
): false {
  return false
}

export function overviewPollInterval(
  _payload: OverviewPayload | null | undefined,
): false {
  return false
}

export function logsPollInterval(
  _payload: LogsPayload | null | undefined,
): false {
  return false
}

export function runtimePollInterval(_active: boolean): false {
  return false
}
