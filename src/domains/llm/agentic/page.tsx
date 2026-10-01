import {
Zap
} from "lucide-react"
import {
useEffect,useState
} from "react"
import { useMutation,useQuery } from "@tanstack/react-query"

import {
Badge,
Button,
Card,
CollapsibleSection,
CompactSummary,PageHeader,
PanelHeader,
QueryStateNotice,
SectionPanel,
notifyOperator
} from "@/components/ui/primitives"
import { getApi,postApi } from "@/lib/api"
import {
DomainConfiguration,
ExecutionPanel,
JsonPanel,
SectionTabs,useDomainTab
} from "@/domains/shared"

export function Tasks({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const [task, setTask] = useState("")
  const [primaryRepository, setPrimaryRepository] = useState(
    () => window.localStorage.getItem("orchy-primary-repository") || "orchy",
  )
  const [multiRepo, setMultiRepo] = useState(false)
  const [additionalRepositories, setAdditionalRepositories] = useState<string[]>([])
  const [executionId, setExecutionId] = useState<string | undefined>()
  const repositories = useQuery({
    queryKey: ["repositories"],
    queryFn: () => getApi("/api/repositories"),
  })
  const selected = repositories.data?.find((item) => item.id === primaryRepository)
  const selectedScope = new Set([
    primaryRepository,
    ...(multiRepo ? additionalRepositories : []),
  ])
  const taskLower = task.toLowerCase()
  const unselectedMentions = (repositories.data ?? []).filter((repository) => {
    if (selectedScope.has(repository.id) || !taskLower.trim()) return false
    const candidates = [
      repository.id,
      repository.name,
      repository.remote_identity,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
    return candidates.some((value) => taskLower.includes(value))
  })
  const mutation = useMutation({
    mutationFn: () =>
      postApi("/api/tasks", {
        task,
        repository_id: primaryRepository,
        additional_repository_ids: multiRepo ? additionalRepositories : [],
      }),
    onSuccess: (response) => {
      setExecutionId(response.execution_id)
      window.localStorage.setItem("orchy-primary-repository", primaryRepository)
      setTask("")
      notifyOperator("Agentic task accepted", "success")
    },
    onError: (error) => notifyOperator(error.message, "error"),
  })

  useEffect(() => {
    if (!repositories.data?.length) return
    if (!selected?.available) {
      const fallback = repositories.data.find((item) => item.available)
      if (fallback) setPrimaryRepository(fallback.id)
    }
  }, [repositories.data, selected])

  const toggleAdditional = (id: string) => {
    setAdditionalRepositories((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    )
  }

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow="Agentic work"
          title="Tasks & execution"
          description="Submit intent to the existing Orchy execution kernel."
          badge={<Badge tone="cyan">PYTHON NATIVE</Badge>}
        />
      )}
      <QueryStateNotice
        error={repositories.error}
        isFetching={repositories.isFetching}
        updatedAt={repositories.dataUpdatedAt}
        onRetry={() => void repositories.refetch()}
      />
      <CompactSummary
        className="agentic-task-summary"
        items={[
          {
            label: "Primary repo",
            value: selected?.name || primaryRepository,
            detail: selected?.available ? selected.remote_identity || "registered" : "unavailable",
            tone: selected?.available ? "live" : "warn",
          },
          {
            label: "Scope",
            value: multiRepo ? `multi-repo · ${1 + additionalRepositories.length}` : "single repo",
            detail: multiRepo && additionalRepositories.length ? additionalRepositories.join(", ") : "explicit repository boundary",
          },
          {
            label: "Execution",
            value: mutation.isPending ? "submitting" : "ready",
            detail: "Aider/vLLM kernel",
            tone: mutation.isPending ? "warn" : "cyan",
          },
        ]}
      />
      <section className="two-column task-grid agentic-task-grid">
        <Card className="form-card agentic-task-form">
          <PanelHeader kicker="NEW WORK" title="Launch autonomous task" />
          <form
            className="control-form"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.mutate()
            }}
          >
            <CollapsibleSection
              className="agentic-repository-disclosure"
              title="Repository scope"
              summary={
                multiRepo && additionalRepositories.length
                  ? `${selected?.name || primaryRepository} + ${additionalRepositories.length}`
                  : selected?.name || primaryRepository
              }
              defaultOpen={false}
            >
              <div className="agentic-repository-controls">
                <label htmlFor="repository">Primary repository</label>
                <select
                  id="repository"
                  value={primaryRepository}
                  onChange={(event) => {
                    setPrimaryRepository(event.target.value)
                    setAdditionalRepositories((current) =>
                      current.filter((id) => id !== event.target.value),
                    )
                  }}
                  required
                >
                  {(repositories.data ?? []).map((repository) => (
                    <option
                      key={repository.id}
                      value={repository.id}
                      disabled={!repository.available}
                    >
                      {repository.name}
                      {repository.remote_identity ? ` · ${repository.remote_identity}` : ""}
                      {!repository.available ? " · unavailable" : ""}
                    </option>
                  ))}
                </select>
                {selected && !selected.available && (
                  <p className="error-text">{selected.reason || "Repository unavailable"}</p>
                )}
                <label className="agentic-inline-toggle">
                  <input
                    type="checkbox"
                    checked={multiRepo}
                    onChange={(event) => {
                      setMultiRepo(event.target.checked)
                      if (!event.target.checked) setAdditionalRepositories([])
                    }}
                  />
                  <span>Multi-repo task</span>
                </label>
                {multiRepo && (
                  <div className="agentic-repository-options">
                    {(repositories.data ?? [])
                      .filter((repository) => repository.id !== primaryRepository)
                      .map((repository) => (
                        <label key={repository.id} aria-label={`Include repository ${repository.name || repository.id}`}>
                          <input
                            type="checkbox"
                            checked={additionalRepositories.includes(repository.id)}
                            disabled={!repository.available}
                            onChange={() => toggleAdditional(repository.id)}
                          />
                          <span>
                            <strong>{repository.name}</strong>
                            <small>{repository.remote_identity || repository.id}</small>
                          </span>
                        </label>
                      ))}
                  </div>
                )}
                <p className="form-help">
                  Primary: {selected?.name || primaryRepository}
                  {multiRepo && additionalRepositories.length
                    ? `; Additional: ${additionalRepositories.join(", ")}`
                    : "; Additional: none"}
                </p>
              </div>
            </CollapsibleSection>
            <label htmlFor="task">Outcome</label>
            <textarea
              id="task"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              rows={7}
              required
              placeholder="Describe the repository outcome, constraints and acceptance evidence."
            />
            <p className="form-help">
              Existing task compilation, routing, Aider/vLLM execution and validation remain authoritative.
            </p>
            {unselectedMentions.length > 0 && (
              <p className="panel-warning">
                Task mentions unselected registered repositories:{" "}
                {unselectedMentions.map((repository) => repository.name).join(", ")}.
                Scope will not widen unless you select them explicitly.
              </p>
            )}
            {mutation.error && <p className="error-text">{mutation.error.message}</p>}
            <Button
              className="button-primary"
              disabled={
                mutation.isPending ||
                repositories.isLoading ||
                !selected?.available ||
                !task.trim()
              }
            >
              <Zap size={16} />
              {mutation.isPending ? "Submitting…" : "Run task"}
            </Button>
          </form>
        </Card>
        <ExecutionPanel kind="task" executionId={executionId} showOutput={false} />
      </section>
    </>
  )
}



export function AgenticCodingPage() {
  const [tab, setTab] = useDomainTab("tasks")
  const tabs = [
    { id: "tasks", label: "Tasks" },
    { id: "validation", label: "Validation" },
    { id: "settings", label: "Settings" },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Agentic coding"
        title="Agentic Coding"
        description="Coding intent, deterministic validation and Aider-owned controls. Jira remains authoritative for work state."
        badge={<Badge tone="cyan">AIDER + ORCHY</Badge>}
      />
      <SectionTabs tabs={tabs} active={tab} setActive={setTab} />
      <SectionPanel tabId="tasks" active={tab === "tasks"}>
        <Tasks embedded />
      </SectionPanel>
      <SectionPanel tabId="validation" active={tab === "validation"}>
        <CollapsibleSection
          className="agentic-validation-disclosure"
          title="Coding validation"
          summary="Authoritative deterministic validation payload"
          defaultOpen
        >
          <JsonPanel endpoint="/api/validation" title="Coding validation" />
        </CollapsibleSection>
      </SectionPanel>
      <SectionPanel tabId="settings" active={tab === "settings"}>
        <DomainConfiguration section="agentic" />
      </SectionPanel>
    </>
  )
}

