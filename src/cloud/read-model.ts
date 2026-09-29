export type CloudSource =
  | "jira"
  | "github"
  | "testops"
  | "posthog"
  | "host"
  | "operations"
  | "fleet"

export type ReadModelState = "fresh" | "stale" | "unavailable"

export interface SourceSnapshot<T = unknown> {
  source: CloudSource
  authority: string
  observedAtMs: number
  cachedAtMs: number
  lastAttemptAtMs: number
  lastErrorCode: string | null
  payload: T
}

export interface SourceReadModel<T = unknown> {
  source: CloudSource
  authority: string
  state: ReadModelState
  observedAt: string | null
  ageSeconds: number | null
  payload: T | null
  errorCode: string | null
}

export interface SnapshotStore {
  get<T>(source: CloudSource): Promise<SourceSnapshot<T> | null>
  put<T>(snapshot: SourceSnapshot<T>): Promise<void>
  markFailure(
    source: CloudSource,
    authority: string,
    attemptedAtMs: number,
    errorCode: string,
  ): Promise<void>
}

export interface SourceAdapter<T = unknown, TEnv = unknown> {
  source: CloudSource
  authority: string
  maxAgeSeconds: number
  load(env: TEnv, fetcher: typeof fetch): Promise<T>
}

export class SourceAdapterError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = "SourceAdapterError"
  }
}

function safeErrorCode(error: unknown): string {
  return error instanceof SourceAdapterError
    ? error.code
    : "SOURCE_REFRESH_FAILED"
}

function ageSeconds(nowMs: number, observedAtMs: number): number {
  return Math.max(0, Math.floor((nowMs - observedAtMs) / 1000))
}

export function snapshotToReadModel<T>(
  snapshot: SourceSnapshot<T>,
  maxAgeSeconds: number,
  nowMs: number,
  forceStale = false,
): SourceReadModel<T> {
  const age = ageSeconds(nowMs, snapshot.observedAtMs)
  return {
    source: snapshot.source,
    authority: snapshot.authority,
    state: forceStale || age > maxAgeSeconds ? "stale" : "fresh",
    observedAt: new Date(snapshot.observedAtMs).toISOString(),
    ageSeconds: age,
    payload: snapshot.payload,
    errorCode: snapshot.lastErrorCode,
  }
}

export async function readCachedSource<T>(
  adapter: SourceAdapter<T>,
  store: SnapshotStore,
  nowMs = Date.now(),
): Promise<SourceReadModel<T>> {
  const cached = await store.get<T>(adapter.source)
  if (!cached) {
    return {
      source: adapter.source,
      authority: adapter.authority,
      state: "unavailable",
      observedAt: null,
      ageSeconds: null,
      payload: null,
      errorCode: "NO_SNAPSHOT",
    }
  }
  return snapshotToReadModel(cached, adapter.maxAgeSeconds, nowMs)
}

export async function refreshSource<T, TEnv>(
  adapter: SourceAdapter<T, TEnv>,
  env: TEnv,
  store: SnapshotStore,
  fetcher: typeof fetch = fetch,
  nowMs = Date.now(),
): Promise<SourceReadModel<T>> {
  try {
    const payload = await adapter.load(env, fetcher)
    const snapshot: SourceSnapshot<T> = {
      source: adapter.source,
      authority: adapter.authority,
      observedAtMs: nowMs,
      cachedAtMs: nowMs,
      lastAttemptAtMs: nowMs,
      lastErrorCode: null,
      payload,
    }
    await store.put(snapshot)
    return snapshotToReadModel(snapshot, adapter.maxAgeSeconds, nowMs)
  } catch (error) {
    const errorCode = safeErrorCode(error)
    await store.markFailure(
      adapter.source,
      adapter.authority,
      nowMs,
      errorCode,
    )
    const cached = await store.get<T>(adapter.source)
    if (!cached) {
      return {
        source: adapter.source,
        authority: adapter.authority,
        state: "unavailable",
        observedAt: null,
        ageSeconds: null,
        payload: null,
        errorCode,
      }
    }
    return snapshotToReadModel(
      { ...cached, lastAttemptAtMs: nowMs, lastErrorCode: errorCode },
      adapter.maxAgeSeconds,
      nowMs,
      true,
    )
  }
}
