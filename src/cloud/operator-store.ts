import type { D1DatabaseLike } from "./d1"
import {
  DEFAULT_OPERATOR_PREFERENCES,
  mergeOperatorPreferences,
  type OperatorPreferencePatch,
  type OperatorPreferences,
} from "./preferences"

type PreferenceRow = {
  value_json: string
}

export class D1OperatorStore {
  constructor(private readonly db: D1DatabaseLike | undefined) {}

  get bound() {
    return Boolean(this.db)
  }

  private async readValue<T>(
    subject: string,
    key: keyof OperatorPreferences,
  ): Promise<T | undefined> {
    if (!this.db) return undefined
    const row = await this.db
      .prepare(
        "SELECT value_json FROM cloud_operator_preferences " +
          "WHERE operator_subject=?1 AND preference_key=?2",
      )
      .bind(subject, key)
      .first<PreferenceRow>()
    if (!row) return undefined
    try {
      return JSON.parse(row.value_json) as T
    } catch {
      return undefined
    }
  }

  async preferences(subject: string): Promise<OperatorPreferences> {
    const [historyLimit, denseOperations, defaultFleetView] = await Promise.all([
      this.readValue<number>(subject, "historyLimit"),
      this.readValue<boolean>(subject, "denseOperations"),
      this.readValue<OperatorPreferences["defaultFleetView"]>(
        subject,
        "defaultFleetView",
      ),
    ])
    return mergeOperatorPreferences({
      historyLimit,
      denseOperations,
      defaultFleetView,
    })
  }

  async apply(
    subject: string,
    patch: OperatorPreferencePatch,
    nowMs = Date.now(),
  ): Promise<OperatorPreferences> {
    if (!this.db) throw new Error("D1_UNBOUND")
    const before = await this.preferences(subject)
    for (const [key, value] of Object.entries(patch)) {
      await this.db
        .prepare(
          "INSERT INTO cloud_operator_preferences " +
            "(operator_subject,preference_key,value_json,updated_at_ms) " +
            "VALUES (?1,?2,?3,?4) " +
            "ON CONFLICT(operator_subject,preference_key) DO UPDATE SET " +
            "value_json=excluded.value_json,updated_at_ms=excluded.updated_at_ms",
        )
        .bind(subject, key, JSON.stringify(value), nowMs)
        .run()
    }
    const after = mergeOperatorPreferences({ ...before, ...patch })
    await this.audit(
      subject,
      "preferences.update",
      "cloud-control",
      "success",
      { before, after, changed: Object.keys(patch).sort((a, b) => a.localeCompare(b)) },
      nowMs,
    )
    return after
  }

  async reset(subject: string, nowMs = Date.now()): Promise<OperatorPreferences> {
    if (!this.db) throw new Error("D1_UNBOUND")
    const before = await this.preferences(subject)
    await this.db
      .prepare(
        "DELETE FROM cloud_operator_preferences WHERE operator_subject=?1",
      )
      .bind(subject)
      .run()
    await this.audit(
      subject,
      "preferences.reset",
      "cloud-control",
      "success",
      { before, after: DEFAULT_OPERATOR_PREFERENCES },
      nowMs,
    )
    return DEFAULT_OPERATOR_PREFERENCES
  }

  async audit(
    subject: string,
    action: string,
    target: string | null,
    outcome: string,
    metadata: Record<string, unknown> = {},
    nowMs = Date.now(),
  ): Promise<void> {
    if (!this.db) return
    await this.db
      .prepare(
        "INSERT INTO cloud_action_audit " +
          "(id,operator_subject,action,target,outcome,created_at_ms,metadata_json) " +
          "VALUES (?1,?2,?3,?4,?5,?6,?7)",
      )
      .bind(
        crypto.randomUUID(),
        subject,
        action,
        target,
        outcome,
        nowMs,
        JSON.stringify(metadata),
      )
      .run()
  }
}
