import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { basicAuth } from "hono/basic-auth"

import cloudControl from "./cloud/server"

const username = process.env.ORCHY_DASHBOARD_USER?.trim()
const password = process.env.ORCHY_DASHBOARD_PASSWORD?.trim()

if (!username || !password) {
  throw new Error("ORCHY_DASHBOARD_AUTH_REQUIRED")
}

const app = new Hono()

app.get("/healthz", (context) =>
  context.json({ status: "ok", service: "orchy-control" }),
)

app.use(
  "*",
  basicAuth({
    username,
    password,
  }),
)

app.route("/", cloudControl)
app.use("*", serveStatic({ root: "./dist" }))
app.get("*", serveStatic({ path: "./dist/index.html" }))

serve({
  fetch: app.fetch,
  hostname: "0.0.0.0",
  port: Number(process.env.PORT || "10000"),
})
