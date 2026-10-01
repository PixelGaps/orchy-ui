import type { CloudControlEnv } from "./security"
import {
  SourceAdapterError,
  type SourceAdapter,
} from "./read-model"

type JsonObject = Record<string, unknown>

function required(value: string | undefined, code: string): string {
  const normalized = value?.trim()
  if (!normalized) throw new SourceAdapterError(code)
  return normalized
}

function httpsUrl(value: string, code: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SourceAdapterError(code)
  }
  if (url.protocol !== "https:") throw new SourceAdapterError(code)
  return url
}

async function jsonFetch(
  fetcher: typeof fetch,
  input: string | URL,
  init: RequestInit,
  errorCode: string,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(input, init)
  } catch {
    throw new SourceAdapterError(errorCode)
  }
  if (!response.ok) throw new SourceAdapterError(errorCode)
  try {
    return await response.json()
  } catch {
    throw new SourceAdapterError(errorCode)
  }
}

function asObject(value: unknown, code: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SourceAdapterError(code)
  }
  return value as JsonObject
}

function countBy<T>(
  values: T[],
  key: (value: T) => string,
): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    const bucket = key(value)
    acc[bucket] = (acc[bucket] ?? 0) + 1
    return acc
  }, {})
}

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

export const jiraAdapter: SourceAdapter<JiraProjection, CloudControlEnv> = {
  source: "jira",
  authority: "Jira OR work state",
  maxAgeSeconds: 300,
  async load(env, fetcher) {
    const baseUrl = httpsUrl(
      required(env.JIRA_BASE_URL, "JIRA_BASE_URL_MISSING"),
      "JIRA_BASE_URL_INVALID",
    )
    const email = required(env.JIRA_EMAIL, "JIRA_EMAIL_MISSING")
    const token = required(env.JIRA_API_TOKEN, "JIRA_API_TOKEN_MISSING")
    const url = new URL("/rest/api/3/search/jql", baseUrl)
    url.searchParams.set(
      "jql",
      'project = "OR" AND (statusCategory != Done OR key in (OR-590,OR-594,OR-598,OR-600,OR-601,OR-602,OR-603,OR-604,OR-605,OR-606,OR-607,OR-608)) ORDER BY key ASC',
    )
    url.searchParams.set(
      "fields",
      "summary,status,statuscategorychangedate,priority,issuetype,parent,labels,updated",
    )
    url.searchParams.set("maxResults", "100")
    const raw = asObject(
      await jsonFetch(
        fetcher,
        url,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${btoa(`${email}:${token}`)}`,
          },
        },
        "JIRA_REFRESH_FAILED",
      ),
      "JIRA_PAYLOAD_INVALID",
    )
    const issues = Array.isArray(raw.issues) ? raw.issues : []
    const projection = issues.flatMap((candidate) => {
      const issue = asObject(candidate, "JIRA_PAYLOAD_INVALID")
      const fields = asObject(issue.fields, "JIRA_PAYLOAD_INVALID")
      const status = asObject(fields.status, "JIRA_PAYLOAD_INVALID")
      const type = asObject(fields.issuetype, "JIRA_PAYLOAD_INVALID")
      const statusCategory =
        status.statusCategory && typeof status.statusCategory === "object"
          ? (status.statusCategory as JsonObject)
          : null
      const priority =
        fields.priority && typeof fields.priority === "object"
          ? (fields.priority as JsonObject)
          : null
      const parent =
        fields.parent && typeof fields.parent === "object"
          ? (fields.parent as JsonObject)
          : null
      if (
        typeof issue.key !== "string" ||
        typeof fields.summary !== "string" ||
        typeof status.name !== "string" ||
        !statusCategory ||
        typeof statusCategory.name !== "string" ||
        typeof type.name !== "string"
      ) {
        throw new SourceAdapterError("JIRA_PAYLOAD_INVALID")
      }
      return [
        {
          key: issue.key,
          summary: fields.summary,
          status: status.name,
          statusCategory: statusCategory.name,
          priority:
            priority && typeof priority.name === "string"
              ? priority.name
              : null,
          type: type.name,
          parentKey:
            parent && typeof parent.key === "string" ? parent.key : null,
          labels: Array.isArray(fields.labels)
            ? fields.labels.filter((label): label is string => typeof label === "string")
            : [],
          browseUrl: new URL(`/browse/${issue.key}`, baseUrl).toString(),
          updated:
            typeof fields.updated === "string" ? fields.updated : null,
        },
      ]
    })
    return {
      openCount: projection.filter((issue) => issue.statusCategory !== "Done").length,
      byStatus: countBy(projection, (issue) => issue.status),
      issues: projection,
    }
  },
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

export const githubAdapter: SourceAdapter<GitHubProjection, CloudControlEnv> = {
  source: "github",
  authority: "GitHub source and CI",
  maxAgeSeconds: 300,
  async load(env, fetcher) {
    const repository = env.GITHUB_REPOSITORY?.trim() || "PixelGaps/orchy"
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
      throw new SourceAdapterError("GITHUB_REPOSITORY_INVALID")
    }
    const token = env.GITHUB_TOKEN?.trim()
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "orchy-cloud-control",
    }
    if (token) headers.Authorization = `Bearer ${token}`
    const [repoRaw, runsRaw] = await Promise.all([
      jsonFetch(
        fetcher,
        `https://api.github.com/repos/${repository}`,
        { headers },
        "GITHUB_REFRESH_FAILED",
      ),
      jsonFetch(
        fetcher,
        `https://api.github.com/repos/${repository}/actions/runs?per_page=20`,
        { headers },
        "GITHUB_REFRESH_FAILED",
      ),
    ])
    const repo = asObject(repoRaw, "GITHUB_PAYLOAD_INVALID")
    const runs = asObject(runsRaw, "GITHUB_PAYLOAD_INVALID")
    if (typeof repo.default_branch !== "string") {
      throw new SourceAdapterError("GITHUB_PAYLOAD_INVALID")
    }
    const rawRuns = Array.isArray(runs.workflow_runs)
      ? runs.workflow_runs
      : []
    const recentRuns = rawRuns.map((candidate) => {
      const run = asObject(candidate, "GITHUB_PAYLOAD_INVALID")
      if (
        typeof run.id !== "number" ||
        typeof run.name !== "string" ||
        typeof run.status !== "string" ||
        typeof run.head_sha !== "string" ||
        typeof run.html_url !== "string"
      ) {
        throw new SourceAdapterError("GITHUB_PAYLOAD_INVALID")
      }
      return {
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion:
          typeof run.conclusion === "string" ? run.conclusion : null,
        headSha: run.head_sha,
        htmlUrl: run.html_url,
      }
    })
    return {
      repository,
      defaultBranch: repo.default_branch,
      headSha: recentRuns[0]?.headSha ?? null,
      openWorkflowRuns: recentRuns.filter(
        (run) => run.status !== "completed",
      ).length,
      recentRuns,
    }
  },
}

function supabaseSecret(env: CloudControlEnv): string {
  return required(
    env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SECRET_MISSING",
  )
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

export const hostAdapter: SourceAdapter<HostProjection, CloudControlEnv> = {
  source: "host",
  authority: "Supabase execution_host_state_v2",
  maxAgeSeconds: 120,
  async load(env, fetcher) {
    const baseUrl = httpsUrl(
      required(env.SUPABASE_URL, "SUPABASE_URL_MISSING"),
      "SUPABASE_URL_INVALID",
    )
    const secret = supabaseSecret(env)
    const url = new URL("/rest/v1/execution_host_state_v2", baseUrl)
    url.searchParams.set(
      "select",
      [
        "host_id",
        "state",
        "last_seen_at",
        "control_plane_version",
        "source_sha",
        "machine_control_state",
        "machine_control_last_seen_at",
      ].join(","),
    )
    url.searchParams.set("host_id", "eq.madriguera")
    url.searchParams.set("limit", "1")
    const raw = await jsonFetch(
      fetcher,
      url,
      {
        headers: {
          Accept: "application/json",
          apikey: secret,
          Authorization: `Bearer ${secret}`,
        },
      },
      "HOST_REFRESH_FAILED",
    )
    if (!Array.isArray(raw) || raw.length !== 1) {
      throw new SourceAdapterError("HOST_PAYLOAD_INVALID")
    }
    const row = asObject(raw[0], "HOST_PAYLOAD_INVALID")
    if (
      typeof row.host_id !== "string" ||
      typeof row.state !== "string" ||
      typeof row.last_seen_at !== "string"
    ) {
      throw new SourceAdapterError("HOST_PAYLOAD_INVALID")
    }
    return {
      hostId: row.host_id,
      state: row.state,
      lastSeenAt: row.last_seen_at,
      controlPlaneVersion:
        typeof row.control_plane_version === "string"
          ? row.control_plane_version
          : null,
      sourceSha: typeof row.source_sha === "string" ? row.source_sha : null,
      machineControlState:
        typeof row.machine_control_state === "string"
          ? row.machine_control_state
          : null,
      machineControlLastSeenAt:
        typeof row.machine_control_last_seen_at === "string"
          ? row.machine_control_last_seen_at
          : null,
    }
  },
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

function testOpsHeaders(secret: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Profile": "testops",
    apikey: secret,
    Authorization: `Bearer ${secret}`,
  }
}

export const testOpsAdapter: SourceAdapter<
  TestOpsProjection,
  CloudControlEnv
> = {
  source: "testops",
  authority: "TestOps Supabase history",
  maxAgeSeconds: 300,
  async load(env, fetcher) {
    const baseUrl = httpsUrl(
      required(env.SUPABASE_URL, "SUPABASE_URL_MISSING"),
      "SUPABASE_URL_INVALID",
    )
    const secret = supabaseSecret(env)
    const target = env.TESTOPS_TARGET?.trim() || "PixelGaps/orchy"
    const layersUrl = new URL("/rest/v1/latest_layer_result", baseUrl)
    layersUrl.searchParams.set(
      "select",
      [
        "target",
        "layer_id",
        "run_id",
        "revision",
        "outcome",
        "finished_at",
        "duration_ms",
        "jira_milestone",
      ].join(","),
    )
    layersUrl.searchParams.set("target", `eq.${target}`)
    layersUrl.searchParams.set("order", "layer_id.asc")

    const findingsUrl = new URL("/rest/v1/finding_summary", baseUrl)
    findingsUrl.searchParams.set(
      "select",
      [
        "target",
        "layer_id",
        "category",
        "disposition",
        "findings",
        "distinct_signatures",
        "last_seen_at",
      ].join(","),
    )
    findingsUrl.searchParams.set("target", `eq.${target}`)
    findingsUrl.searchParams.set("order", "layer_id.asc")

    const [layersRaw, findingsRaw] = await Promise.all([
      jsonFetch(
        fetcher,
        layersUrl,
        { headers: testOpsHeaders(secret) },
        "TESTOPS_REFRESH_FAILED",
      ),
      jsonFetch(
        fetcher,
        findingsUrl,
        { headers: testOpsHeaders(secret) },
        "TESTOPS_REFRESH_FAILED",
      ),
    ])

    if (!Array.isArray(layersRaw) || !Array.isArray(findingsRaw)) {
      throw new SourceAdapterError("TESTOPS_PAYLOAD_INVALID")
    }

    const layers = layersRaw.map((candidate) => {
      const row = asObject(candidate, "TESTOPS_PAYLOAD_INVALID")
      if (
        row.target !== target ||
        typeof row.layer_id !== "string" ||
        typeof row.run_id !== "string" ||
        typeof row.revision !== "string" ||
        typeof row.outcome !== "string" ||
        typeof row.finished_at !== "string" ||
        typeof row.duration_ms !== "number"
      ) {
        throw new SourceAdapterError("TESTOPS_PAYLOAD_INVALID")
      }
      return {
        layerId: row.layer_id,
        runId: row.run_id,
        revision: row.revision,
        outcome: row.outcome,
        finishedAt: row.finished_at,
        durationMs: row.duration_ms,
        jiraMilestone:
          typeof row.jira_milestone === "string"
            ? row.jira_milestone
            : null,
      }
    })

    const findings = findingsRaw.map((candidate) => {
      const row = asObject(candidate, "TESTOPS_PAYLOAD_INVALID")
      if (
        row.target !== target ||
        typeof row.layer_id !== "string" ||
        typeof row.category !== "string" ||
        typeof row.disposition !== "string" ||
        typeof row.findings !== "number" ||
        typeof row.distinct_signatures !== "number" ||
        typeof row.last_seen_at !== "string"
      ) {
        throw new SourceAdapterError("TESTOPS_PAYLOAD_INVALID")
      }
      return {
        layerId: row.layer_id,
        category: row.category,
        disposition: row.disposition,
        findings: row.findings,
        distinctSignatures: row.distinct_signatures,
        lastSeenAt: row.last_seen_at,
      }
    })

    return { target, layers, findings }
  },
}

function summaryEndpointAdapter(
  source: "posthog",
  authority: string,
  urlFromEnv: (env: CloudControlEnv) => string | undefined,
  tokenFromEnv: (env: CloudControlEnv) => string | undefined,
): SourceAdapter<JsonObject, CloudControlEnv> {
  return {
    source,
    authority,
    maxAgeSeconds: 300,
    async load(env, fetcher) {
      const url = httpsUrl(
        required(
          urlFromEnv(env),
          `${source.toUpperCase()}_SUMMARY_URL_MISSING`,
        ),
        `${source.toUpperCase()}_SUMMARY_URL_INVALID`,
      )
      const token = tokenFromEnv(env)?.trim()
      const headers: Record<string, string> = {
        Accept: "application/json",
      }
      if (token) headers.Authorization = `Bearer ${token}`
      return asObject(
        await jsonFetch(
          fetcher,
          url,
          { headers },
          `${source.toUpperCase()}_REFRESH_FAILED`,
        ),
        `${source.toUpperCase()}_PAYLOAD_INVALID`,
      )
    },
  }
}

export const postHogAdapter = summaryEndpointAdapter(
  "posthog",
  "PostHog observability",
  (env) => env.POSTHOG_SUMMARY_URL,
  (env) => env.POSTHOG_PERSONAL_API_KEY,
)


function finiteNumber(value: unknown, code: string): number {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) throw new SourceAdapterError(code)
  return parsed
}

function supabaseHeaders(secret: string): Record<string, string> {
  return {
    Accept: "application/json",
    apikey: secret,
    Authorization: `Bearer ${secret}`,
  }
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

export const operationsAdapter: SourceAdapter<
  OperationProjection,
  CloudControlEnv
> = {
  source: "operations",
  authority: "Supabase execution_jobs_v2",
  maxAgeSeconds: 60,
  async load(env, fetcher) {
    const baseUrl = httpsUrl(
      required(env.SUPABASE_URL, "SUPABASE_URL_MISSING"),
      "SUPABASE_URL_INVALID",
    )
    const secret = supabaseSecret(env)
    const url = new URL("/rest/v1/execution_jobs_v2", baseUrl)
    url.searchParams.set(
      "select",
      [
        "id",
        "logical_key",
        "target_sha",
        "operation",
        "state",
        "priority",
        "resources",
        "attempt",
        "executor",
        "created_at",
        "started_at",
        "finished_at",
        "error",
      ].join(","),
    )
    url.searchParams.set("order", "created_at.desc")
    url.searchParams.set("limit", "100")
    const raw = await jsonFetch(
      fetcher,
      url,
      { headers: supabaseHeaders(secret) },
      "OPERATIONS_REFRESH_FAILED",
    )
    if (!Array.isArray(raw)) {
      throw new SourceAdapterError("OPERATIONS_PAYLOAD_INVALID")
    }
    const operations = raw.map((candidate) => {
      const row = asObject(candidate, "OPERATIONS_PAYLOAD_INVALID")
      if (
        typeof row.id !== "string" ||
        typeof row.logical_key !== "string" ||
        typeof row.target_sha !== "string" ||
        typeof row.operation !== "string" ||
        typeof row.state !== "string" ||
        !Array.isArray(row.resources) ||
        typeof row.created_at !== "string"
      ) {
        throw new SourceAdapterError("OPERATIONS_PAYLOAD_INVALID")
      }
      return {
        id: row.id,
        logicalKey: row.logical_key,
        targetSha: row.target_sha,
        operation: row.operation,
        state: row.state,
        priority: finiteNumber(row.priority, "OPERATIONS_PAYLOAD_INVALID"),
        resources: row.resources.filter(
          (resource): resource is string => typeof resource === "string",
        ),
        attempt: finiteNumber(row.attempt, "OPERATIONS_PAYLOAD_INVALID"),
        executor: typeof row.executor === "string" ? row.executor : null,
        createdAt: row.created_at,
        startedAt: typeof row.started_at === "string" ? row.started_at : null,
        finishedAt: typeof row.finished_at === "string" ? row.finished_at : null,
        error: typeof row.error === "string" ? row.error : null,
      }
    })
    return { operations }
  },
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
    metadata: JsonObject
  }>
}

export const fleetAdapter: SourceAdapter<FleetProjection, CloudControlEnv> = {
  source: "fleet",
  authority: "Supabase ci_fleet_provider_state",
  maxAgeSeconds: 300,
  async load(env, fetcher) {
    const baseUrl = httpsUrl(
      required(env.SUPABASE_URL, "SUPABASE_URL_MISSING"),
      "SUPABASE_URL_INVALID",
    )
    const secret = supabaseSecret(env)
    const url = new URL("/rest/v1/ci_fleet_provider_state", baseUrl)
    url.searchParams.set(
      "select",
      [
        "provider",
        "priority",
        "limit_runner_minutes",
        "reservation_runner_minutes",
        "remaining_runner_minutes",
        "qualified",
        "status",
        "observed_at",
        "reset_at",
        "offline_until",
        "max_age_seconds",
        "metadata",
      ].join(","),
    )
    url.searchParams.set("order", "priority.asc,provider.asc")
    const raw = await jsonFetch(
      fetcher,
      url,
      { headers: supabaseHeaders(secret) },
      "FLEET_REFRESH_FAILED",
    )
    if (!Array.isArray(raw)) {
      throw new SourceAdapterError("FLEET_PAYLOAD_INVALID")
    }
    const providers = raw.map((candidate) => {
      const row = asObject(candidate, "FLEET_PAYLOAD_INVALID")
      if (
        typeof row.provider !== "string" ||
        typeof row.qualified !== "boolean" ||
        typeof row.status !== "string"
      ) {
        throw new SourceAdapterError("FLEET_PAYLOAD_INVALID")
      }
      return {
        provider: row.provider,
        priority: finiteNumber(row.priority, "FLEET_PAYLOAD_INVALID"),
        limitRunnerMinutes: finiteNumber(
          row.limit_runner_minutes,
          "FLEET_PAYLOAD_INVALID",
        ),
        reservationRunnerMinutes: finiteNumber(
          row.reservation_runner_minutes,
          "FLEET_PAYLOAD_INVALID",
        ),
        remainingRunnerMinutes: finiteNumber(
          row.remaining_runner_minutes,
          "FLEET_PAYLOAD_INVALID",
        ),
        qualified: row.qualified,
        status: row.status,
        observedAt: typeof row.observed_at === "string" ? row.observed_at : null,
        resetAt: typeof row.reset_at === "string" ? row.reset_at : null,
        offlineUntil:
          typeof row.offline_until === "string" ? row.offline_until : null,
        maxAgeSeconds: finiteNumber(row.max_age_seconds, "FLEET_PAYLOAD_INVALID"),
        metadata:
          row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
            ? (row.metadata as JsonObject)
            : {},
      }
    })
    return { providers }
  },
}

export async function cancelExecutionOperation(
  env: CloudControlEnv,
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; id?: string; state?: string; reason?: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new SourceAdapterError("OPERATION_ID_INVALID")
  }
  const baseUrl = httpsUrl(
    required(env.SUPABASE_URL, "SUPABASE_URL_MISSING"),
    "SUPABASE_URL_INVALID",
  )
  const secret = supabaseSecret(env)
  const raw = asObject(
    await jsonFetch(
      fetcher,
      new URL("/rest/v1/rpc/execution_v2_cancel", baseUrl),
      {
        method: "POST",
        headers: {
          ...supabaseHeaders(secret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_id: id }),
      },
      "OPERATION_CANCEL_FAILED",
    ),
    "OPERATION_CANCEL_PAYLOAD_INVALID",
  )
  if (typeof raw.ok !== "boolean") {
    throw new SourceAdapterError("OPERATION_CANCEL_PAYLOAD_INVALID")
  }
  return {
    ok: raw.ok,
    id: typeof raw.id === "string" ? raw.id : undefined,
    state: typeof raw.state === "string" ? raw.state : undefined,
    reason: typeof raw.reason === "string" ? raw.reason : undefined,
  }
}

export const cloudSourceAdapters = [
  jiraAdapter,
  githubAdapter,
  testOpsAdapter,
  postHogAdapter,
  hostAdapter,
  operationsAdapter,
  fleetAdapter,
] as const
