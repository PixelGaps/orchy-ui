const base = (process.env.ORCHY_LIVE_BASE_URL || "http://100.92.206.7:23236").replace(/\/$/, "");

async function json(path) {
  const response = await fetch(base + path, { headers: { accept: "application/json" } });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); }
  catch { throw new Error(`${path} returned non-JSON HTTP ${response.status}`); }
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${JSON.stringify(body).slice(0,300)}`);
  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [];

async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    checks.push({ name, status: "PASS", ms: Date.now() - started, detail });
  } catch (error) {
    checks.push({ name, status: "FAIL", ms: Date.now() - started, detail: error instanceof Error ? error.message : String(error) });
  }
}

await check("ui-local-health", async () => {
  const body = await json("/_orchy/local-health");
  assert(body.status === "ok", "UI local health is not ok");
  assert(typeof body.deployedSha === "string" && /^[0-9a-f]{40}$/.test(body.deployedSha), "UI deployed SHA missing");
  return { deployedSha: body.deployedSha };
});

await check("backend-health", async () => {
  const body = await json("/api/health");
  assert(body.service === "orchy-web", "unexpected backend service");
  assert(typeof body.build_sha === "string" && /^[0-9a-f]{40}$/.test(body.build_sha), "backend build SHA missing");
  return { buildSha: body.build_sha };
});

await check("jira-live", async () => {
  const body = await json("/api/cloud-control/sources/jira");
  assert(body.state === "fresh", `Jira is ${body.state || "unknown"} (${body.errorCode || "no-code"})`);
  assert(body.payload && Array.isArray(body.payload.issues), "Jira issues payload missing");
  return { issues: body.payload.issues.length, ageSeconds: body.ageSeconds };
});

await check("github-live", async () => {
  const body = await json("/api/cloud-control/sources/github");
  assert(["fresh", "stale"].includes(body.state), `GitHub is ${body.state || "unknown"}`);
  assert(body.payload && typeof body.payload.repository === "string", "GitHub projection missing");
  return { repository: body.payload.repository, ageSeconds: body.ageSeconds };
});

await check("host-live", async () => {
  const body = await json("/api/cloud-control/sources/host");
  assert(body.state === "fresh", `Host projection is ${body.state || "unknown"}`);
  assert(body.payload && typeof body.payload.hostId === "string", "Host projection missing");
  return { hostId: body.payload.hostId, ageSeconds: body.ageSeconds };
});

await check("testops-explicit", async () => {
  const body = await json("/api/cloud-control/sources/testops");
  assert(["fresh", "stale", "unavailable"].includes(body.state), "TestOps state invalid");
  if (body.state !== "unavailable") assert(body.payload && Array.isArray(body.payload.layers), "TestOps layers missing");
  return { state: body.state, layers: body.payload?.layers?.length ?? 0 };
});

await check("queue-health", async () => {
  const body = await json("/api/gateway/health");
  assert(body.available === true, `Queue unavailable: ${body.reason || body.status || "unknown"}`);
  assert(body.status === "live", `Queue status is ${body.status || "unknown"}`);
  return { status: body.status, workers: Array.isArray(body.workers) ? body.workers.length : 0 };
});

await check("queue-jobs", async () => {
  const body = await json("/api/gateway/jobs?limit=1");
  assert(body.available === true, `Queue jobs unavailable: ${body.reason || body.status || "unknown"}`);
  assert(Array.isArray(body.jobs), "Queue jobs missing");
  return { status: body.status, jobs: body.jobs.length };
});

const shapeChecks = [
  ["repositories", "/api/repositories", Array.isArray],
  ["missions", "/api/missions", Array.isArray],
  ["executions", "/api/executions", Array.isArray],
  ["healthchecks", "/api/healthchecks", Array.isArray],
  ["image-gallery", "/api/image-factory/gallery", (v) => v && typeof v === "object" && !Array.isArray(v)],
  ["llm", "/api/llm", (v) => v && typeof v === "object" && !Array.isArray(v)],
  ["comfyui", "/api/comfyui", (v) => v && typeof v === "object" && !Array.isArray(v)],
  ["logs", "/api/logs", (v) => v && typeof v === "object" && !Array.isArray(v)],
];

for (const [name, path, valid] of shapeChecks) {
  await check(name, async () => {
    const body = await json(path);
    assert(valid(body), `${path} returned unexpected shape`);
    return { shape: Array.isArray(body) ? "array" : "object" };
  });
}

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({
  schema: "orchy-ui.live-dashboard-readiness.v1",
  base,
  status: failed.length ? "FAIL" : "PASS",
  checks,
}, null, 2));
if (failed.length) process.exit(1);
