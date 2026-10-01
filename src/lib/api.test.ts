import { afterEach, describe, expect, it, vi } from "vitest"

import {
  api,
  applyConfiguration,
  cancelExecution,
  getApi,
  getConfiguration,
  postApi,
  postJSON,
  previewConfiguration,
  runHealthcheck,
} from "./api"

afterEach(() => {
  vi.unstubAllGlobals()
})

function response(body: string, init: ResponseInit = {}) {
  return new Response(body, { status: 200, ...init })
}

describe("api transport", () => {
  it("parses JSON and applies deterministic request defaults", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response('{"ok":true}'))
    vi.stubGlobal("fetch", fetchMock)

    await expect(api<{ ok: boolean }>("/api/test")).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    }))
  })

  it("preserves caller headers and request options", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response("{}")))
    vi.stubGlobal("fetch", fetchMock)

    await api("/api/test", { method: "POST", headers: { "X-Test": "yes" }, body: "{}" })
    expect(fetchMock).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "POST",
      body: "{}",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Test": "yes" },
    }))
  })

  it("returns plain text when a successful body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("plain")))
    await expect(api<string>("/api/test")).resolves.toBe("plain")
  })

  it("returns null for an empty successful body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("")))
    await expect(api<null>("/api/test")).resolves.toBeNull()
  })

  it("surfaces structured API detail errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      response('{"detail":"backend failed"}', { status: 500 }),
    ))
    await expect(api("/api/test")).rejects.toThrow("backend failed")
  })

  it("falls back to response text, JSON, and status text for unstructured errors", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(response('{"code":42}', { status: 500 }))
      .mockResolvedValueOnce(new Response("", { status: 503, statusText: "Unavailable" })))
    await expect(api("/api/test")).rejects.toThrow("bad gateway")
    await expect(api("/api/test")).rejects.toThrow('{"code":42}')
    await expect(api("/api/test")).rejects.toThrow("Unavailable")
  })
})

describe("typed overview and JSON helpers", () => {
  it("retrieves the operator overview contract", async () => {
    const payload = {
      health: { status: "healthy", components: {} },
      telemetry: {},
      active_executions: [],
      healthchecks: {},
      missions: {},
      quotas: [],
    }
    const fetchMock = vi.fn().mockResolvedValue(response(JSON.stringify(payload)))
    vi.stubGlobal("fetch", fetchMock)

    await expect(getApi("/api/operator/overview")).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith("/api/operator/overview", expect.any(Object))
  })

  it("serializes generic JSON posts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response('{"status":"ok"}'))
    vi.stubGlobal("fetch", fetchMock)

    await expect(postJSON<{ status: string }>("/api/action", { value: 7 }))
      .resolves.toEqual({ status: "ok" })
    expect(fetchMock).toHaveBeenCalledWith("/api/action", expect.objectContaining({
      method: "POST",
      body: '{"value":7}',
    }))
  })
})


describe("typed API wrappers", () => {
  it("serializes all typed POST and configuration helpers", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response("{}")))
    vi.stubGlobal("fetch", fetchMock)

    await postApi("/api/tasks", { prompt: "ship", repository: "orchy" } as never)
    await getConfiguration("global")
    await previewConfiguration("llm", { field: "model", value: "qwen" })
    await applyConfiguration("comfyui", { field: "enabled", value: true, confirm: true })
    await cancelExecution("exec-123")
    await runHealthcheck("gateway")

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/tasks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ prompt: "ship", repository: "orchy" }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/configuration/global",
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/configuration/llm/preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ field: "model", value: "qwen" }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/configuration/comfyui/apply",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ field: "enabled", value: true, confirm: true }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/executions/exec-123/cancel",
      expect.objectContaining({ method: "POST", body: "{}" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/healthchecks/gateway/run",
      expect.objectContaining({ method: "POST", body: "{}" }),
    )
  })
})
