import {
  FileDiff,
  Paperclip,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Square,
  TerminalSquare,
  Wrench,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PanelHeader,
  QueryStateNotice,
  StatusNotice,
  notifyOperator,
} from "@/components/ui/primitives"
import {
  cancelWorkbenchSession,
  fileToWorkbenchAttachment,
  getWorkbenchSession,
  listWorkbenchPlugins,
  listWorkbenchRepositories,
  repairWorkbenchSession,
  resumeWorkbenchSession,
  sendWorkbenchMessage,
  startWorkbenchSession,
  streamWorkbenchEvents,
  type WorkbenchEffort,
  type WorkbenchEvent,
  type WorkbenchEventKind,
  type WorkbenchRuntime,
  type WorkbenchSession,
} from "@/domains/workbench/api"

const TERMINAL = new Set([
  "completed",
  "failed",
  "cancelled",
  "canceled",
  "timed_out",
  "interrupted",
  "resource_blocked",
])

const REPAIRABLE = new Set(["failed", "timed_out", "interrupted", "resource_blocked"])

function stateOf(session: WorkbenchSession | null): string {
  return String(session?.execution?.state || session?.state || "idle")
}

function toneForState(state: string): "neutral" | "live" | "warn" | "danger" | "cyan" {
  const value = state.toLowerCase()
  if (value === "completed") return "live"
  if (["failed", "timed_out", "resource_blocked"].includes(value)) return "danger"
  if (["cancelled", "canceled", "interrupted"].includes(value)) return "warn"
  if (["running", "starting", "retrying", "accepted"].includes(value)) return "cyan"
  return "neutral"
}

function eventTitle(kind: WorkbenchEventKind): string {
  return {
    assistant_text: "Assistant",
    plan_summary: "Plan summary",
    tool_start: "Tool started",
    tool_result: "Tool result",
    patch: "Patch",
    validation: "Validation",
    repair: "Repair",
    artifact: "Artifact",
    warning: "Warning",
    error: "Failure",
    cancelled: "Cancelled",
    completed: "Completed",
  }[kind]
}

function eventTone(kind: WorkbenchEventKind): "neutral" | "live" | "warn" | "danger" | "cyan" {
  if (kind === "completed") return "live"
  if (kind === "error") return "danger"
  if (["warning", "cancelled", "repair"].includes(kind)) return "warn"
  if (["tool_start", "tool_result", "validation", "patch"].includes(kind)) return "cyan"
  return "neutral"
}

function compactPayload(payload: Record<string, unknown>): string {
  if (typeof payload.text === "string") return payload.text
  if (typeof payload.summary === "string") return payload.summary
  if (typeof payload.error === "string" && payload.error) return payload.error
  if (typeof payload.message === "string") return payload.message
  return JSON.stringify(payload, null, 2)
}

function changedFiles(payload: Record<string, unknown>): string[] {
  return Array.isArray(payload.changed_files)
    ? payload.changed_files.filter((value): value is string => typeof value === "string")
    : []
}

function WorkbenchEventCard({ event }: Readonly<{ event: WorkbenchEvent }>) {
  const files = changedFiles(event.payload)
  const assistant = event.kind === "assistant_text"
  return (
    <article className={assistant ? "workbench-message assistant" : "workbench-event"}>
      <div className="workbench-event-head">
        <span>
          {event.kind === "patch" ? <FileDiff size={14} /> : <TerminalSquare size={14} />}
          <strong>{eventTitle(event.kind)}</strong>
        </span>
        <Badge tone={eventTone(event.kind)}>#{event.sequence}</Badge>
      </div>
      {files.length > 0 && (
        <div className="workbench-changed-files" aria-label="Changed files">
          {files.map((file) => <code key={file}>{file}</code>)}
        </div>
      )}
      <pre>{compactPayload(event.payload)}</pre>
    </article>
  )
}

function acceptanceLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function WorkbenchPage() {
  const repositories = useQuery({
    queryKey: ["workbench-repositories"],
    queryFn: listWorkbenchRepositories,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
  const plugins = useQuery({
    queryKey: ["workbench-plugins"],
    queryFn: listWorkbenchPlugins,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const [repositoryId, setRepositoryId] = useState("")
  const [targetSha, setTargetSha] = useState("")
  const [runtime, setRuntime] = useState<WorkbenchRuntime>("aider")
  const [effort, setEffort] = useState<WorkbenchEffort>("MEDIUM")
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>([])
  const [task, setTask] = useState("")
  const [acceptance, setAcceptance] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [repositoryPaths, setRepositoryPaths] = useState("")
  const [session, setSession] = useState<WorkbenchSession | null>(null)
  const [events, setEvents] = useState<WorkbenchEvent[]>([])
  const [sessionLookup, setSessionLookup] = useState("")
  const [followUp, setFollowUp] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (repositoryId || !repositories.data?.length) return
    const first = repositories.data.find((item) => item.available)
    if (first) setRepositoryId(first.id)
  }, [repositories.data, repositoryId])

  const selectedRepository = repositories.data?.find((item) => item.id === repositoryId)
  const state = stateOf(session)
  const isTerminal = TERMINAL.has(state.toLowerCase())
  const canRepair = REPAIRABLE.has(state.toLowerCase())
  const validSha = /^[0-9a-f]{40}$/.test(targetSha)
  const launchReady = Boolean(task.trim() && repositoryId && validSha && !busy)
  const pluginById = useMemo(
    () => new Map((plugins.data ?? []).map((plugin) => [plugin.plugin_id, plugin])),
    [plugins.data],
  )

  const refreshEvents = async (sessionId: string) => {
    setEvents([])
    const seen = new Set<number>()
    await streamWorkbenchEvents(sessionId, (event) => {
      if (seen.has(event.sequence)) return
      seen.add(event.sequence)
      setEvents((current) => [...current, event])
    })
  }

  const syncSession = async (sessionId: string) => {
    const next = await getWorkbenchSession(sessionId)
    setSession(next)
    setSessionLookup(next.session_id)
    await refreshEvents(next.session_id)
    return next
  }

  const handleFailure = (value: unknown) => {
    const message = value instanceof Error ? value.message : "Workbench request failed"
    setError(message)
    notifyOperator(message, "error")
  }

  const launch = async () => {
    if (!launchReady) return
    setBusy("launch")
    setError("")
    try {
      const uploads = await Promise.all(files.map(fileToWorkbenchAttachment))
      const repositoryAttachments = repositoryPaths
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
        .map((repositoryPath) => ({
          name: repositoryPath.split("/").at(-1) || repositoryPath,
          media_type: "text/plain",
          repository_path: repositoryPath,
          source: "repository",
        }))
      const attachments = [...uploads, ...repositoryAttachments]
      const next = await startWorkbenchSession({
        task: task.trim(),
        repository_id: repositoryId,
        target_sha: targetSha,
        runtime,
        effort,
        enabled_plugins: enabledPlugins,
        attachments,
        acceptance: acceptanceLines(acceptance),
      })
      setSession(next)
      setSessionLookup(next.session_id)
      setTask("")
      setFiles([])
      setRepositoryPaths("")
      await refreshEvents(next.session_id)
      notifyOperator("Workbench session accepted", "success")
    } catch (value) {
      handleFailure(value)
    } finally {
      setBusy("")
    }
  }

  const openSession = async () => {
    if (!sessionLookup.trim() || busy) return
    setBusy("open")
    setError("")
    try {
      await syncSession(sessionLookup.trim())
      notifyOperator("Workbench session reconstructed from ExecutionStore", "success")
    } catch (value) {
      handleFailure(value)
    } finally {
      setBusy("")
    }
  }

  const act = async (
    name: string,
    action: (sessionId: string) => Promise<unknown>,
  ) => {
    if (!session || busy) return
    setBusy(name)
    setError("")
    try {
      await action(session.session_id)
      await syncSession(session.session_id)
      notifyOperator(`Workbench ${name} accepted`, "success")
    } catch (value) {
      handleFailure(value)
    } finally {
      setBusy("")
    }
  }

  const submitFollowUp = async () => {
    if (!session || !followUp.trim() || busy) return
    setBusy("follow-up")
    setError("")
    try {
      const next = await sendWorkbenchMessage(
        session.session_id,
        followUp.trim(),
        acceptanceLines(acceptance),
      )
      setSession(next)
      setFollowUp("")
      await refreshEvents(next.session_id)
      notifyOperator("Follow-up execution accepted", "success")
    } catch (value) {
      handleFailure(value)
    } finally {
      setBusy("")
    }
  }

  const explicitRefresh = async () => {
    if (!session || busy) return
    setBusy("refresh")
    setError("")
    try {
      await syncSession(session.session_id)
    } catch (value) {
      handleFailure(value)
    } finally {
      setBusy("")
    }
  }

  const newSession = () => {
    setSession(null)
    setEvents([])
    setSessionLookup("")
    setFollowUp("")
    setError("")
  }

  const togglePlugin = (pluginId: string) => {
    setEnabledPlugins((current) =>
      current.includes(pluginId)
        ? current.filter((value) => value !== pluginId)
        : [...current, pluginId],
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Agentic Workbench"
        title="Coding workspace"
        description="Interactive local coding sessions over the canonical Agentic controller and ExecutionStore. Observable actions and evidence only; hidden reasoning is neither requested nor retained."
        badge={<Badge tone={session ? toneForState(state) : "cyan"}>{session ? state : "LOCAL"}</Badge>}
      />

      {error && (
        <StatusNotice
          title="Workbench action failed"
          body={error}
          tone="danger"
          action={<Button className="button-compact" onClick={() => setError("")}>Dismiss</Button>}
        />
      )}

      <section className="workbench-layout">
        <aside className="workbench-sidebar">
          <Card>
            <PanelHeader kicker="SESSION" title="Open or start" />
            <div className="workbench-session-open">
              <label htmlFor="workbench-session-id">Session ID</label>
              <div>
                <input
                  id="workbench-session-id"
                  value={sessionLookup}
                  onChange={(event) => setSessionLookup(event.target.value)}
                  placeholder="Paste retained session ID"
                />
                <Button
                  className="button-secondary button-compact"
                  disabled={!sessionLookup.trim() || Boolean(busy)}
                  onClick={() => void openSession()}
                >
                  Open
                </Button>
              </div>
            </div>
            {session ? (
              <dl className="workbench-session-facts">
                <div><dt>Session</dt><dd>{session.session_id}</dd></div>
                <div><dt>Execution</dt><dd>{session.execution_id}</dd></div>
                <div><dt>Turn</dt><dd>{session.turn_count}</dd></div>
                <div><dt>State</dt><dd><Badge tone={toneForState(state)}>{state}</Badge></dd></div>
              </dl>
            ) : (
              <p className="workbench-panel-note">No session selected.</p>
            )}
            <div className="workbench-wip">
              <Badge tone="neutral">Canonical boundary</Badge>
              <p>Retained sessions reopen by authoritative session ID. The browser deliberately does not invent a second session index.</p>
            </div>
          </Card>

          <Card>
            <PanelHeader kicker="CONTEXT" title="Execution envelope" />
            <div className="workbench-fields">
              <label>
                <span>Repository</span>
                <select
                  aria-label="Repository"
                  value={repositoryId}
                  onChange={(event) => setRepositoryId(event.target.value)}
                  disabled={Boolean(session)}
                >
                  <option value="">Select repository</option>
                  {(repositories.data ?? []).map((repository) => (
                    <option key={repository.id} value={repository.id} disabled={!repository.available}>
                      {repository.name}{!repository.available ? " · unavailable" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <QueryStateNotice
                error={repositories.error}
                updatedAt={repositories.dataUpdatedAt}
                onRetry={() => void repositories.refetch()}
              />
              <label>
                <span>Exact target SHA</span>
                <input
                  aria-label="Exact target SHA"
                  value={targetSha}
                  onChange={(event) => setTargetSha(event.target.value.trim().toLowerCase())}
                  disabled={Boolean(session)}
                  placeholder="40-character Git SHA"
                  aria-invalid={Boolean(targetSha) && !validSha}
                />
                {targetSha && !validSha && <small className="error-text">Exact 40-character SHA required.</small>}
              </label>
              <div className="workbench-wip">
                <Badge tone="neutral">Exact revision</Badge>
                <p>Workbench requires an operator-explicit exact SHA and fails closed rather than silently resolving a moving repository HEAD.</p>
              </div>
              <label>
                <span>Runtime</span>
                <select
                  aria-label="Runtime"
                  value={runtime}
                  onChange={(event) => setRuntime(event.target.value as WorkbenchRuntime)}
                  disabled={Boolean(session)}
                >
                  <option value="aider">Aider · ready</option>
                  <option value="cline">Cline · comparator</option>
                  <option value="opencode" disabled>OpenCode · deferred</option>
                </select>
              </label>
              <label>
                <span>Effort</span>
                <select
                  aria-label="Effort"
                  value={effort}
                  onChange={(event) => setEffort(event.target.value as WorkbenchEffort)}
                  disabled={Boolean(session)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
                <small>MEDIUM is the certified Aider readiness default. LOW/HIGH remain bounded profiles while qualification continues.</small>
              </label>
            </div>
          </Card>
        </aside>

        <section className="workbench-thread" aria-label="Workbench conversation">
          <Card className="workbench-thread-card">
            <PanelHeader
              kicker="CONVERSATION"
              title={session ? `${session.repository_id} · ${session.runtime} · ${session.effort}` : "New coding session"}
              action={session ? (
                <Button
                  className="button-secondary button-compact"
                  disabled={Boolean(busy)}
                  onClick={() => void explicitRefresh()}
                >
                  <RefreshCw size={13} /> Refresh
                </Button>
              ) : undefined}
            />

            {session && (
              <div className="workbench-stream-contract">
                <Badge tone="cyan">one-shot SSE</Badge>
                <span>Events stream progressively per request. The current backend closes after the retained snapshot, so refresh is explicit—no reconnect loop or background polling.</span>
              </div>
            )}

            <div className="workbench-events" aria-live="polite">
              {!session && (
                <EmptyState
                  title="Ready for a local coding session"
                  body="Choose an exact repository SHA, runtime, effort profile and optional plugins, then submit the task."
                />
              )}
              {session && !events.length && (
                <EmptyState
                  title={busy === "refresh" ? "Refreshing retained events" : "No retained events yet"}
                  body="The execution is authoritative in ExecutionStore. Use Refresh to request the latest finite event snapshot."
                />
              )}
              {events.map((event) => <WorkbenchEventCard event={event} key={`${event.sequence}-${event.kind}`} />)}
            </div>

            {session ? (
              <div className="workbench-composer">
                <label htmlFor="workbench-follow-up">Follow-up</label>
                <textarea
                  id="workbench-follow-up"
                  value={followUp}
                  onChange={(event) => setFollowUp(event.target.value)}
                  placeholder={isTerminal ? "Ask for a follow-up change or clarification…" : "Wait for the active execution to finish, then continue…"}
                  rows={4}
                  disabled={!isTerminal || Boolean(busy)}
                />
                <div className="workbench-composer-actions">
                  <Button
                    disabled={!isTerminal || !followUp.trim() || Boolean(busy)}
                    onClick={() => void submitFollowUp()}
                  >
                    <Send size={14} /> Send follow-up
                  </Button>
                  <Button
                    className="button-secondary"
                    disabled={isTerminal || Boolean(busy)}
                    onClick={() => void act("cancel", cancelWorkbenchSession)}
                  >
                    <Square size={13} /> Stop
                  </Button>
                  <Button
                    className="button-secondary"
                    disabled={!canRepair || Boolean(busy)}
                    onClick={() => void act("repair", repairWorkbenchSession)}
                  >
                    <Wrench size={13} /> Repair
                  </Button>
                  <Button
                    className="button-secondary"
                    disabled={!isTerminal || state === "completed" || Boolean(busy)}
                    onClick={() => void act("resume", resumeWorkbenchSession)}
                  >
                    <Play size={13} /> Resume
                  </Button>
                  <Button className="button-ghost" disabled={Boolean(busy)} onClick={newSession}>
                    <RotateCcw size={13} /> New session
                  </Button>
                </div>
              </div>
            ) : (
              <div className="workbench-launch-form">
                <label htmlFor="workbench-task">Task</label>
                <textarea
                  id="workbench-task"
                  value={task}
                  onChange={(event) => setTask(event.target.value)}
                  rows={7}
                  placeholder="Describe the coding task and desired outcome…"
                />
                <label htmlFor="workbench-acceptance">Acceptance criteria <small>one per line</small></label>
                <textarea
                  id="workbench-acceptance"
                  value={acceptance}
                  onChange={(event) => setAcceptance(event.target.value)}
                  rows={3}
                  placeholder={"Tests pass\nNo unrelated files changed"}
                />
                <label className="workbench-file-input">
                  <Paperclip size={14} />
                  <span>Attach files</span>
                  <input
                    aria-label="Attachments"
                    type="file"
                    multiple
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                  />
                </label>
                {files.length > 0 && (
                  <div className="workbench-file-list">
                    {files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name} · {file.size} B</span>)}
                  </div>
                )}
                <label htmlFor="workbench-repository-paths">
                  Repository paths <small>one tracked path per line</small>
                </label>
                <textarea
                  id="workbench-repository-paths"
                  aria-label="Repository paths"
                  value={repositoryPaths}
                  onChange={(event) => setRepositoryPaths(event.target.value)}
                  rows={2}
                  placeholder={"src/example.ts\ndocs/API.md"}
                />
                <Button disabled={!launchReady} onClick={() => void launch()}>
                  <Play size={14} /> {busy === "launch" ? "Starting…" : "Start session"}
                </Button>
                {!selectedRepository?.writable && selectedRepository && (
                  <p className="error-text">{selectedRepository.reason || "Selected repository is not writable."}</p>
                )}
              </div>
            )}
          </Card>
        </section>

        <aside className="workbench-tools">
          <Card>
            <PanelHeader
              kicker="PLUGINS"
              title="Session tools"
              action={<Badge tone={plugins.error ? "warn" : plugins.data ? "live" : "neutral"}>{plugins.data ? plugins.data.length : "Unavailable"}</Badge>}
            />
            <QueryStateNotice
              error={plugins.error}
              updatedAt={plugins.dataUpdatedAt}
              onRetry={() => void plugins.refetch()}
            />
            <div className="workbench-plugin-list">
              {(plugins.data ?? []).map((plugin) => {
                const checked = enabledPlugins.includes(plugin.plugin_id)
                return (
                  <label key={plugin.plugin_id} className="workbench-plugin">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={Boolean(session)}
                      onChange={() => togglePlugin(plugin.plugin_id)}
                    />
                    <span>
                      <strong>{plugin.plugin_id}</strong>
                      <small>v{plugin.version} · {plugin.transport} · {plugin.tools.length} tool{plugin.tools.length === 1 ? "" : "s"}</small>
                    </span>
                  </label>
                )
              })}
              {!plugins.data?.length && !plugins.error && (
                <p className="workbench-panel-note">No admitted plugins are currently registered.</p>
              )}
            </div>
            {enabledPlugins.length > 0 && (
              <div className="workbench-enabled-tools">
                {enabledPlugins.map((id) => (
                  <div key={id}>
                    <strong>{id}</strong>
                    <small>{pluginById.get(id)?.tools.map((tool) => tool.name).join(", ") || "metadata unavailable"}</small>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <PanelHeader kicker="BOUNDARIES" title="Authority contract" />
            <ul className="workbench-boundaries">
              <li>ExecutionStore owns lifecycle and retained state.</li>
              <li>Repository mutation remains exact-SHA + isolated worktree.</li>
              <li>Runtime/profile changes require a new session boundary.</li>
              <li>Plugins are visible only when explicitly enabled for the session.</li>
              <li>No model commit/push/merge authority and no hidden chain-of-thought retention.</li>
            </ul>
          </Card>
        </aside>
      </section>
    </>
  )
}
