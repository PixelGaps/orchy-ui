# Orchy UI

Provider-neutral operator UI for Orchy.

## Provider quarantine

As of 2026-10-02, **Vercel and Netlify are quarantined by explicit user order**.

- no Vercel deployment manifest;
- no Netlify deployment manifest;
- no provider-specific serverless entrypoint;
- no Vercel-specific runtime identity or deployment-protection contract;
- no hosted provider is authoritative or considered pending work;
- reactivation requires a new explicit user order.

The React/Vite UI and provider-neutral cloud-control code are retained so local development and future hosting decisions do not require reconstructing the product.

## Authority boundaries

- **PixelGaps/orchy-ui** owns the operator UI.
- **PixelGaps/orchy** owns backend/runtime APIs, Mission Core, ExecutionStore, Image Factory, LLM and ComfyUI behavior.
- **Jira OR** owns work state and acceptance.
- **TestOps** owns advanced assurance evidence.

## Security

A future hosted deployment must provide authenticated operator mediation and keep privileged secrets server-side. Repository visibility is not an authentication boundary.

## Development

Use `npm run dev` for local development. Provider-specific deployment configuration must not be added while the quarantine is active.

Current implementation version: **2.0.0**.
