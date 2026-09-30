import { createHash, timingSafeEqual } from "node:crypto"

import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"

import cloudControl from "./cloud/server"

const username = process.env.ORCHY_DASHBOARD_USER?.trim() || "dave"
const passwordHash =
  process.env.ORCHY_DASHBOARD_PASSWORD_SHA256?.trim() ||
  "bb64f8754396161581df85a577c28782c2dc129c4fd9f376bdf39d4e89d56dd1"

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function isAuthorized(header: string | undefined): boolean {
  if (!header?.startsWith("Basic ")) return false

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8")
    const separator = decoded.indexOf(":")
    if (separator < 0) return false

    const suppliedUser = decoded.slice(0, separator)
    const suppliedPassword = decoded.slice(separator + 1)
    const suppliedHash = createHash("sha256")
      .update(suppliedPassword, "utf8")
      .digest("hex")

    return secureEqual(suppliedUser, username) && secureEqual(suppliedHash, passwordHash)
  } catch {
    return false
  }
}

const app = new Hono()

app.get("/healthz", (context) =>
  context.json({ status: "ok", service: "orchy-control" }),
)

app.use("*", async (context, next) => {
  if (!isAuthorized(context.req.header("Authorization"))) {
    context.header("WWW-Authenticate", 'Basic realm="Orchy Control", charset="UTF-8"')
    return context.text("Unauthorized", 401)
  }
  await next()
})

app.route("/", cloudControl)
app.use("*", serveStatic({ root: "./dist" }))
app.get("*", serveStatic({ path: "./dist/index.html" }))

serve({
  fetch: app.fetch,
  hostname: "0.0.0.0",
  port: Number(process.env.PORT || "10000"),
})
