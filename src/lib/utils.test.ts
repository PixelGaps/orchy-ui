import { describe, expect, it } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  it("combines conditional class values", () => {
    expect(cn("base", false && "hidden", ["extra"], { active: true }))
      .toBe("base extra active")
  })

  it("resolves conflicting Tailwind utilities with the last value", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
  })

  it("handles empty inputs", () => {
    expect(cn()).toBe("")
  })
})
