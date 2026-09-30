schema: orchy-ui.agent-contract.v3
repository:
  state: frozen-historical
  default_branch: main
  active_development: forbidden
  reactivation_requires: explicit-Jira-architecture-decision
authority:
  operator_ui: Notion-Orchy-Operator-Dashboard
  work: Jira-OR
  backend_runtime: PixelGaps/orchy
  assurance: TestOps
  execution: ExecutionStore+Mission-Core
scope:
  historical_only:
    - abandoned-React-UI
    - abandoned-Hono-API-facade
    - abandoned-Render-Vercel-Cloudflare-hosting
  MUST_NOT_own:
    - work-state
    - execution-lifecycle
    - Mission-Core
    - TestOps-evidence
    - CI-fleet-authority
    - machine-control
    - secrets
rules:
  modify_only_for:
    - archival-metadata
    - security-cleanup
    - explicit-reactivation
  deployment_work: forbidden
  provider_migration_work: forbidden
  paid_resources: forbidden
notion:
  state: active-default-operator-ui
  milestone: OR-620
  parity_register: OR-647
  retirement_ticket: OR-634
  retirement_requires_fresh_manual_approval: true
