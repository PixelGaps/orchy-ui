schema: orchy-ui.agent-contract.v4
repository:
  state: active-minimal-support
  default_branch: main
  direct_main: required
  purpose: versioned-jira-to-chatgpt-launcher
  standalone_dashboard: forbidden
  hosting_required: false
authority:
  operator_ui: Notion-Orchy-Operator-Dashboard
  work: Jira-OR
  backend_runtime: PixelGaps/orchy
  assurance: TestOps
scope:
  owns:
    - jira-key-validation
    - jira-key-to-chatgpt-url-contract
    - optional-minimal-node-redirect-service
  MUST_NOT_own:
    - operator-dashboard
    - work-state
    - execution-lifecycle
    - Mission-Core
    - TestOps-evidence
    - CI-fleet-authority
    - machine-control
    - secrets
rules:
  dependencies: minimize
  background_polling: forbidden
  paid_resources: forbidden
  canonical_state_copy: forbidden
  mobile_ui: Notion-owned
  changes_require: Jira-traceability+deterministic-tests
versioning:
  source: package.json
  initial_repurposed_version: 1.0.0
