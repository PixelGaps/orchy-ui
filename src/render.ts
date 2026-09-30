import { serve } from "@hono/node-server"
import { Hono } from "hono"

const app = new Hono()

app.get("/healthz", (context) =>
  context.json({
    status: "retired",
    service: "orchy-ui",
    operator_ui: "notion",
  }),
)

app.all("*", (context) =>
  context.text(
    "This standalone Orchy dashboard is retired. The active operator UI is Notion.",
    410,
  ),
)

serve({
  fetch: app.fetch,
  hostname: "0.0.0.0",
  port: Number(process.env.PORT || "10000"),
})
