schema: orchy-ui.agent-contract.v7

# BEGIN PIXELGAPS MANAGED AGENT POLICY v6 sha256:c8795f295c30c879
# Source: PixelGaps/orchy:orchy/llm/agentic/shared_agent_policy.json
# - Jira is authoritative for work state, scope, acceptance criteria, priority, blockers, progress, deferrals, completion, and all non-code documentation, research, procedures, plans, and archives.
# - Confluence is retired for PixelGaps project documentation: do not create, update, mirror, or treat Confluence content as current authority; historical Confluence references are provenance only and must route to their migrated Jira record.
# - Repository documentation is limited to coding-critical durable technical truth such as AGENTS.md, README, architecture, ADRs, operations, contracts, and developer reference material; Jira must not duplicate or override repository technical truth.
# - GitHub source, tests, commits, and CI are authoritative for implementation reality; do not create GitHub Issues/Projects or repo TODO/DONE mirrors for tracked work.
# - Every newly observed defect, failure, or regression must have a concrete Jira issue, or an existing Jira issue whose explicit scope and acceptance cover that exact defect, immediately when discovered; search Jira first to prevent duplicates.
# - Defect handling is blocking and debt-intolerant: pause the interrupted task, fix the discovered defect immediately, run the cheapest meaningful deterministic validation for the defect, then retry the interrupted task from the failed or affected validation step until its full acceptance criteria pass. Do not defer, bypass, downgrade, or leave a known actionable defect behind merely to continue the queue.
# - An actionable execution failure must never be returned merely as blocked: reconcile or create its Jira defect, enter repair-first handling, validate the repair against the failing reproduction, and resume the interrupted task automatically.
# - A user instruction to stop after a task or list item means stop only after that requested unit reaches a valid terminal state. An actionable defect discovered en route is part of completing that unit and is not a stop condition.
# - Stop early only for a genuine external or manual blocker that cannot be repaired with the currently available tools; record the blocker, evidence, owner, and next action in Jira and keep the affected task non-Done.
# - A task that exposed a defect cannot be marked complete while that defect is unresolved or while the task has not been retried successfully after the fix. The only exception is a genuine external blocker that makes immediate repair technically impossible; record that blocker, evidence, owner, and next action in Jira and keep the affected task non-Done.
# - A defect record must retain discovery context, exact failure, acceptance criteria, validation path, and relevant run or SHA identifiers; chat, logs, comments, milestones, and health matrices are evidence only, never the defect owner.
# - Read the applicable AGENTS.md before modifying a repository; read architecture/ADR/operations documentation when the change touches those concerns.
# - Use the cheapest meaningful deterministic scoped validation; routine validation targets <=120 seconds and has a hard 180-second ceiling.
# - Never weaken, delete, skip, or rewrite meaningful tests merely to obtain a green result.
# - Repository operations use the GitHub connector/API and Jira operations use the Atlassian connector/API when available.
# - For GitHub connector file mutations, prefer the low-level Git object workflow by default: re-read branch HEAD and base tree, create blobs, create a tree from that exact base, create a commit with that exact HEAD as parent, then advance the task ref with a non-force update. Never force a moved ref; reconcile and retry under the bounded-resync policy. Contents API update_file is a secondary convenience path, not the default.
# - Routine Desktop Commander calls are zero; use it only for unavoidable host-bound bootstrap/repair that no durable connector, API, controller, runner, or direct host-control route can perform.
# - Use Supabase host control only when live Madriguera machine control is required; batch related operations and do not poll.
# - Routine Firecrawl calls are zero; use native connectors, direct APIs, or other non-Firecrawl retrieval first.
# - Secrets and reusable credentials must not be committed to Git; use the durable secret authority and fail closed when a required credential is unavailable.
# - Local AGENTS.md content may add repo-specific constraints, but must not silently weaken this shared policy; any intentional exception must be explicit and Jira-traceable.
# - Shared-policy synchronization is a Jira-bound governance mutation limited to the managed AGENTS.md block; it may use exact-SHA compare-and-swap on the default branch when the active connector cannot delete temporary branches.
# END PIXELGAPS MANAGED AGENT POLICY

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
  integration_serialization: optimistic-CAS-via-non-force-main-push
  integration_helper: bash scripts/integrate_task_branch.sh -- <scoped-validation-command>
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
