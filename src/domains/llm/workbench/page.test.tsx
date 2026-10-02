import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AgenticWorkbenchPage } from "./page"

const api = vi.hoisted(()=>({ getApi:vi.fn(), workbench:{
  capabilities:vi.fn(), sessions:vi.fn(), session:vi.fn(), start:vi.fn(), stop:vi.fn(), retry:vi.fn(), resume:vi.fn(),
}}))
vi.mock("@/lib/api",()=>({getApi:api.getApi}))
vi.mock("./adapter",async(importOriginal)=>{
  const original=await importOriginal<typeof import("./adapter")>()
  return {...original,workbenchAdapter:api.workbench}
})

function mount(){
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})
  return render(<QueryClientProvider client={client}><AgenticWorkbenchPage/></QueryClientProvider>)
}
describe("Agentic Workbench",()=>{
  beforeEach(()=>{
    vi.clearAllMocks()
    api.getApi.mockResolvedValue([{id:"orchy",name:"Orchy",available:true}])
    api.workbench.capabilities.mockResolvedValue({sessions:true,streaming:true,attachments:true,plugins:true,runtimes:["aider","cline","opencode"],powers:["low","medium","high"],capabilities:[{id:"plugin:github",label:"GitHub",available:true}]})
    api.workbench.sessions.mockResolvedValue([])
  })
  it("starts with explicit runtime, power, repository, plugins and attachment metadata",async()=>{
    api.workbench.start.mockResolvedValue({id:"s1",title:"Task",repository_id:"orchy",runtime:"cline",power:"high",plugin_ids:["plugin:github"],status:"running",events:[]})
    api.workbench.session.mockResolvedValue({id:"s1",title:"Task",repository_id:"orchy",runtime:"cline",power:"high",plugin_ids:["plugin:github"],status:"running",events:[]})
    mount()
    await screen.findByText("Backend connected")
    fireEvent.change(screen.getByLabelText("Runtime"),{target:{value:"cline"}})
    fireEvent.change(screen.getByLabelText("Power"),{target:{value:"high"}})
    fireEvent.change(screen.getByLabelText("Plugin"),{target:{value:"plugin:github"}})
    fireEvent.change(screen.getByLabelText("Coding message"),{target:{value:"Fix failing validation"}})
    fireEvent.click(screen.getByRole("button",{name:/Start session/}))
    await waitFor(()=>expect(api.workbench.start).toHaveBeenCalledWith(expect.objectContaining({repository_id:"orchy",runtime:"cline",power:"high",plugin_ids:["plugin:github"],prompt:"Fix failing validation"})))
  })
  it("renders tool/diff evidence and exposes stop retry resume",async()=>{
    const session={id:"s1",title:"Repair",repository_id:"orchy",repository_sha:"abc",runtime:"aider",power:"medium",plugin_ids:[],status:"running",events:[{id:"e1",kind:"assistant",text:"Working"},{id:"e2",kind:"diff",title:"Patch",text:"1 file",detail:"+fixed",status:"passed"}]}
    api.workbench.sessions.mockResolvedValue([session])
    api.workbench.session.mockResolvedValue(session)
    api.workbench.stop.mockResolvedValue(session);api.workbench.retry.mockResolvedValue(session);api.workbench.resume.mockResolvedValue(session)
    mount()
    fireEvent.click(await screen.findByRole("button",{name:/Repair/}))
    await screen.findByText("Working")
    expect(screen.getByText("Patch")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button",{name:/Stop/}))
    await waitFor(()=>expect(api.workbench.stop).toHaveBeenCalledWith("s1"))
    fireEvent.change(screen.getByLabelText("Coding message"),{target:{value:"continue"}})
    fireEvent.click(screen.getByRole("button",{name:/Send follow-up/}))
    await waitFor(()=>expect(api.workbench.resume).toHaveBeenCalledWith("s1","continue"))
  })
})
