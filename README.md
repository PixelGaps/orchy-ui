# Orchy UI

Private, zero-cost hosted operator dashboard for Orchy.

## Authority boundaries

- **This repository** owns the browser UI and Netlify direct-deploy configuration.
- **PixelGaps/orchy** owns backend/runtime APIs, Mission Core, ExecutionStore, Image Factory, LLM and ComfyUI behavior.
- **Jira OR** owns work state and acceptance.
- **TestOps** owns advanced assurance evidence.
- **Notion** remains a fallback/reference projection during migration.

## Hosting

Primary host: **Netlify Free (Credit-based)** using prebuilt/manual deploys.

The `PixelGaps/orchy-ui` repository is deliberately **not** dependent on Netlify Git integration. Build artifacts are produced by an existing zero-cost CI runner and deployed with the Netlify CLI/API.

**Render hosting is retired and forbidden for this repository.** `npm run check:no-render` is part of the production build and rejects Render deployment files, Render service environment markers, and Render-hosted URLs.

Hard rules:
- private authenticated production;
- zero paid spend;
- no automatic paid overage;
- no background polling;
- no canonical state copy;
- no secrets in browser-readable state.

## Issue implementation action

The migrated dashboard owns the native **Implement OR-xxx** action. There is no standalone Jira redirect/launcher service in this repository.

## Migration

The React/Vite dashboard has been migrated here from `PixelGaps/orchy/apps/web` under OR-670. The backend-repo copy remains only until standalone build/parity validation is complete, then it must be removed.

Current implementation version: **2.0.0**.
