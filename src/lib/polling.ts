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
  executions: Execution[] | null | undefined,
): number {
  return hasActiveExecutions(executions) ? 750 : 5000
}

export function healthcheckPollInterval(
  items: HealthcheckItem[] | null | undefined,
): number {
  return items?.some((item) => isExecutionActive(item.latest))
    ? 1000
    : 5000
}

export function overviewPollInterval(
  payload: OverviewPayload | null | undefined,
): number {
  return hasActiveExecutions(payload?.active_executions) ? 1500 : 5000
}

export function logsPollInterval(
  payload: LogsPayload | null | undefined,
): number {
  return executionPollInterval([
    ...(payload?.executions ?? []),
    ...(payload?.healthchecks ?? []),
  ])
}

export function runtimePollInterval(active: boolean): number {
  return active ? 2000 : 10000
}
