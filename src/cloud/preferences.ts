export type FleetView = "eligible" | "all"

export type OperatorPreferences = {
  historyLimit: number
  denseOperations: boolean
  defaultFleetView: FleetView
}

export const DEFAULT_OPERATOR_PREFERENCES: OperatorPreferences = {
  historyLimit: 30,
  denseOperations: false,
  defaultFleetView: "eligible",
}

export type OperatorPreferencePatch = Partial<OperatorPreferences>

export class PreferenceValidationError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = "PreferenceValidationError"
  }
}

export function validatePreferencePatch(value: unknown): OperatorPreferencePatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PreferenceValidationError("PREFERENCES_PAYLOAD_INVALID")
  }
  const raw = value as Record<string, unknown>
  const allowed = new Set([
    "historyLimit",
    "denseOperations",
    "defaultFleetView",
  ])
  const unknown = Object.keys(raw).find((key) => !allowed.has(key))
  if (unknown) throw new PreferenceValidationError("PREFERENCE_KEY_UNSUPPORTED")

  const patch: OperatorPreferencePatch = {}
  if ("historyLimit" in raw) {
    if (
      typeof raw.historyLimit !== "number" ||
      !Number.isInteger(raw.historyLimit) ||
      raw.historyLimit < 10 ||
      raw.historyLimit > 100
    ) {
      throw new PreferenceValidationError("HISTORY_LIMIT_INVALID")
    }
    patch.historyLimit = raw.historyLimit
  }
  if ("denseOperations" in raw) {
    if (typeof raw.denseOperations !== "boolean") {
      throw new PreferenceValidationError("DENSE_OPERATIONS_INVALID")
    }
    patch.denseOperations = raw.denseOperations
  }
  if ("defaultFleetView" in raw) {
    if (raw.defaultFleetView !== "eligible" && raw.defaultFleetView !== "all") {
      throw new PreferenceValidationError("FLEET_VIEW_INVALID")
    }
    patch.defaultFleetView = raw.defaultFleetView
  }
  return patch
}

export function mergeOperatorPreferences(
  stored: Partial<OperatorPreferences>,
): OperatorPreferences {
  return {
    ...DEFAULT_OPERATOR_PREFERENCES,
    ...stored,
  }
}
