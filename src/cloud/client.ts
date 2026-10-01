import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"\n\nimport { apiUrl } from "@/lib/api-base"

import type { SourceReadModel, CloudSource } from "./read-model"
import {
  DEFAULT_OPERATOR_PREFERENCES,
  mergeOperatorPreferences,
  validatePreferencePatch,
  type OperatorPreferencePatch,
  type OperatorPreferences,
} from "./preferences"

const PREFERENCES_KEY = "orchy.operator-preferences.v1"

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage
}

function readPreferences(): OperatorPreferences {
  const storage = browserStorage()
  if (!storage) return DEFAULT_OPERATOR_PREFERENCES
  const raw = storage.getItem(PREFERENCES_KEY)
  if (!raw) return DEFAULT_OPERATOR_PREFERENCES
  try {
    const parsed = JSON.parse(raw) as unknown
    const patch = validatePreferencePatch(parsed)
    return mergeOperatorPreferences(patch)
  } catch {
    storage.removeItem(PREFERENCES_KEY)
    return DEFAULT_OPERATOR_PREFERENCES
  }
}

function writePreferences(preferences: OperatorPreferences): OperatorPreferences {
  browserStorage()?.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  return preferences
}

export async function fetchCloudSource<T>(
  source: CloudSource,
): Promise<SourceReadModel<T>> {
  const response = await fetch(apiUrl(`/api/cloud-control/sources/${source}`), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`Cloud source ${source} returned ${response.status}`)
  }
  return response.json() as Promise<SourceReadModel<T>>
}

export async function refreshCloudSource<T>(
  source: CloudSource,
): Promise<SourceReadModel<T>> {
  const response = await fetch(
    apiUrl(`/api/cloud-control/sources/${source}/refresh`),
    {
      method: "POST",
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  )
  const payload = (await response.json()) as SourceReadModel<T>
  if (!response.ok && payload.state !== "unavailable") {
    throw new Error(`Cloud source ${source} refresh returned ${response.status}`)
  }
  return payload
}

export function useCloudSource<T>(source: CloudSource) {
  return useQuery({
    queryKey: ["cloud-source", source],
    queryFn: () => fetchCloudSource<T>(source),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}

export function useRefreshCloudSources(sources: readonly CloudSource[]) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        sources.map((source) => refreshCloudSource(source)),
      )
      return results
    },
    onSettled: async () => {
      await Promise.all(
        sources.map((source) =>
          client.invalidateQueries({ queryKey: ["cloud-source", source] }),
        ),
      )
    },
  })
}

export function sourceAgeLabel(model: SourceReadModel<unknown> | undefined) {
  if (model?.ageSeconds == null) return "no snapshot"
  if (model.ageSeconds < 60) return `${model.ageSeconds}s old`
  const minutes = Math.floor(model.ageSeconds / 60)
  if (minutes < 60) return `${minutes}m old`
  return `${Math.floor(minutes / 60)}h old`
}

export function sourceTone(
  model: SourceReadModel<unknown> | undefined,
): "neutral" | "live" | "warn" | "danger" {
  if (!model) return "neutral"
  if (model.state === "fresh") return "live"
  if (model.state === "stale") return "warn"
  return "danger"
}

export async function cancelCloudOperation(id: string) {
  const response = await fetch(apiUrl(`/api/cloud-control/operations/${encodeURIComponent(id)}/cancel`), {
    method: "POST",
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
  const payload = (await response.json()) as {
    ok: boolean
    id?: string
    state?: string
    reason?: string
    code?: string
  }
  if (!response.ok) {
    throw new Error(payload.reason || payload.code || `Cancel returned ${response.status}`)
  }
  return payload
}

export async function fetchOperatorPreferences(): Promise<{
  preferences: OperatorPreferences
  persistence: "browser"
}> {
  return { preferences: readPreferences(), persistence: "browser" }
}

export async function updateOperatorPreferences(
  patch: OperatorPreferencePatch,
): Promise<OperatorPreferences> {
  const validated = validatePreferencePatch(patch)
  return writePreferences(mergeOperatorPreferences({ ...readPreferences(), ...validated }))
}

export async function resetOperatorPreferences(): Promise<OperatorPreferences> {
  browserStorage()?.removeItem(PREFERENCES_KEY)
  return DEFAULT_OPERATOR_PREFERENCES
}
