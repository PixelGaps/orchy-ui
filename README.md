# Orchy UI

Private, zero-cost hosted operator dashboard for Orchy.

## Authority boundaries

- **This repository** owns the browser UI and Vercel deployment.
- **PixelGaps/orchy** owns backend/runtime APIs, Mission Core, ExecutionStore, Image Factory, LLM and ComfyUI behavior.
- **Jira OR** owns work state and acceptance.
- **TestOps** owns advanced assurance evidence.
- **Notion** remains a fallback/reference projection during migration.

## Hosting

Primary host: **Netlify Free (Credit-based)** using prebuilt/manual deploys.

The private `PixelGaps/orchy-ui` GitHub repository is deliberately **not** connected to Netlify because private organization Git integration is a paid feature. Build artifacts are produced by an existing zero-cost CI runner and deployed with the Netlify CLI/API.

Hard rules:
- private authenticated production;
- zero paid spend;
- no automatic paid overage;
- no background polling;
- no canonical state copy;
- no secrets in browser-readable state.

## Jira → ChatGPT action

The dashboard preserves the stable Jira launcher contract:

```text
OR-601 -> https://chatgpt.com/?prompt=Implement%20OR-601
```

Only `OR-<digits>` keys are accepted.

## Migration

The React/Vite dashboard has been migrated here from `PixelGaps/orchy/apps/web` under OR-670. The backend-repo copy remains only until standalone build/parity validation is complete, then it must be removed.

Current implementation version: **2.0.0**.
