schema: orchy-ui.agent-contract.v2
authority:
  work: Jira-OR
  implementation_ui: PixelGaps/orchy-ui
  backend_runtime: PixelGaps/orchy
  assurance: TestOps
  execution: ExecutionStore+Mission-Core
repository:
  default_branch: main
  direct_main: required
  pull_requests: forbidden
  routine_branches: forbidden
scope:
  owns: [Cloud-Control-React-UI,Render-Hono-API-facade,UI-tests,Render-config]
  MUST_NOT_own: [work-state,execution-lifecycle,Mission-Core,TestOps-evidence,CI-fleet-authority,machine-control,secrets]
deployment:
  provider: Render
  framework: Vite+React
  api: Hono-Render-Node-web-service
  protection: Render-app-session-auth
  local_store: Supabase-dashboard-local-only
  public_unauthenticated_operator_surface: forbidden
  background_polling: forbidden
  paid_resources: forbidden
notion:
  state: frozen-preserved
  retirement_ticket: OR-634
  fresh_manual_approval_required: true
