import { FileText, Paperclip, Play, RefreshCw, Square, Wrench } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Badge, Button, PageHeader, QueryStateNotice } from "@/components/ui/primitives"
import { getApi } from "@/lib/api"
import {
  type WorkbenchAttachment,
  type WorkbenchEvent,
  type WorkbenchPower,
  type WorkbenchRuntime,
  workbenchAdapter,
  WorkbenchUnavailableError,
} from "./adapter"

const DEFAULT_RUNTIMES: WorkbenchRuntime[] = ["aider", "cline", "opencode"]
const DEFAULT_POWERS: WorkbenchPower[] = ["low", "medium", "high"]

function EventCard({ event }: Readonly<{ event: WorkbenchEvent }>) {
  if (event.kind === "assistant" || event.kind === "user") {
    return <div className={`workbench-message ${event.kind}`}>{event.text}</div>
  }
  return (
    <details className="workbench-tool" open={event.kind === "error"}>
      <summary><Wrench size={14} /><strong>{event.title || event.kind}</strong><Badge tone={event.kind === "error" ? "red" : "neutral"}>{event.status || "recorded"}</Badge></summary>
      <div>{event.text}</div>
      {event.detail && <pre className={event.kind === "diff" ? "workbench-diff" : ""}>{event.detail}</pre>}
    </details>
  )
}

export function AgenticWorkbenchPage() {
  const client = useQueryClient()
  const [sessionId, setSessionId] = useState<string>()
  const [prompt, setPrompt] = useState("")
  const [repositoryId, setRepositoryId] = useState("orchy")
  const [runtime, setRuntime] = useState<WorkbenchRuntime>("aider")
  const [power, setPower] = useState<WorkbenchPower>("medium")
  const [plugins, setPlugins] = useState<string[]>([])
  const [attachments, setAttachments] = useState<WorkbenchAttachment[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const capabilities = useQuery({ queryKey:["workbench","capabilities"], queryFn:workbenchAdapter.capabilities, retry:false })
  const sessions = useQuery({ queryKey:["workbench","sessions"], queryFn:workbenchAdapter.sessions, retry:false })
  const repositories = useQuery({ queryKey:["repositories"], queryFn:()=>getApi("/api/repositories") })
  const selectedSession = useQuery({
    queryKey:["workbench","session",sessionId],
    queryFn:()=>workbenchAdapter.session(sessionId!),
    enabled:Boolean(sessionId),
    retry:false,
  })

  const backendReady = Boolean(capabilities.data)
  const runtimeOptions = capabilities.data?.runtimes?.length ? capabilities.data.runtimes : DEFAULT_RUNTIMES
  const powerOptions = capabilities.data?.powers?.length ? capabilities.data.powers : DEFAULT_POWERS
  const pluginOptions = useMemo(
    () => capabilities.data?.capabilities?.filter((item)=>item.id.startsWith("plugin:")) ?? [],
    [capabilities.data],
  )

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey:["workbench"] }),
      client.invalidateQueries({ queryKey:["repositories"] }),
    ])
  }

  const start = useMutation({
    mutationFn:()=>workbenchAdapter.start({
      prompt:prompt.trim(), repository_id:repositoryId, runtime, power, plugin_ids:plugins, attachments,
    }),
    onSuccess:async (session)=>{ setSessionId(session.id); setPrompt(""); setAttachments([]); await refresh() },
  })
  const action = useMutation({
    mutationFn:async (kind:"stop"|"retry"|"resume")=>{
      if (!sessionId) throw new Error("Select a session first")
      if (kind==="stop") return workbenchAdapter.stop(sessionId)
      if (kind==="retry") return workbenchAdapter.retry(sessionId)
      return workbenchAdapter.resume(sessionId,prompt.trim())
    },
    onSuccess:async ()=>{ setPrompt(""); await refresh() },
  })

  const unavailable = capabilities.error instanceof WorkbenchUnavailableError || sessions.error instanceof WorkbenchUnavailableError
  const session = selectedSession.data
  const canSubmit = backendReady && Boolean(prompt.trim()) && Boolean(repositoryId) && !start.isPending

  return (
    <div className="workbench-page">
      <PageHeader eyebrow="Agentic coding" title="Agentic Workbench" description="Local coding sessions with explicit repository, runtime, effort and plugin boundaries." badge={<Badge tone={backendReady ? "cyan" : "neutral"}>{backendReady ? "WORKBENCH API" : "WIP ADAPTER"}</Badge>} />
      <div className="workbench-status" role="status">
        <Badge tone={backendReady ? "green" : "yellow"}>{backendReady ? "Backend connected" : "Backend contract pending"}</Badge>
        <span>UI authority: orchy-ui · lifecycle authority: Orchy ExecutionStore / Mission Core</span>
        <Button onClick={()=>void refresh()} aria-label="Refresh workbench"><RefreshCw size={14}/> Refresh</Button>
      </div>
      {unavailable && <div className="workbench-blocker"><strong>Workbench UI is ready, but canonical session endpoints are not deployed.</strong> OR-688/690/691 must supply session lifecycle, attachments and plugin capabilities. The UI will not fall back to legacy task semantics.</div>}
      <QueryStateNotice error={repositories.error || (!unavailable ? capabilities.error : null)} isFetching={repositories.isFetching || capabilities.isFetching} updatedAt={Math.max(repositories.dataUpdatedAt,capabilities.dataUpdatedAt)} onRetry={()=>void refresh()} />

      <section className="workbench-grid" aria-label="Agentic coding workspace">
        <aside className="workbench-rail">
          <div className="workbench-rail-head"><strong>Sessions</strong><Button disabled={!backendReady} onClick={()=>setSessionId(undefined)}>New</Button></div>
          <div className="workbench-session-list">
            {(sessions.data ?? []).map((item)=>(
              <button className="workbench-session" type="button" key={item.id} aria-current={item.id===sessionId} onClick={()=>setSessionId(item.id)}>
                <strong>{item.title || item.id}</strong><small>{item.repository_id} · {item.runtime} · {item.power}</small>
              </button>
            ))}
            {backendReady && !(sessions.data?.length) && <p className="workbench-muted">No sessions yet.</p>}
          </div>
        </aside>

        <div className="workbench-main">
          <header className="workbench-thread-head" style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",margin:0}}>
            <div><strong>{session?.title || "New coding session"}</strong><div className="workbench-muted">{session ? `${session.repository_id} · ${session.repository_sha || "SHA pending"}` : "Select explicit execution context below"}</div></div>
            {session && <div className="workbench-actions"><Button disabled={action.isPending} onClick={()=>action.mutate("retry")}><RefreshCw size={14}/> Retry</Button><Button disabled={action.isPending} onClick={()=>action.mutate("stop")}><Square size={14}/> Stop</Button></div>}
          </header>
          <div className="workbench-transcript" aria-live="polite">
            {(session?.events ?? []).map((event)=><EventCard event={event} key={event.id}/>)}
            {!session && <div className="workbench-empty"><strong>Start from intent, not hidden state.</strong><p>Repository, runtime, effort and plugins remain explicit for every session.</p></div>}
          </div>

          <form className="workbench-composer" onSubmit={(event)=>{event.preventDefault(); if(session) action.mutate("resume"); else start.mutate()}}>
            <div className="workbench-controls">
              <label>Repository<select aria-label="Repository" value={repositoryId} onChange={(e)=>setRepositoryId(e.target.value)} disabled={Boolean(session)}>{(repositories.data ?? []).filter((r)=>r.available).map((r)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
              <label>Runtime<select aria-label="Runtime" value={runtime} onChange={(e)=>setRuntime(e.target.value as WorkbenchRuntime)} disabled={Boolean(session)}>{runtimeOptions.map((item)=><option key={item}>{item}</option>)}</select></label>
              <label>Power<select aria-label="Power" value={power} onChange={(e)=>setPower(e.target.value as WorkbenchPower)} disabled={Boolean(session)}>{powerOptions.map((item)=><option key={item}>{item}</option>)}</select></label>
              <label>Plugins<select aria-label="Plugin" disabled={Boolean(session) || !pluginOptions.length} value="" onChange={(e)=>{if(e.target.value&&!plugins.includes(e.target.value))setPlugins([...plugins,e.target.value])}}><option value="">Add plugin…</option>{pluginOptions.filter((p)=>p.available).map((p)=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
            </div>
            {(attachments.length>0 || plugins.length>0) && <div className="workbench-actions" style={{justifyContent:"flex-start"}}>{attachments.map((a)=><span className="workbench-attachment" key={a.name}><FileText size={13}/>{a.name}</span>)}{plugins.map((p)=><span className="workbench-attachment" key={p}>{p}<button type="button" aria-label={`Remove ${p}`} onClick={()=>setPlugins(plugins.filter((x)=>x!==p))}>×</button></span>)}</div>}
            <textarea aria-label="Coding message" value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder={session ? "Follow up on this session…" : "Describe the coding outcome, constraints and acceptance evidence…"} />
            {(start.error || action.error) && <p className="error-text">{(start.error || action.error)?.message}</p>}
            <div className="workbench-actions">
              <input ref={fileRef} type="file" multiple hidden onChange={(e)=>setAttachments(Array.from(e.target.files ?? []).map((file)=>({name:file.name,size:file.size})))} />
              <Button type="button" disabled={!backendReady || Boolean(session)} onClick={()=>fileRef.current?.click()}><Paperclip size={14}/> Attach</Button>
              <Button className="button-primary" disabled={session ? !backendReady || !prompt.trim() || action.isPending : !canSubmit}><Play size={14}/>{session ? "Send follow-up" : start.isPending ? "Starting…" : "Start session"}</Button>
            </div>
          </form>
        </div>

        <aside className="workbench-context">
          <div className="workbench-context-head"><strong>Context</strong><Badge tone="neutral">explicit</Badge></div>
          <div className="workbench-context-list">
            <div className="workbench-capability"><strong>Repository</strong><small>{session?.repository_id || repositoryId}</small></div>
            <div className="workbench-capability"><strong>Exact SHA</strong><small>{session?.repository_sha || "resolved by backend at session start"}</small></div>
            <div className="workbench-capability"><strong>Runtime / power</strong><small>{session?.runtime || runtime} · {session?.power || power}</small></div>
            <div className="workbench-capability"><strong>Plugins</strong><small>{(session?.plugin_ids ?? plugins).join(", ") || "none"}</small></div>
            {(capabilities.data?.capabilities ?? []).filter((c)=>!c.id.startsWith("plugin:")).map((c)=><div className="workbench-capability" key={c.id}><strong>{c.label}</strong><small>{c.available ? "available" : c.reason || "unavailable"}</small></div>)}
          </div>
        </aside>
      </section>
    </div>
  )
}
