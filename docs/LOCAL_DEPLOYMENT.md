# Madriguera local deployment

`orchy-ui` is currently local-first while Vercel publication is blocked. The local surface is private to Tailscale and uses systemd socket activation so the application process consumes no CPU/RAM while idle.

## Runtime contract

- `orchy-ui.socket` is the only permanently active UI unit. It listens on TCP `23236` bound to `tailscale0`.
- `orchy-ui.service` is **not enabled**. systemd starts it only when traffic reaches the socket.
- Before each cold start, `scripts/local-deploy.sh` fetches `origin/main`, resolves the exact `FETCH_HEAD` SHA, and rebuilds only when that SHA is not already deployed.
- The local production build sets `VITE_ORCHY_API_BASE_URL=/`. This keeps the complete private route set while browser API calls remain same-origin.
- The Node runtime serves the Vite `dist/` tree, falls back to `index.html` for SPA routes, and proxies `/api` to `ORCHY_WEB_API_TARGET` (default `http://127.0.0.1:23235`). HTTP streaming and `/api` WebSocket upgrades are passed through.
- After 300 seconds with no active HTTP request or upgraded connection, the Node process closes. The socket stays active and wakes it again on the next request.
- A static browser tab does not keep the service resident. Its already-loaded SPA continues to exist client-side; the next API/navigation request transparently wakes the service.
- There is no GitHub polling timer, resident watcher, public webhook, or public Madriguera listener. A GitHub change is therefore reconciled on the **next cold visit**. This is the only automatic update model compatible with both no-polling and private zero-idle operation without adding an external wake job.
- If GitHub fetch/build fails and a previously validated release exists, that stable release is served and the failed target is retried on the next activation. The currently deployed SHA is not replaced by a failed candidate.

## One-time installation

From an exact `PixelGaps/orchy-ui` checkout on Madriguera:

```bash
sudo bash scripts/install-local-socket.sh
```

The installer refuses to fall back to a wildcard/LAN listener if `tailscale0` is absent. It discovers an already-installed Node.js >=20.19 runtime that includes npm, copies that runtime into `/opt/orchy-ui/node-runtime`, and records `ORCHY_UI_NODE_BIN_DIR` in `/etc/orchy-ui.env`. This avoids depending on login-shell/NVM paths during later socket activations and does not install a global package. It performs deterministic build validation before enabling the socket and verifies the baseline state is `socket=active`, `service=inactive`.

Configuration lives in `/etc/orchy-ui.env`. The shipped defaults contain no secrets. The access boundary is the existing authenticated Tailscale/private operator path; repository visibility is not runtime authentication.

## Deterministic validation

Repository-level fast checks:

```bash
npm run test:local-runtime
bash -n scripts/local-deploy.sh scripts/install-local-socket.sh
systemd-analyze verify systemd/orchy-ui.socket systemd/orchy-ui.service
```

Live host acceptance after installation:

```bash
systemctl is-active orchy-ui.socket
systemctl is-active orchy-ui.service  # expected: inactive before a visit
ss -ltnp | grep ':23236'
```

Visit `http://<madriguera-tailscale-ip>:23236/` or request the local health endpoint:

```bash
curl http://<madriguera-tailscale-ip>:23236/_orchy/local-health
```

The health payload includes the exact deployed Git SHA. Validate a representative `/api` endpoint through the same origin, then stop generating traffic. After the configured idle interval:

```bash
systemctl is-active orchy-ui.service  # expected: inactive
systemctl is-active orchy-ui.socket   # expected: active
```

A second request must wake the service again. Also confirm the `23236` listener is bound to `tailscale0` and there is no resident `node` process once the service returns to idle.

## Publishing later

Hosted-provider manifests and entrypoints remain quarantined and are intentionally absent from the active deployment path. When the provider quarantine is explicitly lifted, hosted publication must be reintroduced as a new, reviewed change against the then-current provider requirements. Local socket activation remains the private zero-idle fallback; it does not become a second work-state or execution authority.
