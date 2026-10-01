schema: orchy-ui.agent-contract.v5
repository:
  state: active-hosted-operator-ui
  default_branch: main
  direct_main: required
  purpose: private-zero-cost-orchy-operator-dashboard
  standalone_dashboard: required
  hosting: Netlify-Free-Direct-Deploy
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
  private_authenticated_production: required
  changes_require: Jira-traceability+deterministic-tests
migration:
  source: PixelGaps/orchy/apps/web
  destination: PixelGaps/orchy-ui
  source_cleanup_after_verified_parity: required
