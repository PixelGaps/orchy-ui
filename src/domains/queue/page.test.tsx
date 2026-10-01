import { fireEvent,render,screen,waitFor,within } from "@testing-library/react"
import { QueryClient,QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { afterEach,describe,expect,it,vi } from "vitest"

import type { GatewayJobDetail,GatewayQueueHealth,GatewayQueueList } from "@/lib/contracts"
import { QueuePage,actionConfirmation,actionLabel,ageLabel,bulkActionAllowed,dispatchBulkQueueAction,dispatchQueueAction,safeIso,tone } from "./page"

const policy={
  policy_version:"qops-02.v1",
  classification:"TERMINAL",
  health:"terminal",
  reason:"terminal execution evidence retained",
  stale:false,
  age_seconds:120,
  claim_age_seconds:100,
  thresholds:{queued_old_seconds:600,running_abandoned_seconds:1500,worker_fresh_seconds:300},
  queue:{present:false,visible:null,lease_active:false,visible_at:null,read_count:null},
  worker:{host_id:"local-host",last_seen_at:"2026-09-27T00:30:00Z",age_seconds:30,fresh:true},
  recovery:{eligible:false,action:null,reason:"no stale recovery is required",descriptor_replayable:true,descendant_exists:false,guard:"exact-sha"},
  capabilities:{
    cancel:{allowed:false,reason:"not queued"},
    pause:{allowed:false,reason:"not pausable"},
    resume:{allowed:false,reason:"not paused"},
    retry:{allowed:true,reason:"terminal failure"},
    rerun:{allowed:true,reason:"retained exact-SHA descriptor"},
  },
} as const

const detail:GatewayJobDetail={
  id:"11111111-1111-1111-1111-111111111111",
  repo:"orchy",
  job:"docs-contract",
  target_sha:"1234567890abcdef1234567890abcdef12345678",
  request_id:"qops-test",
  host_id:"local-host",
  status:"fail",
  created_at:"2026-09-27T00:28:00Z",
  claimed_at:"2026-09-27T00:28:05Z",
  finished_at:"2026-09-27T00:28:10Z",
  queue_msg_id:1500,
  retry_of:null,
  policy,
  params_bytes:2,
  params_preview:"{}",
  result:{status:"FAIL"},
  error:"boom",
  lineage:[{id:"11111111-1111-1111-1111-111111111111",status:"fail",created_at:"2026-09-27T00:28:00Z",retry_of:null,request_id:"qops-test",relation:"self",depth:0}],
  audit:[],
}

const list:GatewayQueueList={
  available:true,status:"active",reason:"",dashboard_url:"https://supabase.com/dashboard/project/example/integrations/queues/queues",
  jobs:[detail],total_count:1,has_more:false,next_cursor:null,limit:50,order:"created_at_desc,id_desc",filters:{},
}
const health:GatewayQueueHealth={
  available:true,status:"live",reason:"",dashboard_url:list.dashboard_url,
  observed_at:"2026-09-27T00:31:00Z",
  metrics:{queue_length:0,queue_visible_length:0,scrape_time:"2026-09-27T00:31:00Z"},
  stale_count:0,ledger_queue_mismatches:0,oldest_pending_age_seconds:null,
  workers:[{host_id:"local-host",last_seen_at:"2026-09-27T00:30:30Z",version:"4",age_seconds:30,fresh:true}],
}

function jsonResponse(payload:unknown,status=200){
  return Promise.resolve(new Response(JSON.stringify(payload),{status,headers:{"Content-Type":"application/json"}}))
}

function renderQueue(fetchMock:ReturnType<typeof vi.fn>){
  vi.stubGlobal("fetch",fetchMock)
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}><QueuePage /></QueryClientProvider>
    </MemoryRouter>,
  )
}

afterEach(()=>vi.restoreAllMocks())

describe("queue action dispatch policy",()=>{
  it("fails closed, confirms destructive actions, and reuses single-action operation ids",()=>{
    const notify=vi.fn()
    const mutate=vi.fn()
    const confirm=vi.fn(()=>true)
    const inFlight=new Map<string,string>()
    const uuid=vi.fn(()=> "uuid-1")

    expect(dispatchQueueAction(detail,"cancel",{confirm,notify,mutate,inFlight,uuid})).toBe(false)
    expect(notify).toHaveBeenCalledWith("not queued","error")
    const noReason={...detail,policy:{...policy,capabilities:{...policy.capabilities,cancel:{allowed:false,reason:""}}}} as any
    expect(dispatchQueueAction(noReason,"cancel",{confirm,notify,mutate,inFlight,uuid})).toBe(false)
    expect(notify).toHaveBeenLastCalledWith("Action is not allowed by queue policy","error")
    expect(mutate).not.toHaveBeenCalled()

    const allowed={...detail,policy:{...policy,capabilities:{...policy.capabilities,cancel:{allowed:true,reason:"allowed"}}}} as any
    confirm.mockReturnValueOnce(false)
    expect(dispatchQueueAction(allowed,"cancel",{confirm,notify,mutate,inFlight,uuid})).toBe(false)
    expect(mutate).not.toHaveBeenCalled()

    expect(dispatchQueueAction(allowed,"pause",{confirm,notify,mutate,inFlight,uuid})).toBe(false)
    expect(notify).toHaveBeenLastCalledWith("not pausable","error")

    const retryable={...detail,policy:{...policy,capabilities:{...policy.capabilities,retry:{allowed:true,reason:"allowed"}}}} as any
    confirm.mockReturnValue(true)
    expect(dispatchQueueAction(retryable,"retry",{confirm,notify,mutate,inFlight,uuid})).toBe(true)
    expect(mutate).toHaveBeenLastCalledWith({id:detail.id,action:"retry",operationId:"web-retry-uuid-1"})
    expect(dispatchQueueAction(retryable,"retry",{confirm,notify,mutate,inFlight,uuid})).toBe(true)
    expect(mutate).toHaveBeenLastCalledWith({id:detail.id,action:"retry",operationId:"web-retry-uuid-1"})
    expect(uuid).toHaveBeenCalledTimes(1)
  })

  it("fails closed and dispatches only shared-safe bulk actions",()=>{
    const notify=vi.fn()
    const mutate=vi.fn()
    const confirm=vi.fn(()=>true)
    const uuid=vi.fn(()=> "bulk-uuid")
    expect(bulkActionAllowed([],"pause")).toBe(false)
    expect(bulkActionAllowed([detail],"pause")).toBe(false)
    expect(dispatchBulkQueueAction([detail],"pause",{confirm,notify,mutate,uuid})).toBe(false)
    expect(notify).toHaveBeenCalledWith("Selected jobs do not share this safe action","error")

    const allowed={...detail,policy:{...policy,capabilities:{...policy.capabilities,cancel:{allowed:true,reason:"allowed"},pause:{allowed:true,reason:"allowed"}}}} as any
    expect(bulkActionAllowed([allowed],"pause")).toBe(true)
    expect(dispatchBulkQueueAction([allowed],"pause",{confirm,notify,mutate,uuid})).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    expect(mutate).toHaveBeenLastCalledWith({ids:[detail.id],action:"pause",operationId:"web-bulk-pause-bulk-uuid"})

    confirm.mockReturnValueOnce(false)
    expect(dispatchBulkQueueAction([allowed],"cancel",{confirm,notify,mutate,uuid})).toBe(false)
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})

describe("QueuePage",()=>{

  it("covers Queue pure policy and formatting branches",()=>{
    expect(tone("pass")).toBe("live")
    expect(tone("fail")).toBe("danger")
    expect(tone("running")).toBe("warn")
    expect(tone("cancelled")).toBe("neutral")
    expect(tone("mystery")).toBe("cyan")

    expect(ageLabel(null)).toBe("—")
    expect(ageLabel(30)).toBe("30s")
    expect(ageLabel(120)).toBe("2m")
    expect(ageLabel(7200)).toBe("2h")
    expect(ageLabel(172800)).toBe("2d")

    expect(actionLabel("rerun")).toBe("Rerun fresh")
    expect(actionLabel("retry")).toBe("Retry fresh")
    expect(actionLabel("pause")).toBe("Pause")

    expect(actionConfirmation("cancel")).toContain("Cancel 1 queued job?")
    expect(actionConfirmation("cancel",2)).toContain("2 queued jobs?")
    expect(actionConfirmation("retry")).toContain("terminal job as fresh execution?")
    expect(actionConfirmation("retry",2)).toContain("terminal jobs as fresh executions?")
    expect(actionConfirmation("rerun")).toContain("1 job from retained reviewed exact-SHA descriptor?")
    expect(actionConfirmation("rerun",2)).toContain("2 jobs from retained reviewed exact-SHA descriptors?")
    expect(actionConfirmation("pause")).toBe("")

    expect(safeIso("")).toBe("")
    expect(safeIso("not-a-date")).toBe("")
    expect(safeIso("2026-09-29T04:00")).toMatch(/^2026-09-29T/)
  })


  it("renders authoritative health, full job detail, lineage and capability reasons",async()=>{
    const fetchMock=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(detail)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse(list)
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(fetchMock)
    expect(await screen.findByRole("heading",{name:"Queue"})).toBeInTheDocument()
    expect(await screen.findByText("docs-contract")).toBeInTheDocument()
    expect(await screen.findByText("TERMINAL")).toBeInTheDocument()
    expect(screen.getAllByText("qops-test").length).toBeGreaterThan(0)
    expect(screen.getByText("local-host")).toBeInTheDocument()
    const deniedCancel=screen.getByRole("button",{name:"Cancel"}) as HTMLButtonElement
    expect(deniedCancel).toBeDisabled()
    deniedCancel.disabled=false
    fireEvent.click(deniedCancel)
    expect(screen.getByRole("button",{name:"Retry fresh"})).toBeEnabled()
    expect(screen.getByRole("link",{name:/Supabase Queues/})).toHaveAttribute("href",health.dashboard_url)
    const lineageDetails=screen.getByText("Lineage").closest("details")
    expect(lineageDetails).not.toBeNull()
    fireEvent.click(within(lineageDetails!).getByRole("button",{name:/qops-test/}))
  })

  it("sends filters to backend and uses the generic idempotent action route",async()=>{
    const confirm=vi.spyOn(window,"confirm").mockReturnValue(true)
    const fetchMock=vi.fn((input:RequestInfo|string,init?:RequestInit)=>{
      const url=String(input)
      if(init?.method==="POST"){
        return jsonResponse({id:detail.id,status:"queued",operation_id:"web-test"})
      }
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(detail)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse(list)
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(fetchMock)
    await screen.findByText("docs-contract")
    fireEvent.change(screen.getByLabelText("State filter"),{target:{value:"fail"}})
    fireEvent.change(screen.getByLabelText("Health filter"),{target:{value:"terminal"}})
    fireEvent.change(screen.getByLabelText("Queue search"),{target:{value:"qops-test"}})
    await waitFor(()=>{
      expect(fetchMock.mock.calls.some(([input])=>{
        const url=String(input)
        return url.includes("status=fail")&&url.includes("health=terminal")&&url.includes("search=qops-test")
      })).toBe(true)
    })
    fireEvent.click(await screen.findByRole("button",{name:"Rerun fresh"}))
    await waitFor(()=>{
      expect(fetchMock.mock.calls.some(([input,init])=>
        String(input).includes("/actions/rerun")&&init?.method==="POST"
      )).toBe(true)
    })
    expect(confirm).toHaveBeenCalled()
  })

  it("covers bulk actions, remaining filters, sorting, pagination, selection and audit evidence",async()=>{
    const allAllowed={
      ...policy,
      health:"live",
      classification:"LIVE",
      capabilities:Object.fromEntries(["cancel","pause","resume","retry","rerun"].map((action)=>[
        action,{allowed:true,reason:"allowed"},
      ])),
    } as any
    const richDetail={
      ...detail,
      policy:allAllowed,
      status:"running",
      audit:[{
        operation_id:"audit-1",action:"pause",actor:"operator",
        occurred_at:"2026-09-27T00:30:00Z",from_status:"running",to_status:"paused",
      }],
    } as any
    const second={...richDetail,id:"22222222-2222-2222-2222-222222222222",request_id:"qops-second",created_at:"2026-09-26T00:00:00Z",status:"queued"} as any
    const paged={...list,jobs:[richDetail,second],total_count:2,has_more:true,next_cursor:"cursor-2"} as any
    const fetchMock=vi.fn((input:RequestInfo|string,init?:RequestInit)=>{
      const url=String(input)
      if(init?.method==="POST") return jsonResponse({status:"accepted"})
      if(url.includes("/api/gateway/health")) return jsonResponse({...health,oldest_pending_age_seconds:7200})
      if(url.includes("/api/gateway/jobs/22222222")) return jsonResponse(second)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(richDetail)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse(paged)
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(fetchMock)
    expect((await screen.findAllByText("docs-contract")).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText("Repository filter"),{target:{value:"orchy"}})
    fireEvent.change(screen.getByLabelText("Host filter"),{target:{value:"local-host"}})
    fireEvent.change(screen.getByLabelText("Created after"),{target:{value:"2026-09-26T00:00"}})
    fireEvent.change(screen.getByLabelText("Created before"),{target:{value:"2026-09-30T00:00"}})
    await waitFor(()=>expect(fetchMock.mock.calls.some(([input])=>{
      const url=String(input)
      return url.includes("repo=orchy")&&url.includes("host_id=local-host")&&url.includes("created_after=")&&url.includes("created_before=")
    })).toBe(true))

    for(const value of ["oldest","age","state","newest"]){
      fireEvent.change(screen.getByLabelText("Sort jobs"),{target:{value}})
    }

    fireEvent.click(screen.getByLabelText("Select qops-test"))
    expect(await screen.findByLabelText("Bulk queue actions")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Select qops-test"))
    expect(screen.queryByLabelText("Bulk queue actions")).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Select qops-test"))
    expect(await screen.findByLabelText("Bulk queue actions")).toBeInTheDocument()
    fireEvent.click(within(await screen.findByLabelText("Bulk queue actions")).getByRole("button",{name:"Pause"}))
    await waitFor(()=>expect(fetchMock.mock.calls.some(([input,init])=>
      String(input).includes("/bulk/actions/pause")&&init?.method==="POST"
    )).toBe(true))

    fireEvent.click(screen.getByRole("button",{name:/qops-second/}))
    await waitFor(()=>expect(fetchMock.mock.calls.some(([input])=>String(input).includes("/api/gateway/jobs/22222222"))).toBe(true))

    expect(await screen.findByText("Operator audit")).toBeInTheDocument()
    expect(await screen.findByText("pause")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button",{name:"Next"}))
    await waitFor(()=>expect(fetchMock.mock.calls.some(([input])=>String(input).includes("cursor=cursor-2"))).toBe(true))
    fireEvent.click(screen.getByRole("button",{name:"Previous"}))
  })

  it("covers queue mutation error and disconnected retry states",async()=>{
    vi.spyOn(window,"confirm").mockReturnValue(true)
    const failing=vi.fn((input:RequestInfo|string,init?:RequestInit)=>{
      const url=String(input)
      if(init?.method==="POST") return jsonResponse({detail:"denied"},409)
      if(url.includes("/api/gateway/health")) return jsonResponse({...health,available:false,status:"disconnected",reason:"offline"})
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse({...detail,policy:{...policy,capabilities:{...policy.capabilities,retry:{allowed:true,reason:"retry"}}}})
      if(url.includes("/api/gateway/jobs?")) return jsonResponse({...list,status:"disconnected",reason:"offline"})
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(failing)
    await screen.findByText("Queue disconnected")
    for (const retry of screen.getAllByRole("button",{name:"Retry"})) fireEvent.click(retry)
    expect((await screen.findAllByText("docs-contract")).length).toBeGreaterThan(0)
    fireEvent.click(await screen.findByRole("button",{name:"Retry fresh"}))
    await waitFor(()=>expect(failing.mock.calls.some(([input,init])=>
      String(input).includes("/actions/retry")&&init?.method==="POST"
    )).toBe(true))
  })



  it("covers denied bulk policy, bulk mutation error, and empty queue states",async()=>{
    const confirm=vi.spyOn(window,"confirm").mockReturnValue(true)
    const allAllowed={
      ...policy,
      health:"live",
      classification:"LIVE",
      capabilities:Object.fromEntries(["cancel","pause","resume","retry","rerun"].map((action)=>[
        action,{allowed:true,reason:"allowed"},
      ])),
    } as any
    const allowedDetail={...detail,policy:allAllowed,status:"running"} as any
    const errorFetch=vi.fn((input:RequestInfo|string,init?:RequestInit)=>{
      const url=String(input)
      if(init?.method==="POST") return jsonResponse({detail:"bulk denied"},409)
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(allowedDetail)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse({...list,jobs:[allowedDetail]})
      return jsonResponse({detail:"unexpected"},404)
    })
    const view=renderQueue(errorFetch)
    await screen.findByText("docs-contract")
    fireEvent.click(screen.getByLabelText("Select qops-test"))
    fireEvent.click(within(await screen.findByLabelText("Bulk queue actions")).getByRole("button",{name:"Cancel"}))
    await waitFor(()=>expect(errorFetch.mock.calls.some(([input,init])=>
      String(input).includes("/bulk/actions/cancel")&&init?.method==="POST"
    )).toBe(true))
    expect(confirm).toHaveBeenCalled()

    view.unmount()
    const deniedFetch=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(detail)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse(list)
      return jsonResponse({detail:"unexpected"},404)
    })
    const deniedView=renderQueue(deniedFetch)
    await screen.findByText("docs-contract")
    fireEvent.click(screen.getByLabelText("Select qops-test"))
    const deniedPause=within(await screen.findByLabelText("Bulk queue actions")).getByRole("button",{name:"Pause"}) as HTMLButtonElement
    expect(deniedPause).toBeDisabled()
    deniedPause.disabled=false
    fireEvent.click(deniedPause)
    deniedView.unmount()

    const emptyFetch=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse({...list,status:"empty",jobs:[],total_count:0})
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(emptyFetch)
    expect(await screen.findByText("No matching jobs")).toBeInTheDocument()
  })


  it("does not submit confirmed single or bulk actions when the operator declines", async () => {
    const confirm=vi.spyOn(window,"confirm").mockReturnValue(false)
    const allAllowed={
      ...policy,
      capabilities:Object.fromEntries(["cancel","pause","resume","retry","rerun"].map((action)=>[
        action,{allowed:true,reason:"allowed"},
      ])),
    } as any
    const actionable={...detail,policy:allAllowed,status:"running"} as any
    const fetchMock=vi.fn((input:RequestInfo|string,init?:RequestInit)=>{
      const url=String(input)
      if(init?.method==="POST") return jsonResponse({status:"unexpected"},500)
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(actionable)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse({...list,jobs:[actionable]})
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(fetchMock)
    await screen.findByText("docs-contract")

    fireEvent.click(await screen.findByRole("button",{name:"Rerun fresh"}))
    expect(confirm).toHaveBeenCalled()
    expect(fetchMock.mock.calls.some(([,init])=>init?.method==="POST")).toBe(false)

    confirm.mockClear()
    fireEvent.click(screen.getByLabelText("Select qops-test"))
    fireEvent.click(within(await screen.findByLabelText("Bulk queue actions")).getByRole("button",{name:"Cancel"}))
    expect(confirm).toHaveBeenCalled()
    expect(fetchMock.mock.calls.some(([,init])=>init?.method==="POST")).toBe(false)
  })


  it("covers queue fallbacks, empty lineage/audit, stale worker and unavailable reasons", async () => {
    const fallbackDetail={
      ...detail,
      host_id:"",
      queue_msg_id:null,
      retry_of:"",
      checkpoint_mode:"",
      lineage:[],
      audit:[],
      policy:{
        ...policy,
        health:"",
        classification:"",
        age_seconds:0,
        queue:{...policy.queue,lease_active:false},
        worker:{...policy.worker,fresh:false,last_seen_at:""},
        capabilities:{
          ...policy.capabilities,
          cancel:{allowed:false,reason:""},
        },
      },
    } as any
    const fallbackHealth={
      ...health,
      observed_at:"",
      dashboard_url:"",
      metrics:{queue_length:null,queue_visible_length:null,scrape_time:""},
      stale_count:2,
      ledger_queue_mismatches:3,
      oldest_pending_age_seconds:0,
      workers:[{...health.workers[0],fresh:false,last_seen_at:""}],
    } as any
    const fallbackList={...list,status:"active",reason:"",jobs:[fallbackDetail]} as any
    const fetchMock=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse(fallbackHealth)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(fallbackDetail)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse(fallbackList)
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(fetchMock)
    await screen.findByText("docs-contract")
    expect(screen.getAllByText("stale").length).toBeGreaterThan(0)
    expect(await screen.findByText("unclaimed")).toBeInTheDocument()
    expect(await screen.findByText("not fresh")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    expect(screen.getByText("No parent or child execution.")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Operator audit"))
    expect(screen.getByText("No operator mutations retained for this execution.")).toBeInTheDocument()

    const denied=screen.getByRole("button",{name:"Cancel"}) as HTMLButtonElement
    denied.disabled=false
    fireEvent.click(denied)
  })

  it("covers null queue metrics, sort fallbacks, query retry and sparse detail collections", async () => {
    const sparseA={
      ...detail,
      id:"33333333-3333-3333-3333-333333333333",
      request_id:"same-a",
      status:"queued",
      created_at:"2026-09-27T00:00:00Z",
      policy:undefined,
    } as any
    const sparseB={
      ...detail,
      id:"44444444-4444-4444-4444-444444444444",
      request_id:"same-b",
      status:"queued",
      created_at:"2026-09-28T00:00:00Z",
      policy:{...policy,age_seconds:undefined},
    } as any
    const richSparse={
      ...detail,
      policy:{...policy,queue:{...policy.queue,lease_active:true}},
      lineage:undefined,
      audit:undefined,
    } as any
    const healthSparse={
      ...health,
      stale_count:undefined,
      ledger_queue_mismatches:undefined,
    } as any
    const fetchMock=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse(healthSparse)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(richSparse)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse({...list,jobs:[richSparse,sparseA,sparseB],total_count:3})
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(fetchMock)
    expect((await screen.findAllByText("docs-contract")).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText("Sort jobs"),{target:{value:"age"}})
    fireEvent.change(screen.getByLabelText("Sort jobs"),{target:{value:"state"}})
    expect(await screen.findByText("No parent or child execution.")).toBeInTheDocument()
    expect(screen.getByText("active", { selector: "strong" })).toBeInTheDocument()
    fireEvent.click(screen.getByText("Operator audit"))
    expect(screen.getByText("No operator mutations retained for this execution.")).toBeInTheDocument()
  })

  it("covers jobs query error retry callback", async () => {
    let failed=true
    const fetchMock=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs?")) {
        if(failed){failed=false; return Promise.reject(new Error("queue query failed"))}
        return jsonResponse(list)
      }
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(detail)
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(fetchMock)
    const retry=await screen.findByRole("button",{name:"Retry"})
    fireEvent.click(retry)
    expect(await screen.findByText("docs-contract")).toBeInTheDocument()
  })

  it("covers audit from/to fallback values", async () => {
    const sparseAudit={...detail,audit:[{
      operation_id:"audit-empty",action:"pause",actor:"operator",
      occurred_at:"2026-09-27T00:30:00Z",from_status:"",to_status:"",
    }]} as any
    const fetchMock=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs/11111111")) return jsonResponse(sparseAudit)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse(list)
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(fetchMock)
    expect((await screen.findAllByText("docs-contract")).length).toBeGreaterThan(0)
    fireEvent.click(await screen.findByText("Operator audit"))
    expect(screen.getByText("— → —")).toBeInTheDocument()
  })

  it("covers queue unavailable/unknown state and generic empty history", async () => {
    const unavailableFetch=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse({available:false,status:"unavailable",reason:""})
      if(url.includes("/api/gateway/jobs?")) return jsonResponse({...list,status:"unknown",reason:"",jobs:[],total_count:0})
      return jsonResponse({detail:"unexpected"},404)
    })
    const view=renderQueue(unavailableFetch)
    expect(await screen.findByText("Queue unavailable")).toBeInTheDocument()
    expect(screen.getByText("No authoritative queue health is available.")).toBeInTheDocument()
    expect(await screen.findByText("Queue history is empty")).toBeInTheDocument()
    view.unmount()

    const emptyFetch=vi.fn((input:RequestInfo|string)=>{
      const url=String(input)
      if(url.includes("/api/gateway/health")) return jsonResponse(health)
      if(url.includes("/api/gateway/jobs?")) return jsonResponse({...list,status:"active",jobs:[],total_count:0})
      return jsonResponse({detail:"unexpected"},404)
    })
    renderQueue(emptyFetch)
    expect(await screen.findByText("Queue history is empty")).toBeInTheDocument()
  })

})
