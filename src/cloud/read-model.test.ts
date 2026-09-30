/**
 * Test documentation — executable specification
 * Read models retain the last good projection when a canonical source fails
 * and always expose freshness/age instead of inventing live state.
 */
import { describe, expect, it } from "vitest"

import {
  readCachedSource,
  refreshSource,
  type CloudSource,
  type SnapshotStore,
  type SourceAdapter,
  type SourceSnapshot,
} from "./read-model"

class MemoryStore implements SnapshotStore {
  snapshots = new Map<CloudSource, SourceSnapshot<unknown>>()

  async get<T>(source: CloudSource) {
    return (this.snapshots.get(source) as SourceSnapshot<T> | undefined) ?? null
  }

  async put<T>(snapshot: SourceSnapshot<T>) {
    this.snapshots.set(sourceKey(snapshot), snapshot as SourceSnapshot<unknown>)
  }

  async markFailure(
    source: CloudSource,
    authority: string,
    attemptedAtMs: number,
    errorCode: string,
  ) {
    const current = this.snapshots.get(source)
    if (!current) return
    this.snapshots.set(source, {
      ...current,
      authority,
      lastAttemptAtMs: attemptedAtMs,
      lastErrorCode: errorCode,
    })
  }
}

function sourceKey(snapshot: SourceSnapshot<unknown>) {
  return snapshot.source
}

const adapter: SourceAdapter<{ count: number }, { fail?: boolean }> = {
  source: "jira",
  authority: "Jira OR work state",
  maxAgeSeconds: 60,
  async load(env) {
    if (env.fail) throw new Error("upstream details must not leak")
    return { count: 7 }
  },
}

describe("Cloud source read models", () => {
  it("writes a successful canonical projection as fresh cache", async () => {
    const store = new MemoryStore()
    const model = await refreshSource(
      adapter,
      {},
      store,
      fetch,
      1_000,
    )
    expect(model).toMatchObject({
      source: "jira",
      authority: "Jira OR work state",
      state: "fresh",
      ageSeconds: 0,
      payload: { count: 7 },
      errorCode: null,
    })
  })

  it("keeps the last good payload and marks it stale after refresh failure", async () => {
    const store = new MemoryStore()
    await refreshSource(adapter, {}, store, fetch, 1_000)
    const model = await refreshSource(
      adapter,
      { fail: true },
      store,
      fetch,
      11_000,
    )
    expect(model).toMatchObject({
      state: "stale",
      ageSeconds: 10,
      payload: { count: 7 },
      errorCode: "SOURCE_REFRESH_FAILED",
    })
    expect(JSON.stringify(model)).not.toContain("upstream details")
  })

  it("reports unavailable when no snapshot exists", async () => {
    const store = new MemoryStore()
    const model = await refreshSource(
      adapter,
      { fail: true },
      store,
      fetch,
      1_000,
    )
    expect(model).toMatchObject({
      state: "unavailable",
      observedAt: null,
      payload: null,
      errorCode: "SOURCE_REFRESH_FAILED",
    })
  })

  it("ages cached projections deterministically", async () => {
    const store = new MemoryStore()
    await refreshSource(adapter, {}, store, fetch, 1_000)
    expect(await readCachedSource(adapter, store, 60_000)).toMatchObject({
      state: "fresh",
      ageSeconds: 59,
    })
    expect(await readCachedSource(adapter, store, 62_000)).toMatchObject({
      state: "stale",
      ageSeconds: 61,
    })
  })
})
