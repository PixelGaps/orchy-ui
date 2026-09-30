import { Hono } from "hono"

import { cancelExecutionOperation, cloudSourceAdapters } from "./adapters"
import {
  PreferenceValidationError,
  validatePreferencePatch,
} from "./preferences"
import {
  readCachedSource,
  refreshSource,
  type SourceAdapter,
} from "./read-model"
import {
  assertDeploymentProtection,
  cloudControlEnvFromProcess,
  cloudOperatorIdentity,
  type CloudControlEnv,
} from "./security"
import { SupabaseCloudStore } from "./supabase-store"

const healthPayload = {
  status: "ok",
  service: "orchy-cloud-control",
  stack: "render+hono+react",
  mode: "operator-read-models",
  authority: "canonical-source-projections",
  auth: "render-basic-auth",
  cache: "supabase-dashboard-local",
} as const

export function createCloudApp(
  env: CloudControlEnv = cloudControlEnvFromProcess(),
  sourceAdapters: readonly SourceAdapter<unknown, CloudControlEnv>[] = cloudSourceAdapters,
  fetcher: typeof fetch = fetch,
) {
  const app = new Hono()
  const store = new SupabaseCloudStore(env, fetcher)
  const identity = cloudOperatorIdentity(env)

  app.use("/api/*", async (context, next) => {
    context.header("Cache-Control", "no-store")
    context.header("X-Content-Type-Options", "nosniff")
    context.header("Referrer-Policy", "no-referrer")
    try {
      assertDeploymentProtection(env)
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "RENDER_DEPLOYMENT_PROTECTION_UNCONFIRMED"
      return context.json({ status: "unavailable", code }, 503)
    }
    await next()
  })

  const adapterFor = (source: string) =>
    sourceAdapters.find((adapter) => adapter.source === source)

  app.get("/api/cloud-control/sources", async (context) => {
    const models = await Promise.all(
      sourceAdapters.map((adapter) => readCachedSource(adapter, store)),
    )
    return context.json({
      sources: models,
      cache: store.bound ? "supabase" : "unbound",
    })
  })

  app.get("/api/cloud-control/sources/:source", async (context) => {
    const source = context.req.param("source")
    const adapter = adapterFor(source)
    if (!adapter) {
      return context.json(
        { status: "not_found", code: "UNKNOWN_CLOUD_SOURCE" },
        404,
      )
    }
    return context.json(await readCachedSource(adapter, store))
  })

  app.post("/api/cloud-control/sources/:source/refresh", async (context) => {
    const source = context.req.param("source")
    const adapter = adapterFor(source)
    if (!adapter) {
      return context.json(
        { status: "not_found", code: "UNKNOWN_CLOUD_SOURCE" },
        404,
      )
    }
    const model = await refreshSource(
      adapter as SourceAdapter<unknown, CloudControlEnv>,
      env,
      store,
      fetcher,
    )
    return context.json(model, model.state === "unavailable" ? 503 : 200)
  })

  app.get("/api/cloud-control/preferences", async (context) =>
    context.json({
      preferences: await store.preferences(identity.subject),
      persistence: store.bound ? "supabase" : "unbound",
    }),
  )

  app.put("/api/cloud-control/preferences", async (context) => {
    if (!store.bound) {
      return context.json(
        { status: "unavailable", code: "SUPABASE_STORE_UNBOUND" },
        503,
      )
    }
    let raw: unknown
    try {
      raw = await context.req.json()
    } catch {
      return context.json(
        { status: "invalid", code: "PREFERENCES_PAYLOAD_INVALID" },
        400,
      )
    }
    try {
      const patch = validatePreferencePatch(raw)
      const preferences = await store.apply(identity.subject, patch)
      return context.json({ applied: true, preferences })
    } catch (error) {
      if (error instanceof PreferenceValidationError) {
        return context.json({ status: "invalid", code: error.code }, 400)
      }
      throw error
    }
  })

  app.delete("/api/cloud-control/preferences", async (context) => {
    if (!store.bound) {
      return context.json(
        { status: "unavailable", code: "SUPABASE_STORE_UNBOUND" },
        503,
      )
    }
    const preferences = await store.reset(identity.subject)
    return context.json({ reset: true, preferences })
  })

  app.post("/api/cloud-control/operations/:id/cancel", async (context) => {
    const id = context.req.param("id")
    try {
      const result = await cancelExecutionOperation(env, id, fetcher)
      await store.audit(
        identity.subject,
        "execution.cancel",
        id,
        result.ok ? "success" : "rejected",
        { reason: result.reason ?? null, state: result.state ?? null },
      )
      return context.json(result, result.ok ? 200 : 409)
    } catch (error) {
      const code =
        error instanceof Error && "code" in error
          ? String((error as { code?: unknown }).code ?? "OPERATION_CANCEL_FAILED")
          : "OPERATION_CANCEL_FAILED"
      await store.audit(identity.subject, "execution.cancel", id, "error", {
        code,
      })
      return context.json(
        { ok: false, code },
        code === "OPERATION_ID_INVALID" ? 400 : 503,
      )
    }
  })

  app.get("/api/health", (context) => context.json(healthPayload))
  app.get("/api/cloud-control/health", (context) => context.json(healthPayload))
  app.get("/api/cloud-control/whoami", (context) =>
    context.json({
      authenticated: true,
      subject: identity.subject,
      email: identity.email,
      issuer: identity.issuer,
    }),
  )

  app.all("/api/*", (context) =>
    context.json(
      {
        status: "unavailable",
        code: "CLOUD_ADAPTER_NOT_CONFIGURED",
        detail:
          "Cloud Control is online, but this API authority has not been migrated yet.",
      },
      503,
    ),
  )

  return app
}

const app = createCloudApp()

export default app
