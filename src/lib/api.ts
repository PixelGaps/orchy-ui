import { apiUrl } from "@/lib/api-base"\n\nimport type {
CancellationResponse,
CapabilityRegistry,
ComfyUIRuntime,
ConfigurationApplyResult,
DeepResearchRequest,
DeepResearchResponse,
DeepResearchRuntime,
ConfigurationPreview,
Execution,
HealthcheckItem,
HealthcheckRunResponse,
GalleryPayload,
GatewayQueueSnapshot,
ImageFactoryRunRequest,
ImageFactoryRunResponse,
ImageFactoryProductionMissionRequest,
ImageFactoryProductionMissionResponse,
LineagePayload,
LLMRuntime,
LogsPayload,
OperatorSettingSection,
OverviewPayload,
Run,
TaskRequest,
Telemetry,
ValidationPayload,
RuntimeStatus,
RepositoryOption,
} from "@/lib/contracts"

export type GetContract = {
  "/api/execution": Execution
  "/api/executions": Execution[]
  "/api/telemetry": Telemetry
  "/api/repositories": RepositoryOption[]
  "/api/runs": Run[]
  "/api/validation": ValidationPayload
  "/api/evidence": Record<string, unknown>
  "/api/runtime": RuntimeStatus
  "/api/operator/overview": OverviewPayload
  "/api/gateway/queue": GatewayQueueSnapshot
  "/api/healthchecks": HealthcheckItem[]
  "/api/llm": LLMRuntime
  "/api/capabilities": CapabilityRegistry
  "/api/deep-research/runtime": DeepResearchRuntime
  "/api/comfyui": ComfyUIRuntime
  "/api/logs": LogsPayload
  "/api/image-factory/lineage": LineagePayload
  "/api/image-factory/gallery": GalleryPayload
}

export type GetPath = keyof GetContract

type PostContract = {
  "/api/tasks": {
    request: TaskRequest
    response: { status: string; execution_id: string }
  }
  "/api/image-factory/run": {
    request: ImageFactoryRunRequest
    response: ImageFactoryRunResponse
  }
  "/api/image-factory/production/missions": {
    request: ImageFactoryProductionMissionRequest
    response: ImageFactoryProductionMissionResponse
  }
  "/api/deep-research/run": {
    request: DeepResearchRequest
    response: DeepResearchResponse
  }
  "/api/deep-research/runtime/start": {
    request: Record<string, never>
    response: DeepResearchRuntime
  }
  "/api/deep-research/runtime/stop": {
    request: Record<string, never>
    response: DeepResearchRuntime
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    let detail = response.statusText
    if (typeof payload === "object" && payload !== null && "detail" in payload) {
      detail = String((payload as { detail: unknown }).detail)
    } else if (typeof payload === "string" && payload) {
      detail = payload
    } else if (payload !== null) {
      detail = JSON.stringify(payload)
    }
    throw new Error(detail)
  }

  return payload as T
}

export function getApi<Path extends GetPath>(
  path: Path,
): Promise<GetContract[Path]> {
  return api<GetContract[Path]>(path)
}

export function postApi<Path extends keyof PostContract>(
  path: Path,
  body: PostContract[Path]["request"],
): Promise<PostContract[Path]["response"]> {
  return api<PostContract[Path]["response"]>(path, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function postJSON<T>(
  path: string,
  body: unknown,
): Promise<T> {
  return api<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export type ConfigurationSection = "global" | "agentic" | "llm" | "deep_research" | "comfyui"

export function getConfiguration(
  section: ConfigurationSection,
): Promise<OperatorSettingSection> {
  return api<OperatorSettingSection>(`/api/configuration/${section}`)
}

export function previewConfiguration(
  section: ConfigurationSection,
  body: { field: string; value: unknown },
): Promise<ConfigurationPreview> {
  return postJSON<ConfigurationPreview>(
    `/api/configuration/${section}/preview`,
    body,
  )
}

export function applyConfiguration(
  section: ConfigurationSection,
  body: {
    field: string
    value: unknown
    confirm: true
    expected_current?: unknown
  },
): Promise<ConfigurationApplyResult> {
  return postJSON<ConfigurationApplyResult>(
    `/api/configuration/${section}/apply`,
    body,
  )
}

export function cancelExecution(
  executionId: string,
): Promise<CancellationResponse> {
  return postJSON<CancellationResponse>(
    `/api/executions/${executionId}/cancel`,
    {},
  )
}

export function runHealthcheck(
  checkId: string,
): Promise<HealthcheckRunResponse> {
  return postJSON<HealthcheckRunResponse>(
    `/api/healthchecks/${checkId}/run`,
    {},
  )
}
