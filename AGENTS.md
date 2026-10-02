schema: orchy-ui.agent-contract.v6
repository:
  state: active-local-first-operator-ui
  default_branch: main
  integration_branch: main
  development: Jira-bound-isolated-task-branches
  task_branch: task/OR-<id>-YYYYMMDD-<slug>
  legacy_wip_branch: accepted-during-migration
  start_base: exact-origin-main-SHA
  main_advance_during_execution: preserve-active-work
  continuous_rebase: forbidden
  integration: fetch-main+rebase-once+scoped-validation+merge
  cancellation_scope: same-task-revision-only
  branch_terminal: merge-to-main+delete|discard+delete|paused-explicitly
  paused_branch: paused/OR-<id>-YYYYMMDD-<slug>+Jira-paused
  branch_reconciliation: required-at-task-start+task-completion
  stale_or_dead_branch: forbidden
  scheduled_branch_polling: forbidden
  purpose: zero-cost-orchy-operator-dashboard
  standalone_dashboard: required
  current_delivery: Madriguera-Tailscale-systemd-socket-activation
  hosted_providers: quarantined-until-explicit-reactivation
  retired_hosting: Render-forbidden
authority:
  operator_ui: PixelGaps/orchy-ui
  work: Jira-OR
  backend_runtime: PixelGaps/orchy
  assurance: TestOps
  execution: PixelGaps/orchy::ExecutionStore+Mission-Core
  fallback_projection: Notion-Orchy-Operator-Dashboard
scope:
  owns:
    - React-Vite-operator-dashboard
    - dashboard-routing+mobile-desktop-UX
    - Jira-key-validation
    - Implement-OR-xxx-actions
    - local-systemd-socket-activation+static-serving+API-proxy
    - hosted-provider-neutral-UI-code
    - quota-visualization
    - source-freshness-stale-unavailable-semantics
    - authenticated-mediated-operator-actions
  MUST_NOT_own:
    - canonical-work-state
    - backend-domain-logic
    - execution-lifecycle
    - Mission-Core
    - TestOps-evidence-authority
    - CI-fleet-authority
    - machine-control
    - browser-secrets
rules:
  dependencies: minimize
  background_polling: forbidden
  resident_UI_application_daemon: forbidden
  local_activation: systemd-socket-on-demand
  local_exposure: Tailscale-only
  local_update: exact-origin-main-SHA-on-cold-activation
  local_idle_shutdown_seconds_default: 300
  paid_resources: forbidden
  automatic_paid_overage: forbidden
  canonical_state_copy: forbidden
  mobile_ui: first-class
  hosted_provider_reactivation_requires_explicit_user_order: true
  repository_visibility_must_not_be-treated_as-runtime-auth: true
  changes_require: Jira-traceability+deterministic-tests
  Render: forbidden+retired
migration:
  source: PixelGaps/orchy/apps/web
  destination: PixelGaps/orchy-ui
  source_cleanup_after_verified_parity: required
