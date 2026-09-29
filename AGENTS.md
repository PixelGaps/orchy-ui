schema: orchy-ui.agent-contract.v1
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
  owns: [Cloud-Control-React-UI,Vercel-serverless-API-facade,UI-tests,Vercel-config]
  MUST_NOT_own: [work-state,execution-lifecycle,Mission-Core,TestOps-evidence,CI-fleet-authority,machine-control,secrets]

deployment:
  provider: Vercel
  framework: Vite+React
  api: Hono-Vercel-Functions
  protection: Vercel-Authentication
  local_store: Supabase-dashboard-local-only
  public_unauthenticated_operator_surface: forbidden

notion:
  state: frozen-preserved
  retirement_ticket: OR-634
  fresh_manual_approval_required: true
