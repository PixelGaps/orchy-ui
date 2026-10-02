import { afterEach, describe, expect, it, vi } from "vitest"

import {
  fileToWorkbenchAttachment,
  parseWorkbenchSse,
  streamWorkbenchEvents,
} from "./api"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Workbench API adapters", () => {
  it("parses normalized finite SSE snapshots", () => {
    const events = parseWorkbenchSse(
      'event: plan_summary\ndata: {"sequence":1,"kind":"plan_summary","payload":{"summary":"inspect"}}\n\n'
      + 'event: patch\ndata: {"sequence":2,"kind":"patch","payload":{"changed_files":["src/app.ts"]}}\n\n',
    )
    expect(events).toEqual([
      { sequence: 1, kind: "plan_summary", payload: { summary: "inspect" } },
      { sequence: 2, kind: "patch", payload: { changed_files: ["src/app.ts"] } },
    ])
  })

  it("rejects malformed SSE event envelopes", () => {
    expect(() =>
      parseWorkbenchSse('data: {"sequence":"bad","kind":"tool_start","payload":{}}\n\n'),
    ).toThrow("invalid event")
  })

  it("streams chunks once without reconnecting or polling", async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('event: assistant_text\ndata: {"sequence":1,"kind":"assistant_text","payload":{"text":"hello"}}\n'),
        )
        controller.enqueue(
          encoder.encode('\nevent: completed\ndata: {"sequence":2,"kind":"completed","payload":{"state":"completed"}}\n\n'),
        )
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const received: number[] = []

    const events = await streamWorkbenchEvents("session one", (event) => received.push(event.sequence))

    expect(received).toEqual([1, 2])
    expect(events.map((event) => event.kind)).toEqual(["assistant_text", "completed"])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("session%20one/events")
  })

  it("surfaces typed stream errors and status-only proxy failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: { kind: "blocked", message: "host unavailable" } }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    ))
    await expect(streamWorkbenchEvents("s1", () => undefined)).rejects.toThrow("blocked")

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("proxy unavailable", { status: 503 }),
    ))
    await expect(streamWorkbenchEvents("s1", () => undefined)).rejects.toThrow("503")
  })

  it("falls back to non-stream response bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      body: null,
      text: async () => 'data: {"sequence":3,"kind":"warning","payload":{"message":"bounded"}}\n\n',
    }))
    const events = await streamWorkbenchEvents("s1", () => undefined)
    expect(events[0]?.kind).toBe("warning")
  })

  it("encodes browser file bytes as a bounded upload envelope", async () => {
    const fakeFile = {
      name: "spec.txt",
      type: "text/plain",
      arrayBuffer: async () => new Uint8Array([65, 66, 67]).buffer,
    } as File

    await expect(fileToWorkbenchAttachment(fakeFile)).resolves.toEqual({
      name: "spec.txt",
      media_type: "text/plain",
      data_base64: "QUJD",
      source: "upload",
    })

    const unknownType = {
      name: "blob.bin",
      type: "",
      arrayBuffer: async () => new Uint8Array([]).buffer,
    } as File
    expect((await fileToWorkbenchAttachment(unknownType)).media_type).toBe("application/octet-stream")
  })
})
