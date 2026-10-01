schema: orchy-ui.agent-contract.v5
repository:
  state: active-hosted-operator-ui
  default_branch: main
  branches: main-only
  non_main_refs: forbidden
  temporary_branches: forbidden
  direct_main: required
  purpose: authenticated-zero-cost-orchy-operator-dashboard
  visibility: public-required-for-zero-cost-hosting
  standalone_dashboard: required
  hosting: Netlify-Free-Direct-Deploy
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
    - Netlify-direct-deploy-config
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
  paid_resources: forbidden
  automatic_paid_overage: forbidden
  unknown_host_quota: fail-closed
  canonical_state_copy: forbidden
  mobile_ui: first-class
  public_source_repository: required-for-free-hosting
  authenticated_operator_access: required
  repository_visibility_must_not_be-treated_as-runtime-auth: true
  changes_require: Jira-traceability+deterministic-tests
  Render: forbidden+retired
migration:
  source: PixelGaps/orchy/apps/web
  destination: PixelGaps/orchy-ui
  source_cleanup_after_verified_parity: required
