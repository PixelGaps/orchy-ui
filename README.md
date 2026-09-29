# Orchy UI

Deployable Orchy Cloud Control dashboard.

## Deployment

- Host: Vercel
- Framework: React + TypeScript + Vite
- API facade: Hono on Vercel Functions
- Deployment protection: Vercel Authentication
- Dashboard-local persistence: Supabase
- Initial domain: Vercel project domain; no custom domain required

## Authority boundary

This repository is **not** an operational source of truth.

- Jira OR: work state, scope, acceptance and blockers.
- PixelGaps/orchy: backend/runtime/execution contracts/Mission-Core/CI.
- Supabase ExecutionStore: execution/fleet/host state.
- TestOps: assurance evidence.
- PostHog: observability.
- PixelGaps/madriguera-control: machine control.

Supabase tables owned by this UI may contain only cached projections, UI preferences and action audit. They must never become canonical work/execution/assurance state.

Notion remains frozen. OR-634 must not execute without fresh explicit manual approval.
