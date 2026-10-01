import type {
  CloudSource,
  SnapshotStore,
  SourceSnapshot,
} from "./read-model"

export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike
  first<T>(): Promise<T | null>
  run(): Promise<unknown>
}

export interface D1DatabaseLike {
  prepare(query: string): D1StatementLike
}

type SnapshotRow = {
  source: string
  authority: string
  observed_at_ms: number
  cached_at_ms: number
  last_attempt_at_ms: number
  last_error_code: string | null
  payload_json: string
}

export class D1SnapshotStore implements SnapshotStore {
  constructor(private readonly db: D1DatabaseLike | undefined) {}

  async get<T>(source: CloudSource): Promise<SourceSnapshot<T> | null> {
    if (!this.db) return null
    const row = await this.db
      .prepare(
        "SELECT source, authority, observed_at_ms, cached_at_ms, " +
          "last_attempt_at_ms, last_error_code, payload_json " +
          "FROM cloud_source_snapshots WHERE source = ?1",
      )
      .bind(source)
      .first<SnapshotRow>()
    if (!row) return null
    return {
      source: row.source as CloudSource,
      authority: row.authority,
      observedAtMs: row.observed_at_ms,
      cachedAtMs: row.cached_at_ms,
      lastAttemptAtMs: row.last_attempt_at_ms,
      lastErrorCode: row.last_error_code,
      payload: JSON.parse(row.payload_json) as T,
    }
  }

  async put<T>(snapshot: SourceSnapshot<T>): Promise<void> {
    if (!this.db) return
    await this.db
      .prepare(
        "INSERT INTO cloud_source_snapshots " +
          "(source, authority, observed_at_ms, cached_at_ms, last_attempt_at_ms, " +
          "last_error_code, payload_json) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6) " +
          "ON CONFLICT(source) DO UPDATE SET " +
          "authority=excluded.authority, observed_at_ms=excluded.observed_at_ms, " +
          "cached_at_ms=excluded.cached_at_ms, last_attempt_at_ms=excluded.last_attempt_at_ms, " +
          "last_error_code=NULL, payload_json=excluded.payload_json",
      )
      .bind(
        snapshot.source,
        snapshot.authority,
        snapshot.observedAtMs,
        snapshot.cachedAtMs,
        snapshot.lastAttemptAtMs,
        JSON.stringify(snapshot.payload),
      )
      .run()
  }

  async markFailure(
    source: CloudSource,
    authority: string,
    attemptedAtMs: number,
    errorCode: string,
  ): Promise<void> {
    if (!this.db) return
    await this.db
      .prepare(
        "UPDATE cloud_source_snapshots SET authority=?2, last_attempt_at_ms=?3, " +
          "last_error_code=?4 WHERE source=?1",
      )
      .bind(source, authority, attemptedAtMs, errorCode)
      .run()
  }
}
