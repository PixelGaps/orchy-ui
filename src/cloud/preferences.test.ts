import { describe, expect, it } from "vitest"

import {
  DEFAULT_OPERATOR_PREFERENCES,
  mergeOperatorPreferences,
  PreferenceValidationError,
  validatePreferencePatch,
} from "./preferences"

describe("operator preferences", () => {
  it("validates the bounded Cloud Control preference contract", () => {
    expect(
      validatePreferencePatch({
        historyLimit: 60,
        denseOperations: true,
        defaultFleetView: "all",
      }),
    ).toEqual({
      historyLimit: 60,
      denseOperations: true,
      defaultFleetView: "all",
    })
  })

  it("rejects unsupported and out-of-range values", () => {
    expect(() => validatePreferencePatch({ historyLimit: 9 })).toThrow(
      PreferenceValidationError,
    )
    expect(() => validatePreferencePatch({ defaultFleetView: "paid" })).toThrow(
      PreferenceValidationError,
    )
    expect(() => validatePreferencePatch({ unknown: true })).toThrow(
      PreferenceValidationError,
    )
  })

  it("restores deterministic defaults when stored values are absent", () => {
    expect(mergeOperatorPreferences({})).toEqual(DEFAULT_OPERATOR_PREFERENCES)
    expect(mergeOperatorPreferences({ historyLimit: 70 })).toEqual({
      ...DEFAULT_OPERATOR_PREFERENCES,
      historyLimit: 70,
    })
  })
})
