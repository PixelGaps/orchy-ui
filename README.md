# Orchy UI launcher

Minimal, versioned Node support for the **Notion-first Orchy operator UI**.

This repository is **not a dashboard**. Its only active responsibility is the stable Jira-key → ChatGPT launch contract used by operator surfaces.

## Contract

Input Jira key:

```text
OR-601
```

Canonical ChatGPT URL:

```text
https://chatgpt.com/?prompt=OR-601
```

The Node service additionally exposes:

- `GET /jira/OR-601` → `302` to the canonical ChatGPT URL
- `GET /?key=OR-601` → same redirect
- `GET /healthz` → implementation/version metadata

Only `OR-<digits>` keys are accepted.

## Development

Requires Node 20+.

```bash
npm test
npm run check
npm start
```

There are no runtime dependencies.

## Architecture

- Notion remains the active, mobile-first operator UI.
- Jira remains authoritative for work state.
- This repository does not store or mirror Jira state.
- No React/Hono/Vite dashboard is maintained here.
- No hosting provider is required; the HTTP service is optional infrastructure if a stable redirect endpoint is later needed.

Current implementation version: **1.0.0**.
