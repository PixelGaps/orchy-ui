schema: orchy-ui.agent-contract.v7
repository:
  state: active-local-first-operator-ui
  default_branch: main
  integration_branch: main
  development: Jira-bound-isolated-task-branches
  task_branch: task/OR-<id>-YYYYMMDD-<slug>
  legacy_wip_branch: accepted-during-migration
  start_base: exact-origin-main-SHA
  routine_direct_main: forbidden
  pull_requests: forbidden
  human_approval_gate: none
  development_concurrency: parallel-isolated-task-branches-allowed
  integration_writer: serialized-single-writer
  main_advance_during_execution: preserve-active-work
  continuous_rebase: forbidden
  integration: fetch-main+rebase-once+resolve-conflicts+scoped-validation+fast-forward-main
  main_moved_during_integration: bounded-resync-once+revalidate-touched-scope;then-Jira-checkpoint+requeue
  cancellation_scope: same-task-revision-only
  branch_terminal: merge-to-main+delete|discard+delete|paused-explicitly
  branch_cleanup: immediate-after-merge-or-discard-or-supersede
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

control_budget:
  Firecrawl_routine_calls: 0
  Firecrawl_use: only-when-required-web-content-cannot-be-satisfied-by-native-connectors-direct-APIs-or-non-Firecrawl-retrieval
  Firecrawl_search: forbidden-when-a-non-Firecrawl-search-or-source-API-can-identify-target-URLs
  Firecrawl_scrape: targeted-shortlist-only+deduplicate+reuse-within-task-or-batch
  Firecrawl_repeat_same_URL: forbidden-unless-prior-result-failed-or-is-materially-stale
  Firecrawl_crawl_or_map: forbidden-by-default+requires-explicit-Jira-scope+bounded-pages+bounded-depth
  Firecrawl_interact_or_browser: forbidden-unless-dynamic-rendering-or-interaction-is-technically-required+no-idle-minutes
  Firecrawl_quota_or_health_polling: forbidden
  Firecrawl_live_CI_or_tests: forbidden
  objective: preserve-Madriguera-breakglass-capacity
  Desktop_Commander_routine_calls: 0
  Supabase_routine_calls: 0
  host_control_if_required: delegate-to-madriguera-control-God-route+batch-related-work
  Supabase_polling: forbidden
  redundant_host_health_probes: forbidden
  repository_operations: GitHub-connector-direct
  Jira_operations: Atlassian-connector-direct
  emergency_lane: independent-GitHub-fixed-action-breakglass
  emergency_lane_must_not_depend_on: Desktop-Commander|Supabase
