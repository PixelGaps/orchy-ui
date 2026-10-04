import { afterEach, describe, expect, it, vi } from "vitest"

import { currentSourcePayload, fetchSourceModel } from "./client"
import type { SourceReadModel } from "./read-model"

const base = {
  source: "jira",
  authority: "Jira OR work state",
  observedAt: "2026-10-04T00:00:00.000Z",
  ageSeconds: 0,
  errorCode: null,
} as const

describe("current dashboard figure authority", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("preserves an authoritative numeric zero from a fresh source", () => {
    const model: SourceReadModel<{ openCount: number }> = {
      ...base,
      state: "fresh",
      payload: { openCount: 0 },
    }
    expect(currentSourcePayload(model)).toEqual({ openCount: 0 })
  })

  it.each(["stale", "unavailable"] as const)(
    "hides %s payloads from current-state figures",
    (state) => {
      const model: SourceReadModel<{ openCount: number }> = {
        ...base,
        state,
        payload: state === "stale" ? { openCount: 37 } : null,
      }
      expect(currentSourcePayload(model)).toBeNull()
    },
  )

  it("treats loading/no model as unknown", () => {
    expect(currentSourcePayload(undefined)).toBeNull()
  })

  it("fails closed on source HTTP errors instead of inventing zero", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })))
    const model = await fetchSourceModel<{ openCount: number }>("jira")
    expect(model.state).toBe("unavailable")
    expect(model.payload).toBeNull()
    expect(model.errorCode).toBe("SOURCE_HTTP_503")
  })

  it("fails closed on malformed source payloads", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ source: "jira", state: "fresh", payload: { openCount: 0 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ))
    const model = await fetchSourceModel<{ openCount: number }>("jira")
    expect(model.state).toBe("unavailable")
    expect(model.payload).toBeNull()
    expect(model.errorCode).toBe("SOURCE_PAYLOAD_INVALID")
  })
})
