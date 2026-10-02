import { api } from "@/lib/api"

export type WorkbenchRuntime = "aider" | "cline" | "opencode"
export type WorkbenchPower = "low" | "medium" | "high"
export type WorkbenchEventKind = "assistant" | "user" | "tool" | "diff" | "validation" | "error" | "status"

export interface WorkbenchCapability {
  id: string
  label: string
  available: boolean
  reason?: string
}

export interface WorkbenchCapabilities {
  schema?: string
  sessions: boolean
  streaming: boolean
  attachments: boolean
  plugins: boolean
  runtimes: WorkbenchRuntime[]
  powers: WorkbenchPower[]
  capabilities?: WorkbenchCapability[]
}

export interface WorkbenchEvent {
  id: string
  kind: WorkbenchEventKind
  text: string
  title?: string
  detail?: string
  status?: string
}

export interface WorkbenchSession {
  id: string
  title: string
  repository_id: string
  repository_sha?: string
  runtime: WorkbenchRuntime
  power: WorkbenchPower
  plugin_ids: string[]
  status: string
  events: WorkbenchEvent[]
  created_at?: string
}

export interface WorkbenchAttachment {
  name: string
  path?: string
  size?: number
}

export interface StartWorkbenchSession {
  prompt: string
  repository_id: string
  runtime: WorkbenchRuntime
  power: WorkbenchPower
  plugin_ids: string[]
  attachments: WorkbenchAttachment[]
}

export class WorkbenchUnavailableError extends Error {
  constructor(message = "Canonical workbench API is not available yet") {
    super(message)
    this.name = "WorkbenchUnavailableError"
  }
}

async function workbenchApi<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await api<T>(path, init)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/404|not found|method not allowed/i.test(message)) throw new WorkbenchUnavailableError()
    throw error
  }
}

export const workbenchAdapter = {
  capabilities: () => workbenchApi<WorkbenchCapabilities>("/api/workbench/capabilities"),
  sessions: () => workbenchApi<WorkbenchSession[]>("/api/workbench/sessions"),
  session: (id: string) => workbenchApi<WorkbenchSession>(`/api/workbench/sessions/${encodeURIComponent(id)}`),
  start: (body: StartWorkbenchSession) => workbenchApi<WorkbenchSession>("/api/workbench/sessions", {
    method: "POST", body: JSON.stringify(body),
  }),
  stop: (id: string) => workbenchApi<WorkbenchSession>(`/api/workbench/sessions/${encodeURIComponent(id)}/stop`, { method: "POST", body: "{}" }),
  retry: (id: string) => workbenchApi<WorkbenchSession>(`/api/workbench/sessions/${encodeURIComponent(id)}/retry`, { method: "POST", body: "{}" }),
  resume: (id: string, prompt: string) => workbenchApi<WorkbenchSession>(`/api/workbench/sessions/${encodeURIComponent(id)}/resume`, {
    method: "POST", body: JSON.stringify({ prompt }),
  }),
}
