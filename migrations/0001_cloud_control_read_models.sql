-- OR-624: dashboard-local state only. These tables MUST NOT become work,
-- execution lifecycle, CI, or assurance authorities.

CREATE TABLE IF NOT EXISTS cloud_source_snapshots (
  source TEXT PRIMARY KEY
    CHECK (source IN ('jira','github','testops','posthog','host','operations','fleet')),
  authority TEXT NOT NULL,
  observed_at_ms INTEGER NOT NULL,
  cached_at_ms INTEGER NOT NULL,
  last_attempt_at_ms INTEGER NOT NULL,
  last_error_code TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_operator_preferences (
  operator_subject TEXT NOT NULL,
  preference_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (operator_subject, preference_key)
);

CREATE TABLE IF NOT EXISTS cloud_quota_snapshots (
  provider TEXT NOT NULL,
  product TEXT NOT NULL,
  observed_at_ms INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (provider, product)
);

CREATE TABLE IF NOT EXISTS cloud_host_heartbeats (
  host_id TEXT PRIMARY KEY,
  observed_at_ms INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_action_audit (
  id TEXT PRIMARY KEY,
  operator_subject TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  outcome TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_cloud_action_audit_created
  ON cloud_action_audit(created_at_ms DESC);
