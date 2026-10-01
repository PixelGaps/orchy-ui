/**
 * Test documentation — executable specification
 * The D1 cache stores projections only and retains last-good payloads when
 * refresh metadata records a source failure.
 */
import { describe, expect, it } from "vitest"

import {
  D1SnapshotStore,
  type D1DatabaseLike,
  type D1StatementLike,
} from "./d1"
import type { SourceSnapshot } from "./read-model"

class MemoryStatement implements D1StatementLike {
  private values: unknown[] = []

  constructor(
    private readonly database: MemoryD1,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values
    return this
  }

  async first<T>() {
    if (!this.query.startsWith("SELECT")) return null
    return (this.database.rows.get(String(this.values[0])) as T | undefined) ?? null
  }

  async run() {
    if (this.query.startsWith("INSERT")) {
      const [source, authority, observed, cached, attempted, payload] = this.values
      this.database.rows.set(String(source), {
        source,
        authority,
        observed_at_ms: observed,
        cached_at_ms: cached,
        last_attempt_at_ms: attempted,
        last_error_code: null,
        payload_json: payload,
      })
    } else if (this.query.startsWith("UPDATE")) {
      const [source, authority, attempted, errorCode] = this.values
      const current = this.database.rows.get(String(source))
      if (current) {
        this.database.rows.set(String(source), {
          ...current,
          authority,
          last_attempt_at_ms: attempted,
          last_error_code: errorCode,
        })
      }
    }
    return { success: true }
  }
}

class MemoryD1 implements D1DatabaseLike {
  rows = new Map<string, Record<string, unknown>>()

  prepare(query: string) {
    return new MemoryStatement(this, query)
  }
}

describe("D1SnapshotStore", () => {
  it("round-trips a dashboard projection and records failure without replacing payload", async () => {
    const database = new MemoryD1()
    const store = new D1SnapshotStore(database)
    const snapshot: SourceSnapshot<{ openCount: number }> = {
      source: "jira",
      authority: "Jira OR work state",
      observedAtMs: 1000,
      cachedAtMs: 1000,
      lastAttemptAtMs: 1000,
      lastErrorCode: null,
      payload: { openCount: 7 },
    }

    await store.put(snapshot)
    expect(await store.get("jira")).toEqual(snapshot)

    await store.markFailure(
      "jira",
      "Jira OR work state",
      2000,
      "JIRA_REFRESH_FAILED",
    )

    expect(await store.get("jira")).toEqual({
      ...snapshot,
      lastAttemptAtMs: 2000,
      lastErrorCode: "JIRA_REFRESH_FAILED",
    })
  })

  it("degrades safely when no D1 binding exists", async () => {
    const store = new D1SnapshotStore(undefined)
    expect(await store.get("jira")).toBeNull()
    await expect(
      store.put({
        source: "jira",
        authority: "Jira OR work state",
        observedAtMs: 1,
        cachedAtMs: 1,
        lastAttemptAtMs: 1,
        lastErrorCode: null,
        payload: {},
      }),
    ).resolves.toBeUndefined()
  })
})
