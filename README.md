# Orchy UI

Deployable Orchy Cloud Control dashboard.

## Deployment

- Host: Render (free web service)
- Framework: React + TypeScript + Vite
- API facade: Hono on a Render Node web service
- Deployment protection: app-level HTTP Basic Auth on Render
- Dashboard-local persistence: Supabase
- Initial domain: Render onrender.com service domain; no custom domain required

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
