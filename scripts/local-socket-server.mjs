import { createReadStream } from "node:fs"
import { promises as fs } from "node:fs"
import http from "node:http"
import https from "node:https"
import net from "node:net"
import path from "node:path"
import tls from "node:tls"
import { fileURLToPath } from "node:url"

const DEFAULT_IDLE_MS = 300_000
const DEFAULT_API_TARGET = "http://127.0.0.1:23235"
const DEFAULT_DIST_DIR = "/var/lib/orchy-ui/current/dist"
const DEFAULT_SHA_FILE = "/var/lib/orchy-ui/deployed-sha"

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
])

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function inheritedSocketFd(env = process.env, pid = process.pid) {
  const count = Number.parseInt(env.LISTEN_FDS ?? "0", 10)
  const listenPid = Number.parseInt(env.LISTEN_PID ?? "0", 10)
  if (count < 1 || listenPid !== pid) return null
  return 3
}

function securityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff")
  response.setHeader("Referrer-Policy", "no-referrer")
  response.setHeader("X-Frame-Options", "DENY")
}

function proxyHeaders(requestHeaders, upstream) {
  const result = {}
  for (const [name, value] of Object.entries(requestHeaders)) {
    if (value === undefined || HOP_BY_HOP.has(name.toLowerCase())) continue
    result[name] = value
  }
  result.host = upstream.host
  result["x-forwarded-proto"] = "http"
  return result
}

function upstreamUrl(requestUrl, apiTarget) {
  return new URL(requestUrl || "/", apiTarget)
}

function proxyHttp(request, response, apiTarget) {
  const upstream = upstreamUrl(request.url, apiTarget)
  const transport = upstream.protocol === "https:" ? https : http
  const proxyRequest = transport.request(
    upstream,
    {
      method: request.method,
      headers: proxyHeaders(request.headers, upstream),
    },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers)
      proxyResponse.pipe(response)
    },
  )

  proxyRequest.on("error", (error) => {
    if (response.headersSent) {
      response.destroy(error)
      return
    }
    securityHeaders(response)
    response.writeHead(502, { "content-type": "application/json; charset=utf-8" })
    response.end(JSON.stringify({ status: "unavailable", code: "ORCHY_API_PROXY_FAILED" }))
  })
  request.pipe(proxyRequest)
}

function rawUpgradeHeaders(request, upstream) {
  const lines = [`${request.method ?? "GET"} ${request.url ?? "/"} HTTP/${request.httpVersion}`]
  let sawHost = false
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const name = request.rawHeaders[index]
    const value = request.rawHeaders[index + 1]
    if (name.toLowerCase() === "host") {
      lines.push(`Host: ${upstream.host}`)
      sawHost = true
    } else {
      lines.push(`${name}: ${value}`)
    }
  }
  if (!sawHost) lines.push(`Host: ${upstream.host}`)
  return `${lines.join("\r\n")}\r\n\r\n`
}

function proxyUpgrade(request, clientSocket, head, apiTarget, finishActivity) {
  const upstream = upstreamUrl(request.url, apiTarget)
  const port = Number(upstream.port || (upstream.protocol === "https:" ? 443 : 80))
  const options = { host: upstream.hostname, port }
  const upstreamSocket = upstream.protocol === "https:"
    ? tls.connect({ ...options, servername: upstream.hostname })
    : net.connect(options)

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    finishActivity()
  }
  clientSocket.once("close", finish)
  upstreamSocket.once("close", finish)

  upstreamSocket.once("connect", () => {
    upstreamSocket.write(rawUpgradeHeaders(request, upstream))
    if (head.length) upstreamSocket.write(head)
    clientSocket.pipe(upstreamSocket).pipe(clientSocket)
  })
  upstreamSocket.once("error", () => {
    if (!clientSocket.destroyed) {
      clientSocket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n")
    }
    finish()
  })
  clientSocket.once("error", () => {
    upstreamSocket.destroy()
    finish()
  })
}

function safeStaticPath(distDir, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const relative = decoded.replace(/^\/+/, "")
  const candidate = path.resolve(distDir, relative || "index.html")
  const root = `${path.resolve(distDir)}${path.sep}`
  if (candidate !== path.resolve(distDir) && !candidate.startsWith(root)) return null
  return candidate
}

async function serveFile(request, response, filePath, cacheControl) {
  const stat = await fs.stat(filePath)
  if (!stat.isFile()) return false
  securityHeaders(response)
  response.statusCode = 200
  response.setHeader("Content-Type", MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream")
  response.setHeader("Content-Length", String(stat.size))
  response.setHeader("Cache-Control", cacheControl)
  if (request.method === "HEAD") {
    response.end()
    return true
  }
  createReadStream(filePath).pipe(response)
  return true
}

async function serveStatic(request, response, distDir) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    securityHeaders(response)
    response.writeHead(405, { Allow: "GET, HEAD" })
    response.end()
    return
  }

  const url = new URL(request.url ?? "/", "http://orchy.local")
  const candidate = safeStaticPath(distDir, url.pathname)
  if (!candidate) {
    securityHeaders(response)
    response.writeHead(400)
    response.end("Bad request")
    return
  }

  try {
    const immutable = /\.[A-Za-z0-9_-]{8,}\.(?:css|js|woff2?)$/i.test(path.basename(candidate))
    if (await serveFile(request, response, candidate, immutable ? "public, max-age=31536000, immutable" : "no-cache")) return
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error
  }

  try {
    await serveFile(request, response, path.join(distDir, "index.html"), "no-cache")
  } catch (error) {
    if (error?.code !== "ENOENT") throw error
    securityHeaders(response)
    response.writeHead(503, { "content-type": "text/plain; charset=utf-8" })
    response.end("Orchy UI build is unavailable")
  }
}

async function readDeployedSha(shaFile) {
  try {
    return (await fs.readFile(shaFile, "utf8")).trim() || null
  } catch (error) {
    if (error?.code === "ENOENT") return null
    throw error
  }
}

export function createLocalUiServer({
  distDir = process.env.ORCHY_UI_DIST_DIR || DEFAULT_DIST_DIR,
  apiTarget = process.env.ORCHY_WEB_API_TARGET || DEFAULT_API_TARGET,
  shaFile = process.env.ORCHY_UI_DEPLOYED_SHA_FILE || DEFAULT_SHA_FILE,
  idleMs = positiveInteger(process.env.ORCHY_UI_IDLE_MS, positiveInteger(process.env.ORCHY_UI_IDLE_SECONDS, DEFAULT_IDLE_MS / 1000) * 1000),
  now = () => Date.now(),
} = {}) {
  const apiBase = new URL(apiTarget)
  if (apiBase.protocol !== "http:" && apiBase.protocol !== "https:") {
    throw new Error("ORCHY_WEB_API_TARGET must use http or https")
  }

  let lastActivity = now()
  let activeRequests = 0
  let activeUpgrades = 0
  let shuttingDown = false
  const startedAt = new Date().toISOString()

  const beginActivity = (kind = "request") => {
    lastActivity = now()
    if (kind === "upgrade") activeUpgrades += 1
    else activeRequests += 1
    let done = false
    return () => {
      if (done) return
      done = true
      lastActivity = now()
      if (kind === "upgrade") activeUpgrades = Math.max(0, activeUpgrades - 1)
      else activeRequests = Math.max(0, activeRequests - 1)
    }
  }

  const server = http.createServer((request, response) => {
    const finish = beginActivity()
    response.once("finish", finish)
    response.once("close", finish)

    void (async () => {
      const url = new URL(request.url ?? "/", "http://orchy.local")
      if (url.pathname === "/_orchy/local-health") {
        const deployedSha = await readDeployedSha(shaFile)
        securityHeaders(response)
        response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" })
        response.end(JSON.stringify({
          status: "ok",
          service: "orchy-ui",
          mode: "systemd-socket-activated",
          startedAt,
          deployedSha,
          idleSeconds: Math.round(idleMs / 1000),
          activeRequests,
          activeUpgrades,
        }))
        return
      }
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        proxyHttp(request, response, apiTarget)
        return
      }
      await serveStatic(request, response, distDir)
    })().catch((error) => {
      if (response.headersSent) {
        response.destroy(error)
        return
      }
      securityHeaders(response)
      response.writeHead(500, { "content-type": "application/json; charset=utf-8" })
      response.end(JSON.stringify({ status: "error", code: "LOCAL_UI_INTERNAL_ERROR" }))
    })
  })

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://orchy.local")
    if (!(url.pathname === "/api" || url.pathname.startsWith("/api/"))) {
      socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n")
      return
    }
    const finish = beginActivity("upgrade")
    proxyUpgrade(request, socket, head, apiTarget, finish)
  })

  const intervalMs = Math.min(1_000, Math.max(25, Math.floor(idleMs / 2)))
  const idleTimer = setInterval(() => {
    if (shuttingDown || activeRequests > 0 || activeUpgrades > 0) return
    if (now() - lastActivity < idleMs) return
    shuttingDown = true
    server.close()
  }, intervalMs)

  server.once("close", () => clearInterval(idleTimer))

  return {
    server,
    idleMs,
    listenOnInheritedSocket(fd) {
      server.listen({ fd })
      return server
    },
    listenStandalone({ host = "127.0.0.1", port = 0 } = {}) {
      server.listen(port, host)
      return server
    },
  }
}

async function main() {
  const runtime = createLocalUiServer()
  const fd = inheritedSocketFd()
  if (fd !== null) {
    runtime.listenOnInheritedSocket(fd)
    return
  }
  if (process.env.ORCHY_UI_ALLOW_STANDALONE === "1") {
    const port = positiveInteger(process.env.ORCHY_UI_PORT, 23236)
    runtime.listenStandalone({ host: process.env.ORCHY_UI_HOST || "127.0.0.1", port })
    return
  }
  throw new Error("orchy-ui requires systemd socket activation (LISTEN_FDS=1)")
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
