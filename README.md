# Orchy UI

Cloud-hosted Orchy Cloud Control operator surface.

## Architecture

- Render free web service in Frankfurt
- React + TypeScript + Vite frontend
- Hono Node API, same origin
- Login page + secure HttpOnly session cookie
- Supabase dashboard-local snapshots/preferences/audit only
- Jira = work authority
- GitHub = implementation/CI authority
- TestOps/Supabase = assurance/execution/fleet authority
- PostHog = observability
- Madriguera = on-demand GPU/private/hardware executor only

Cloud Control never uses background polling. Missing authority bindings fail closed and are shown as UNBOUND rather than fabricated.

## Required server secrets

`JIRA_EMAIL`, `JIRA_API_TOKEN`, `GITHUB_TOKEN`, `SUPABASE_SECRET_KEY` (or service role), `POSTHOG_SUMMARY_URL`, and optional `POSTHOG_PERSONAL_API_KEY` are server-side only and intentionally not committed.

Notion remains frozen and working. OR-634 requires fresh explicit manual approval.
