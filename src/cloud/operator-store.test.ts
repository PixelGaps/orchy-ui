import { describe, expect, it } from "vitest"

import type { D1DatabaseLike, D1StatementLike } from "./d1"
import { D1OperatorStore } from "./operator-store"
import { DEFAULT_OPERATOR_PREFERENCES } from "./preferences"

class MemoryStatement implements D1StatementLike {
  private values: unknown[] = []

  constructor(
    private readonly db: MemoryD1,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values
    return this
  }

  async first<T>() {
    if (!this.query.startsWith("SELECT value_json")) return null
    const key = `${String(this.values[0])}:${String(this.values[1])}`
    const value = this.db.preferences.get(key)
    return (value == null ? null : { value_json: value }) as T | null
  }

  async run() {
    if (this.query.startsWith("INSERT INTO cloud_operator_preferences")) {
      const [subject, key, value] = this.values
      this.db.preferences.set(`${String(subject)}:${String(key)}`, String(value))
    } else if (this.query.startsWith("DELETE FROM cloud_operator_preferences")) {
      const subject = String(this.values[0])
      for (const key of [...this.db.preferences.keys()]) {
        if (key.startsWith(`${subject}:`)) this.db.preferences.delete(key)
      }
    } else if (this.query.startsWith("INSERT INTO cloud_action_audit")) {
      const [id, subject, action, target, outcome, createdAt, metadata] = this.values
      this.db.audit.push({
        id,
        subject,
        action,
        target,
        outcome,
        createdAt,
        metadata: JSON.parse(String(metadata)),
      })
    }
    return { success: true }
  }
}

class MemoryD1 implements D1DatabaseLike {
  preferences = new Map<string, string>()
  audit: Array<Record<string, unknown>> = []

  prepare(query: string) {
    return new MemoryStatement(this, query)
  }
}

describe("D1OperatorStore", () => {
  it("applies bounded preferences and records before/after audit", async () => {
    const db = new MemoryD1()
    const store = new D1OperatorStore(db)

    const applied = await store.apply(
      "operator-1",
      {
        historyLimit: 60,
        denseOperations: true,
        defaultFleetView: "all",
      },
      1000,
    )

    expect(applied).toEqual({
      historyLimit: 60,
      denseOperations: true,
      defaultFleetView: "all",
    })
    expect(db.audit).toHaveLength(1)
    expect(db.audit[0]).toMatchObject({
      subject: "operator-1",
      action: "preferences.update",
      target: "cloud-control",
      outcome: "success",
      createdAt: 1000,
      metadata: {
        before: DEFAULT_OPERATOR_PREFERENCES,
        after: applied,
        changed: ["defaultFleetView", "denseOperations", "historyLimit"],
      },
    })
  })

  it("reset reverses preferences to defaults and audits the rollback", async () => {
    const db = new MemoryD1()
    const store = new D1OperatorStore(db)
    await store.apply("operator-1", { historyLimit: 80 }, 1000)

    const reset = await store.reset("operator-1", 2000)

    expect(reset).toEqual(DEFAULT_OPERATOR_PREFERENCES)
    expect(await store.preferences("operator-1")).toEqual(DEFAULT_OPERATOR_PREFERENCES)
    expect(db.audit.at(-1)).toMatchObject({
      subject: "operator-1",
      action: "preferences.reset",
      outcome: "success",
      createdAt: 2000,
      metadata: {
        before: { ...DEFAULT_OPERATOR_PREFERENCES, historyLimit: 80 },
        after: DEFAULT_OPERATOR_PREFERENCES,
      },
    })
  })
})
