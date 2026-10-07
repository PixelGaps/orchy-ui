import { expect, test, type Page } from "@playwright/test"

const NOW = "2026-10-06T13:36:00Z"
const ASSURANCE = [
  ["OR-590","01-fast-web"],["OR-594","02-fast-python"],["OR-598","03-property-state"],
  ["OR-600","04-security"],["OR-601","05-fuzz"],["OR-602","06-performance"],
  ["OR-603","07-portability"],["OR-604","08-flakes"],["OR-605","09-coverage-static"],
  ["OR-606","10-mutation"],["OR-607","11-browser-e2e"],["OR-608","12-chaos-soak"],
] as const

function jiraIssue(key:string,index=0) {
  return {
    key, summary:`Acceptance issue ${key}`, status:"To Do", statusCategory:"To Do",
    priority:index % 2 ? "High" : "Highest", type:"Task", parentKey:null, labels:[],
    browseUrl:`https://example.invalid/browse/${key}`, updated:NOW,
  }
}

function source(source:string,payload:unknown) {
  return { source, authority:`${source} authority`, state:"fresh", observedAt:NOW, ageSeconds:0, payload, errorCode:null }
}

const allowed = { allowed:true, reason:"accepted" }
const policy = {
  policy_version:"v1", classification:"LIVE", health:"live", reason:"healthy", stale:false,
  age_seconds:1, claim_age_seconds:null,
  thresholds:{ queued_old_seconds:300, running_abandoned_seconds:900, worker_fresh_seconds:120 },
  queue:{ present:true, visible:true, lease_active:false, visible_at:NOW, read_count:0 },
  worker:{ host_id:"madriguera", last_seen_at:NOW, age_seconds:1, fresh:true },
  recovery:{ eligible:false, action:null, reason:"healthy", descriptor_replayable:true, descendant_exists:false, guard:"none" },
  capabilities:{ cancel:allowed, pause:allowed, resume:allowed, retry:allowed, rerun:allowed },
}
const job = {
  id:"job-1", repo:"orchy", job:"browser acceptance", target_sha:"a".repeat(40),
  request_id:"req-1", host_id:"madriguera", status:"running", created_at:NOW,
  claimed_at:NOW, finished_at:null, queue_msg_id:1, retry_of:null, policy,
}

async function mockApi(page:Page) {
  const assuranceIssues = ASSURANCE.map(([key],i)=>jiraIssue(key,i))
  const extraIssues = Array.from({length:85},(_,i)=>jiraIssue(`OR-${2000+i}`,i))
  const jira = { openCount:97, byStatus:{"To Do":97}, issues:[...assuranceIssues,...extraIssues] }
  const testops = {
    target:"orchy",
    layers:ASSURANCE.map(([key,layerId],i)=>({
      layerId, runId:`run-${i+1}`, revision:"a".repeat(40), outcome:"PASS",
      finishedAt:NOW, durationMs:1000+i, jiraMilestone:key,
    })),
    findings:[],
  }
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    let body:unknown = {}
    if (path === "/api/cloud-control/sources/jira") body = source("jira",jira)
    else if (path === "/api/cloud-control/sources/testops") body = source("testops",testops)
    else if (path === "/api/cloud-control/sources/operations") body = source("operations",{operations:[]})
    else if (path === "/api/cloud-control/sources/fleet") body = source("fleet",{providers:[{
      provider:"circleci",priority:1,limitRunnerMinutes:30000,reservationRunnerMinutes:0,
      remainingRunnerMinutes:25000,qualified:true,status:"ready",observedAt:NOW,resetAt:"2026-11-01T00:00:00Z",
      offlineUntil:null,maxAgeSeconds:86400,metadata:{},
    }]})
    else if (path === "/api/cloud-control/sources/host") body = source("host",{
      hostId:"madriguera",state:"online",lastSeenAt:NOW,controlPlaneVersion:"test",
      sourceSha:"a".repeat(40),machineControlState:"ready",machineControlLastSeenAt:NOW,
    })
    else if (path === "/api/gateway/health") body = {
      available:true,status:"live",reason:"",dashboard_url:null,observed_at:NOW,
      metrics:{queue_length:1,queue_visible_length:1,scrape_time:NOW},stale_count:0,
      ledger_queue_mismatches:0,oldest_pending_age_seconds:1,workers:[{host_id:"madriguera",last_seen_at:NOW,version:"v1",age_seconds:1,fresh:true}],
    }
    else if (path === "/api/gateway/jobs") body = {
      available:true,status:"active",reason:"",dashboard_url:null,jobs:[job],total_count:1,
      has_more:false,next_cursor:null,limit:50,order:"created_at_desc,id_desc",filters:{},
    }
    else if (path === "/api/gateway/jobs/job-1") body = {...job,params_bytes:2,params_preview:"{}",result:null,error:null,lineage:[],audit:[]}
    else if (path === "/api/operator/overview") body = { quotas:[] }
    else if (path.startsWith("/api/configuration/")) body = { section:path.split("/").at(-1) || "global", fields:[] }
    else if (path === "/api/image-factory/lineage") body = { path:"", candidates:[] }
    else if (path === "/api/image-factory/gallery") body = {
      schema:"v1",updated_at:0,summary:{publish_ready_packs:0,passed_artifacts:0,failed_artifacts:0,passed_layers:0,failed_layers:0},
      publish_ready:[],passed:{},failed:{},
    }
    else if (path === "/api/image-factory/profiles") body = {}
    else if (path === "/api/executions") body = []
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(body)})
  })
}

async function noOverflow(page:Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test("OR-983 Issues bounds initial DOM to 40 rows", async ({page}) => {
  await page.setViewportSize({width:1280,height:800}); await mockApi(page); await page.goto("/issues")
  await expect(page.locator(".issue-row")).toHaveCount(40)
  await expect(page.getByRole("button",{name:/Show 40 more/})).toBeVisible()
  await page.getByRole("button",{name:/Show 40 more/}).click()
  await expect(page.locator(".issue-row")).toHaveCount(80)
})

test("OR-983 Image Factory lazy-mounts advanced content", async ({page}) => {
  await page.setViewportSize({width:1280,height:800}); await mockApi(page); await page.goto("/image-factory")
  const section=page.locator(".factory-policy-details")
  const trigger=section.getByRole("button",{name:/Profile & advanced controls/})
  await expect(trigger).toHaveAttribute("aria-expanded","false")
  const contentId=await trigger.getAttribute("aria-controls")
  expect(contentId).toBeTruthy()
  const content=page.locator(`#${contentId}`)
  expect(await content.evaluate(el=>el.childElementCount)).toBe(0)
  await trigger.click()
  expect(await content.evaluate(el=>el.childElementCount)).toBeGreaterThan(0)
})

test("OR-983 Queue mobile uses one-pane master/detail flow", async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await mockApi(page); await page.goto("/queue")
  await expect(page.locator(".queue-master-card")).toBeVisible()
  await expect(page.locator(".queue-detail-card")).toBeHidden()
  await page.getByRole("button",{name:"Inspect req-1"}).click()
  await expect(page.locator(".queue-master-card")).toBeHidden()
  await expect(page.locator(".queue-detail-card")).toBeVisible()
  const back=page.getByRole("button",{name:"Back to queue"})
  expect((await back.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  await back.click()
  await expect(page.locator(".queue-master-card")).toBeVisible()
  await noOverflow(page)
})

test("OR-983 Assurance scans 12 compact rows and expands evidence on demand", async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await mockApi(page); await page.goto("/assurance")
  const layers=page.locator("details.assurance-layer")
  await expect(layers).toHaveCount(12)
  expect(await layers.evaluateAll(items=>items.filter(item=>(item as HTMLDetailsElement).open).length)).toBe(0)
  const first=layers.first()
  await expect(first.locator(".assurance-layer-metrics")).toBeHidden()
  await first.locator("summary.assurance-layer-summary").click()
  await expect(first.locator(".assurance-layer-metrics")).toBeVisible()
  await noOverflow(page)
})

test("OR-983 Missions has no 390px horizontal overflow", async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await mockApi(page); await page.goto("/missions")
  await expect(page.getByRole("heading",{name:"Missions",exact:true})).toBeVisible()
  await noOverflow(page)
})

for (const viewport of [{name:"desktop",width:1280,height:800},{name:"mobile",width:390,height:844}]) {
  test(`OR-983 Settings separates registry from live readiness on ${viewport.name}`, async ({page}) => {
    await page.setViewportSize({width:viewport.width,height:viewport.height}); await mockApi(page); await page.goto("/settings")
    const registry=page.getByRole("button",{name:/Declarative surface registry/})
    await expect(registry).toHaveAttribute("aria-expanded","false")
    await registry.click()
    await expect(page.locator(".operator-parity-item")).toHaveCount(12)
    const readiness=page.getByRole("button",{name:/Live readiness/})
    await expect(readiness).toHaveAttribute("aria-expanded","true")
    await expect(page.locator(".operator-readiness-item")).toHaveCount(5)
    await expect(page.locator(".operator-live-readiness")).toContainText("fresh")
    if (viewport.name==="mobile") {
      expect((await readiness.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
      expect((await registry.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
      await noOverflow(page)
    }
  })
}
