export type JiraProjection = {
  openCount: number
  byStatus: Record<string, number>
  issues: Array<{
    key: string
    summary: string
    status: string
    statusCategory: string
    priority: string | null
    type: string
    parentKey: string | null
    labels: string[]
    browseUrl: string
    updated: string | null
  }>
}

export type GitHubProjection = {
  repository: string
  defaultBranch: string
  headSha: string | null
  openWorkflowRuns: number
  recentRuns: Array<{
    id: number
    name: string
    status: string
    conclusion: string | null
    headSha: string
    htmlUrl: string
  }>
}

export type HostProjection = {
  hostId: string
  state: string
  lastSeenAt: string
  controlPlaneVersion: string | null
  sourceSha: string | null
  machineControlState: string | null
  machineControlLastSeenAt: string | null
}

export type TestOpsProjection = {
  target: string
  layers: Array<{
    layerId: string
    runId: string
    revision: string
    outcome: string
    finishedAt: string
    durationMs: number
    jiraMilestone: string | null
  }>
  findings: Array<{
    layerId: string
    category: string
    disposition: string
    findings: number
    distinctSignatures: number
    lastSeenAt: string
  }>
}

export type OperationProjection = {
  operations: Array<{
    id: string
    logicalKey: string
    targetSha: string
    operation: string
    state: string
    priority: number
    resources: string[]
    attempt: number
    executor: string | null
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
    error: string | null
  }>
}

export type FleetProjection = {
  providers: Array<{
    provider: string
    priority: number
    limitRunnerMinutes: number
    reservationRunnerMinutes: number
    remainingRunnerMinutes: number
    qualified: boolean
    status: string
    observedAt: string | null
    resetAt: string | null
    offlineUntil: string | null
    maxAgeSeconds: number
    metadata: Record<string, unknown>
  }>
}
