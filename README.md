# Orchy UI

Local-first, zero-cost operator dashboard for Orchy. Hosted providers remain quarantined until a future explicit reactivation.

## Current delivery model

The active surface is **Madriguera-local and Tailscale-private**.

- `orchy-ui.socket` listens on TCP `23236` bound to `tailscale0`.
- No Vite/Node UI application process remains resident while idle.
- A visit wakes `orchy-ui.service` through systemd socket activation.
- Cold activation fetches `origin/main`, resolves the exact SHA, and rebuilds only when that SHA differs from the deployed SHA.
- The local production build exposes the full private route set and proxies same-origin `/api` traffic to Orchy on loopback (`127.0.0.1:23235` by default).
- After five minutes with no active HTTP request or upgraded connection, the application process exits; the socket stays active for the next visit.
- There is no GitHub polling loop, resident watcher, public webhook, or public Madriguera ingress.

Because the host must remain zero-idle, a GitHub push is reconciled automatically on the **next cold visit**. This is the only automatic update model compatible with both no polling and no public ingress without adding an external wake job.

## Provider quarantine

As of 2026-10-02, **Vercel and Netlify are quarantined by explicit user order**.

- no Vercel deployment manifest;
- no Netlify deployment manifest;
- no provider-specific serverless entrypoint;
- no hosted provider is authoritative or pending work;
- reactivation requires a new explicit user order.

The React/Vite UI and provider-neutral cloud-control code remain intact so future hosted publication does not require reconstructing the product.

## Authority boundaries

- **PixelGaps/orchy-ui** owns the browser UI and local delivery package.
- **PixelGaps/orchy** owns backend/runtime APIs, Mission Core, ExecutionStore, Image Factory, LLM and ComfyUI behavior.
- **Jira OR** owns work state and acceptance.
- **TestOps** owns advanced assurance evidence.

## Local installation

From an exact checkout on Madriguera:

```bash
sudo bash scripts/install-local-socket.sh
```

Fast repository validation:

```bash
npm run test:local-runtime
bash -n scripts/local-deploy.sh scripts/install-local-socket.sh
systemd-analyze verify systemd/orchy-ui.socket systemd/orchy-ui.service
```

Full installation and live acceptance are documented in [docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md).

## Security

The local listener is bound to `tailscale0`; the installer refuses to create a wildcard/LAN fallback if that interface is absent. Browser-readable assets must never contain privileged secrets or canonical state.

A future hosted deployment must provide authenticated operator mediation and keep privileged secrets server-side. Repository visibility is not an authentication boundary.

Current implementation version: **2.0.0**.
