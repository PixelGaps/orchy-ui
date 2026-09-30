import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto"

import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"

import cloudControl from "./cloud/server"

const username = process.env.ORCHY_DASHBOARD_USER?.trim() || "dave"
const passwordHash =
  process.env.ORCHY_DASHBOARD_PASSWORD_SHA256?.trim() ||
  "bb64f8754396161581df85a577c28782c2dc129c4fd9f376bdf39d4e89d56dd1"

const sessionToken = createHmac("sha256", Buffer.from(passwordHash, "hex"))
  .update("orchy-control-session:v1")
  .digest("hex")

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function validCredentials(user: string, password: string): boolean {
  const suppliedHash = createHash("sha256")
    .update(password, "utf8")
    .digest("hex")

  return secureEqual(user, username) && secureEqual(suppliedHash, passwordHash)
}

function cookieValue(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return rest.join("=")
  }
  return null
}

function hasSession(cookieHeader: string | undefined): boolean {
  const token = cookieValue(cookieHeader, "orchy_session")
  return token !== null && secureEqual(token, sessionToken)
}

function loginPage(failed = false): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Orchy Control · Sign in</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f3f6fb;background:#0a0d12}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px}
main{width:min(100%,390px);border:1px solid #202837;border-radius:16px;background:#10151d;padding:24px}
small{color:#7dd3fc;font-weight:800;letter-spacing:.12em}h1{margin:8px 0 6px;font-size:28px}p{margin:0 0 20px;color:#97a3b6;line-height:1.5}
label{display:grid;gap:6px;margin:12px 0;color:#aab4c3;font-size:13px}
input{width:100%;border:1px solid #2b3545;border-radius:9px;background:#0c1118;color:#fff;padding:11px 12px;font:inherit}
button{width:100%;margin-top:10px;border:1px solid #38bdf8;border-radius:9px;background:#102536;color:#f4fbff;padding:11px 12px;font:inherit;font-weight:700;cursor:pointer}
.error{border:1px solid #642d31;border-radius:9px;background:#251317;color:#fecaca;padding:9px 10px;margin-bottom:12px;font-size:13px}
</style>
</head>
<body>
<main>
<small>ORCHY CLOUD CONTROL</small>
<h1>Operator sign in</h1>
<p>Private control surface. Authentication is required before dashboard or API access.</p>
${failed ? '<div class="error">Invalid username or password.</div>' : ""}
<form method="post" action="/login" autocomplete="on">
<label>Username<input name="username" autocomplete="username" required /></label>
<label>Password<input name="password" type="password" autocomplete="current-password" required /></label>
<button type="submit">Sign in</button>
</form>
</main>
</body>
</html>`
}

const app = new Hono()

app.get("/healthz", (context) =>
  context.json({ status: "ok", service: "orchy-control" }),
)

app.get("/login", (context) => {
  if (hasSession(context.req.header("Cookie"))) return context.redirect("/")
  return context.html(loginPage(false))
})

app.post("/login", async (context) => {
  const params = new URLSearchParams(await context.req.text())
  const suppliedUser = params.get("username") || ""
  const suppliedPassword = params.get("password") || ""

  if (!validCredentials(suppliedUser, suppliedPassword)) {
    return context.html(loginPage(true), 401)
  }

  context.header(
    "Set-Cookie",
    `orchy_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`,
  )
  return context.redirect("/")
})

app.post("/logout", (context) => {
  context.header(
    "Set-Cookie",
    "orchy_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
  )
  return context.redirect("/login")
})

app.use("*", async (context, next) => {
  if (hasSession(context.req.header("Cookie"))) {
    await next()
    return
  }

  if (context.req.path.startsWith("/api/")) {
    return context.json({ status: "unauthorized", code: "AUTH_REQUIRED" }, 401)
  }

  return context.redirect("/login")
})

app.route("/", cloudControl)
app.use("*", serveStatic({ root: "./dist" }))
app.get("*", serveStatic({ path: "./dist/index.html" }))

serve({
  fetch: app.fetch,
  hostname: "0.0.0.0",
  port: Number(process.env.PORT || "10000"),
})
