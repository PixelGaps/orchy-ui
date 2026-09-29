# Orchy UI

Dedicated workspace for Cloud Control UI artifacts, tracking and future UI-only extraction.

## Authority boundary

This repository is **not** a second operational source of truth.

- Jira OR: work state, scope, acceptance and blockers.
- PixelGaps/orchy: execution contracts, canonical adapters, backend/runtime code and CI until an explicit extraction ticket moves ownership.
- Supabase/TestOps: execution, fleet, host and assurance evidence as defined by Orchy contracts.
- D1: Cloud Control cache/preferences/audit only.
- PostHog: observability.

Do not copy canonical execution state, secrets, host configuration, Jira state or TestOps evidence into this repository. UI extraction must preserve the existing Cloud Control API contracts and be tracked by Jira.

Current migration sequence remains OR-629 -> OR-631 -> OR-632 -> OR-633. OR-634 is excluded unless fresh explicit manual approval is given.
