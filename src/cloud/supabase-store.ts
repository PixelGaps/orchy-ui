import type {
  CloudSource,
  SnapshotStore,
  SourceSnapshot,
} from "./read-model"
import {
  DEFAULT_OPERATOR_PREFERENCES,
  mergeOperatorPreferences,
  type OperatorPreferencePatch,
  type OperatorPreferences,
} from "./preferences"
import type { CloudControlEnv } from "./security"

type JsonObject = Record<string, unknown>

type SnapshotRow = {
  source: string
  authority: string
  observed_at_ms: number
  cached_at_ms: number
  last_attempt_at_ms: number
  last_error_code: string | null
  payload_json: unknown
}

type PreferenceRow = {
  preference_key: string
  value_json: unknown
}

function endpoint(env: CloudControlEnv): URL | null {
  const raw = env.SUPABASE_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

function secret(env: CloudControlEnv): string | null {
  return (
    env.SUPABASE_SECRET_KEY?.trim() ||
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  )
}

function headers(token: string, extra: Record<string, string> = {}) {
  return {
    Accept: "application/json",
    apikey: token,
    Authorization: `Bearer ${token}`,
    ...extra,
  }
}

async function responseJson(response: Response, code: string): Promise<unknown> {
  if (!response.ok) throw new Error(code)
  if (response.status === 204) return null
  return response.json()
}

function jsonValue<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T
  return value as T
}

export class SupabaseCloudStore implements SnapshotStore {
  private readonly base: URL | null
  private readonly token: string | null

  constructor(
    env: CloudControlEnv,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.base = endpoint(env)
    this.token = secret(env)
  }

  get bound() {
    return Boolean(this.base && this.token)
  }

  private requireBinding() {
    if (!this.base || !this.token) throw new Error("SUPABASE_STORE_UNBOUND")
    return { base: this.base, token: this.token }
  }

  async get<T>(source: CloudSource): Promise<SourceSnapshot<T> | null> {
    if (!this.bound) return null
    const { base, token } = this.requireBinding()
    const url = new URL("/rest/v1/cloud_source_snapshots", base)
    url.searchParams.set("source", `eq.${source}`)
    url.searchParams.set(
      "select",
      "source,authority,observed_at_ms,cached_at_ms,last_attempt_at_ms,last_error_code,payload_json",
    )
    url.searchParams.set("limit", "1")
    const raw = await responseJson(
      await this.fetcher(url, { headers: headers(token) }),
      "SUPABASE_SNAPSHOT_READ_FAILED",
    )
    if (!Array.isArray(raw) || raw.length === 0) return null
    const row = raw[0] as SnapshotRow
    return {
      source: row.source as CloudSource,
      authority: row.authority,
      observedAtMs: Number(row.observed_at_ms),
      cachedAtMs: Number(row.cached_at_ms),
      lastAttemptAtMs: Number(row.last_attempt_at_ms),
      lastErrorCode: row.last_error_code,
      payload: jsonValue<T>(row.payload_json),
    }
  }

  async put<T>(snapshot: SourceSnapshot<T>): Promise<void> {
    if (!this.bound) return
    const { base, token } = this.requireBinding()
    const url = new URL("/rest/v1/cloud_source_snapshots", base)
    url.searchParams.set("on_conflict", "source")
    await responseJson(
      await this.fetcher(url, {
        method: "POST",
        headers: headers(token, {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify({
          source: snapshot.source,
          authority: snapshot.authority,
          observed_at_ms: snapshot.observedAtMs,
          cached_at_ms: snapshot.cachedAtMs,
          last_attempt_at_ms: snapshot.lastAttemptAtMs,
          last_error_code: snapshot.lastErrorCode,
          payload_json: snapshot.payload,
        }),
      }),
      "SUPABASE_SNAPSHOT_WRITE_FAILED",
    )
  }

  async markFailure(
    source: CloudSource,
    authority: string,
    attemptedAtMs: number,
    errorCode: string,
  ): Promise<void> {
    if (!this.bound) return
    const { base, token } = this.requireBinding()
    const url = new URL("/rest/v1/cloud_source_snapshots", base)
    url.searchParams.set("source", `eq.${source}`)
    await responseJson(
      await this.fetcher(url, {
        method: "PATCH",
        headers: headers(token, {
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        }),
        body: JSON.stringify({
          authority,
          last_attempt_at_ms: attemptedAtMs,
          last_error_code: errorCode,
        }),
      }),
      "SUPABASE_SNAPSHOT_FAILURE_WRITE_FAILED",
    )
  }

  async preferences(subject: string): Promise<OperatorPreferences> {
    if (!this.bound) return DEFAULT_OPERATOR_PREFERENCES
    const { base, token } = this.requireBinding()
    const url = new URL("/rest/v1/cloud_operator_preferences", base)
    url.searchParams.set("operator_subject", `eq.${subject}`)
    url.searchParams.set("select", "preference_key,value_json")
    const raw = await responseJson(
      await this.fetcher(url, { headers: headers(token) }),
      "SUPABASE_PREFERENCES_READ_FAILED",
    )
    if (!Array.isArray(raw)) return DEFAULT_OPERATOR_PREFERENCES
    const stored: Partial<OperatorPreferences> = {}
    for (const item of raw as PreferenceRow[]) {
      if (
        item.preference_key === "historyLimit" ||
        item.preference_key === "denseOperations" ||
        item.preference_key === "defaultFleetView"
      ) {
        ;(stored as Record<string, unknown>)[item.preference_key] = jsonValue(
          item.value_json,
        )
      }
    }
    return mergeOperatorPreferences(stored)
  }

  async apply(
    subject: string,
    patch: OperatorPreferencePatch,
    nowMs = Date.now(),
  ): Promise<OperatorPreferences> {
    const { base, token } = this.requireBinding()
    const before = await this.preferences(subject)
    const rows = Object.entries(patch).map(([key, value]) => ({
      operator_subject: subject,
      preference_key: key,
      value_json: value,
      updated_at_ms: nowMs,
    }))
    if (rows.length) {
      const url = new URL("/rest/v1/cloud_operator_preferences", base)
      url.searchParams.set("on_conflict", "operator_subject,preference_key")
      await responseJson(
        await this.fetcher(url, {
          method: "POST",
          headers: headers(token, {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          }),
          body: JSON.stringify(rows),
        }),
        "SUPABASE_PREFERENCES_WRITE_FAILED",
      )
    }
    const after = mergeOperatorPreferences({ ...before, ...patch })
    await this.audit(
      subject,
      "preferences.update",
      "cloud-control",
      "success",
      { before, after, changed: Object.keys(patch).sort() },
      nowMs,
    )
    return after
  }

  async reset(subject: string, nowMs = Date.now()): Promise<OperatorPreferences> {
    const { base, token } = this.requireBinding()
    const before = await this.preferences(subject)
    const url = new URL("/rest/v1/cloud_operator_preferences", base)
    url.searchParams.set("operator_subject", `eq.${subject}`)
    await responseJson(
      await this.fetcher(url, {
        method: "DELETE",
        headers: headers(token, { Prefer: "return=minimal" }),
      }),
      "SUPABASE_PREFERENCES_RESET_FAILED",
    )
    await this.audit(
      subject,
      "preferences.reset",
      "cloud-control",
      "success",
      { before, after: DEFAULT_OPERATOR_PREFERENCES },
      nowMs,
    )
    return DEFAULT_OPERATOR_PREFERENCES
  }

  async audit(
    subject: string,
    action: string,
    target: string | null,
    outcome: string,
    metadata: JsonObject = {},
    nowMs = Date.now(),
  ): Promise<void> {
    if (!this.bound) return
    const { base, token } = this.requireBinding()
    const url = new URL("/rest/v1/cloud_action_audit", base)
    await responseJson(
      await this.fetcher(url, {
        method: "POST",
        headers: headers(token, {
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        }),
        body: JSON.stringify({
          id: crypto.randomUUID(),
          operator_subject: subject,
          action,
          target,
          outcome,
          created_at_ms: nowMs,
          metadata_json: metadata,
        }),
      }),
      "SUPABASE_ACTION_AUDIT_WRITE_FAILED",
    )
  }
}
