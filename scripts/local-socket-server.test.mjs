import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { once } from "node:events"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { createLocalUiServer, inheritedSocketFd, isMainModule } from "./local-socket-server.mjs"

async function listen(server) {
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  return server.address().port
}

async function close(server) {
  if (!server.listening) return
  server.close()
  await once(server, "close")
}

test("symlinked release entrypoint is recognized as the executable module", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "orchy-ui-entrypoint-"))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const release = path.join(root, "releases", "sha")
  await fs.mkdir(release, { recursive: true })
  const real = path.join(release, "runtime.mjs")
  await fs.writeFile(real, "export default true\n")
  const current = path.join(root, "current")
  await fs.symlink(release, current, "dir")
  assert.equal(isMainModule(path.join(current, "runtime.mjs"), real), true)
  assert.equal(isMainModule(path.join(current, "runtime.mjs"), path.join(root, "other.mjs")), false)
})

test("inheritedSocketFd accepts only the current systemd service PID", () => {
  assert.equal(inheritedSocketFd({ LISTEN_FDS: "1", LISTEN_PID: "42" }, 42), 3)
  assert.equal(inheritedSocketFd({ LISTEN_FDS: "0", LISTEN_PID: "42" }, 42), null)
  assert.equal(inheritedSocketFd({ LISTEN_FDS: "1", LISTEN_PID: "41" }, 42), null)
})

test("local runtime serves SPA/static assets, health, and proxies the Orchy API", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "orchy-ui-runtime-"))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const dist = path.join(root, "dist")
  await fs.mkdir(dist)
  await fs.writeFile(path.join(dist, "index.html"), "<main>orchy-local</main>")
  await fs.writeFile(path.join(dist, "asset.txt"), "asset-ok")
  await fs.writeFile(path.join(root, "deployed-sha"), "abc123\n")

  const upstream = http.createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    response.setHeader("content-type", "application/json")
    response.end(JSON.stringify({ method: request.method, url: request.url, body: Buffer.concat(chunks).toString("utf8") }))
  })
  const upstreamPort = await listen(upstream)
  t.after(() => close(upstream))

  const runtime = createLocalUiServer({
    distDir: dist,
    shaFile: path.join(root, "deployed-sha"),
    apiTarget: `http://127.0.0.1:${upstreamPort}`,
    idleMs: 2_000,
  })
  runtime.listenStandalone()
  await once(runtime.server, "listening")
  t.after(() => close(runtime.server))
  const port = runtime.server.address().port

  const spa = await fetch(`http://127.0.0.1:${port}/deep/link`)
  assert.equal(spa.status, 200)
  assert.equal(await spa.text(), "<main>orchy-local</main>")

  const asset = await fetch(`http://127.0.0.1:${port}/asset.txt`)
  assert.equal(asset.status, 200)
  assert.equal(await asset.text(), "asset-ok")

  const proxied = await fetch(`http://127.0.0.1:${port}/api/echo?x=1`, {
    method: "POST",
    body: "hello",
    headers: { "content-type": "text/plain" },
  })
  assert.equal(proxied.status, 200)
  assert.deepEqual(await proxied.json(), { method: "POST", url: "/api/echo?x=1", body: "hello" })

  const health = await fetch(`http://127.0.0.1:${port}/_orchy/local-health`)
  assert.equal(health.status, 200)
  const payload = await health.json()
  assert.equal(payload.mode, "systemd-socket-activated")
  assert.equal(payload.deployedSha, "abc123")
  assert.equal(payload.idleSeconds, 2)
})

test("local runtime destroys itself after the configured idle interval", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "orchy-ui-idle-"))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.writeFile(path.join(root, "index.html"), "ok")
  const runtime = createLocalUiServer({ distDir: root, shaFile: path.join(root, "missing-sha"), idleMs: 80 })
  runtime.listenStandalone()
  await once(runtime.server, "listening")
  const closed = once(runtime.server, "close")
  await Promise.race([
    closed,
    new Promise((_, reject) => setTimeout(() => reject(new Error("runtime did not return to idle")), 1_000)),
  ])
  assert.equal(runtime.server.listening, false)
})

test("systemd units preserve the Madriguera zero-idle contract", async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const socketUnit = await fs.readFile(path.join(repoRoot, "systemd", "orchy-ui.socket"), "utf8")
  const serviceUnit = await fs.readFile(path.join(repoRoot, "systemd", "orchy-ui.service"), "utf8")
  const deployScript = await fs.readFile(path.join(repoRoot, "scripts", "local-deploy.sh"), "utf8")
  const installScript = await fs.readFile(path.join(repoRoot, "scripts", "install-local-socket.sh"), "utf8")
  const runScript = await fs.readFile(path.join(repoRoot, "scripts", "local-run.sh"), "utf8")

  assert.match(socketUnit, /ListenStream=23236/)
  assert.match(socketUnit, /BindToDevice=tailscale0/)
  assert.match(socketUnit, /Service=orchy-ui\.service/)
  assert.match(serviceUnit, /ExecStartPre=\/usr\/bin\/bash \/opt\/orchy-ui\/source\/scripts\/local-deploy\.sh/)
  assert.match(serviceUnit, /ExecStart=\/usr\/bin\/bash \/opt\/orchy-ui\/source\/scripts\/local-run\.sh/)
  assert.match(serviceUnit, /Restart=no/)
  assert.doesNotMatch(serviceUnit, /Restart=always/)
  assert.match(deployScript, /git -C "\$REPO_DIR" fetch .* origin "\$BRANCH"/)
  assert.match(deployScript, /ORCHY_UI_NODE_BIN_DIR/)
  assert.match(deployScript, /VITE_ORCHY_API_BASE_URL="\/" npm run build/)
  assert.match(installScript, /NODE_RUNTIME_DIR="\/opt\/orchy-ui\/node-runtime"/)
  assert.match(installScript, /ORCHY_UI_NODE_BIN_DIR=/)
  assert.match(runScript, /ORCHY_UI_NODE_BIN_DIR/)
  assert.match(runScript, /exec node \/var\/lib\/orchy-ui\/current\/local-socket-server\.mjs/)
  assert.doesNotMatch(deployScript, /while\s+true|sleep\s+[0-9]/)
  assert.doesNotMatch(runScript, /while\s+true|sleep\s+[0-9]/)
})
