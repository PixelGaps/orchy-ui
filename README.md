# Orchy UI — frozen historical experiment

> **Inactive. Do not deploy or extend this repository.**
>
> As of 2026-09-30, Orchy uses **Notion as the only active operator UI**. The standalone React/Hono/Render/Vercel/Cloudflare path was dropped to reduce infrastructure and connector complexity.

## Current operator surface

- Notion: Orchy Operator Dashboard
- Jira OR-620: Notion-only operator milestone
- Jira OR-647: legacy UI parity and Notion limitation register
- Existing Notion Test Assurance dashboard remains active

## Authority

- Jira = work state, scope, acceptance and blockers
- GitHub PixelGaps/orchy = source, runtime contracts and CI
- TestOps / Supabase = assurance evidence
- ExecutionStore + Mission Core = execution/fleet/host state
- Madriguera = on-demand GPU/private/hardware executor
- Notion = human-facing operator projection

## Repository status

This repository is retained only as historical implementation evidence for the abandoned standalone web-dashboard experiment.

Do not:
- resume React/Hono dashboard development;
- add another hosting provider;
- re-enable Render/Vercel/Cloudflare deployment work;
- copy canonical operational state into this repository.

A future reactivation requires an explicit architecture decision in Jira/ADR first.
