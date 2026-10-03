import { api, getApi, postJSON } from "@/lib/api"
import { apiUrl } from "@/lib/api-base"
import type { RepositoryOption } from "@/lib/contracts"

export type WorkbenchRuntime = "aider" | "cline" | "opencode"
export type WorkbenchEffort = "LOW" | "MEDIUM" | "HIGH"

export type WorkbenchAttachmentRequest = {
  name: string
  media_type: string
  data_base64?: string
  repository_path?: string
  source: string
}

export type WorkbenchAttachment = {
  name: string
  media_type: string
  size: number
  digest: string
  source: string
  support: "text" | "multimodal" | "metadata-only"
  content: string
  truncated: boolean
}

export type WorkbenchExecution = {
  execution_id?: string
  state?: string
  updated_at?: number | string | null
  output_tail?: string
  error?: string
  validation?: Record<string, unknown>
  evidence?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export type WorkbenchSession = {
  session_id: string
  execution_id: string
  repository_id: string
  target_sha: string
  runtime: WorkbenchRuntime
  effort: WorkbenchEffort
  enabled_plugins: string[]
  attachments: WorkbenchAttachment[]
  turn_count: number
  state: string
  parent_execution_id: string | null
  acceptance?: string[]
  execution?: WorkbenchExecution
}

export type WorkbenchEventKind =
  | "assistant_text"
  | "plan_summary"
  | "tool_start"
  | "tool_result"
  | "patch"
  | "validation"
  | "repair"
  | "artifact"
  | "warning"
  | "error"
  | "cancelled"
  | "completed"

export type WorkbenchEvent = {
  sequence: number
  kind: WorkbenchEventKind
  payload: Record<string, unknown>
}

export type WorkbenchPluginTool = {
  name: string
  description: string
  input_schema: Record<string, unknown>
  capabilities: string[]
}

export type WorkbenchPlugin = {
  plugin_id: string
  version: string
  transport: "stdio" | "http_private"
  endpoint?: string
  command?: string[]
  capabilities: string[]
  tools: WorkbenchPluginTool[]
}

export type WorkbenchStartRequest = {
  task: string
  repository_id: string
  target_sha: string
  runtime: WorkbenchRuntime
  effort: WorkbenchEffort
  enabled_plugins: string[]
  attachments: WorkbenchAttachmentRequest[]
  acceptance: string[]
}

function detailFromPayload(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === "string") return detail
    return JSON.stringify(detail)
  }
  return `Workbench event stream returned ${status}`
}

export function listWorkbenchRepositories(): Promise<RepositoryOption[]> {
  return getApi("/api/repositories")
}

export function listWorkbenchPlugins(): Promise<WorkbenchPlugin[]> {
  return api<WorkbenchPlugin[]>("/api/workbench/plugins")
}

export function listWorkbenchSessions(): Promise<WorkbenchSession[]> {
  return api<WorkbenchSession[]>("/api/workbench/sessions")
}

export function startWorkbenchSession(body: WorkbenchStartRequest): Promise<WorkbenchSession> {
  return postJSON<WorkbenchSession>("/api/workbench/sessions", body)
}

export function getWorkbenchSession(sessionId: string): Promise<WorkbenchSession> {
  return api<WorkbenchSession>(`/api/workbench/sessions/${encodeURIComponent(sessionId)}`)
}

export function sendWorkbenchMessage(
  sessionId: string,
  message: string,
  acceptance: string[] = [],
): Promise<WorkbenchSession> {
  return postJSON<WorkbenchSession>(
    `/api/workbench/sessions/${encodeURIComponent(sessionId)}/messages`,
    { message, acceptance },
  )
}

export function cancelWorkbenchSession(sessionId: string): Promise<{ session_id: string; status: string }> {
  return postJSON(
    `/api/workbench/sessions/${encodeURIComponent(sessionId)}/cancel`,
    {},
  )
}

export function resumeWorkbenchSession(sessionId: string): Promise<{ session_id: string; status: string }> {
  return postJSON(
    `/api/workbench/sessions/${encodeURIComponent(sessionId)}/resume`,
    {},
  )
}

export function repairWorkbenchSession(sessionId: string): Promise<WorkbenchSession> {
  return postJSON(
    `/api/workbench/sessions/${encodeURIComponent(sessionId)}/repair`,
    {},
  )
}

export async function fileToWorkbenchAttachment(file: File): Promise<WorkbenchAttachmentRequest> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const chunks: string[] = []
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)))
  }
  return {
    name: file.name,
    media_type: file.type || "application/octet-stream",
    data_base64: btoa(chunks.join("")),
    source: "upload",
  }
}

export function parseWorkbenchSse(text: string): WorkbenchEvent[] {
  const events: WorkbenchEvent[] = []
  for (const record of text.replace(/\r\n/g, "\n").split("\n\n")) {
    if (!record.trim()) continue
    const data = record
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
    if (!data) continue
    const parsed = JSON.parse(data) as WorkbenchEvent
    if (
      typeof parsed.sequence !== "number"
      || typeof parsed.kind !== "string"
      || !parsed.payload
      || typeof parsed.payload !== "object"
    ) {
      throw new Error("Workbench event stream contained an invalid event")
    }
    events.push(parsed)
  }
  return events
}

export async function streamWorkbenchEvents(
  sessionId: string,
  onEvent: (event: WorkbenchEvent) => void,
  signal?: AbortSignal,
  follow = false,
): Promise<WorkbenchEvent[]> {
  const suffix = follow ? "?follow=true" : ""
  const response = await fetch(
    apiUrl(`/api/workbench/sessions/${encodeURIComponent(sessionId)}/events${suffix}`),
    {
      cache: "no-store",
      headers: { Accept: "text/event-stream" },
      signal,
    },
  )
  if (!response.ok) {
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      // Preserve status-only error when a proxy returns non-JSON.
    }
    throw new Error(detailFromPayload(payload, response.status))
  }

  const collected: WorkbenchEvent[] = []
  const emit = (chunk: string) => {
    for (const event of parseWorkbenchSse(chunk)) {
      collected.push(event)
      onEvent(event)
    }
  }

  if (!response.body) {
    emit(await response.text())
    return collected
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n")
    let boundary = buffer.indexOf("\n\n")
    while (boundary >= 0) {
      const record = buffer.slice(0, boundary + 2)
      buffer = buffer.slice(boundary + 2)
      emit(record)
      boundary = buffer.indexOf("\n\n")
    }
    if (done) break
  }
  if (buffer.trim()) emit(buffer)
  return collected
}
