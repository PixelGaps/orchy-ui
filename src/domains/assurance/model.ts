import type {
  JiraProjection,
  TestOpsProjection,
} from "@/cloud/projections"

export type AssuranceLayerState = "completed" | "active" | "blocked" | "queued"

export type AssuranceLayerView = {
  number: number
  key: string
  label: string
  jiraKey: string
  jiraStatus: string
  state: AssuranceLayerState
  latest: TestOpsProjection["layers"][number] | null
  findings: TestOpsProjection["findings"]
  findingCount: number
}

export const ASSURANCE_LAYERS = [
  { number: 1, key: "01-fast-web", label: "Fast Web", jiraKey: "OR-590" },
  { number: 2, key: "02-fast-python", label: "Fast Python", jiraKey: "OR-594" },
  { number: 3, key: "03-property-state", label: "Property / State-machine", jiraKey: "OR-598" },
  { number: 4, key: "04-security", label: "Security", jiraKey: "OR-600" },
  { number: 5, key: "05-fuzz", label: "Fuzz", jiraKey: "OR-601" },
  { number: 6, key: "06-performance", label: "Performance", jiraKey: "OR-602" },
  { number: 7, key: "07-portability", label: "Portability", jiraKey: "OR-603" },
  { number: 8, key: "08-flakes", label: "Flakes / Randomized repetition", jiraKey: "OR-604" },
  { number: 9, key: "09-coverage-static", label: "Coverage / Static / Sonar", jiraKey: "OR-605" },
  { number: 10, key: "10-mutation", label: "Mutation", jiraKey: "OR-606" },
  { number: 11, key: "11-browser-e2e", label: "Browser / E2E", jiraKey: "OR-607" },
  { number: 12, key: "12-chaos-soak", label: "Live Chaos / Soak / Recovery", jiraKey: "OR-608" },
] as const

function layerNumberFromId(value: string): number | null {
  const match = value.match(/^(\d{1,2})/)
  if (!match) return null
  const parsed = Number(match[1])
  return parsed >= 1 && parsed <= 12 ? parsed : null
}

function workState(status: string, category: string): AssuranceLayerState {
  if (category === "Done") return "completed"
  if (/block/i.test(status)) return "blocked"
  if (/progress|review/i.test(status)) return "active"
  return "queued"
}

export function deriveAssuranceLayers(
  jira: JiraProjection | null | undefined,
  testOps: TestOpsProjection | null | undefined,
): AssuranceLayerView[] {
  return ASSURANCE_LAYERS.map((layer) => {
    const issue = jira?.issues.find((candidate) => candidate.key === layer.jiraKey)
    const latest =
      testOps?.layers.find((candidate) => candidate.jiraMilestone === layer.jiraKey) ??
      testOps?.layers.find((candidate) => layerNumberFromId(candidate.layerId) === layer.number) ??
      null
    const findings =
      testOps?.findings.filter(
        (candidate) => layerNumberFromId(candidate.layerId) === layer.number,
      ) ?? []
    return {
      ...layer,
      jiraStatus: issue?.status ?? "Unavailable",
      state: issue ? workState(issue.status, issue.statusCategory) : "queued",
      latest,
      findings,
      findingCount: findings.reduce((sum, item) => sum + item.findings, 0),
    }
  })
}

export function assuranceTotals(layers: AssuranceLayerView[]) {
  return layers.reduce(
    (totals, layer) => {
      totals[layer.state] += 1
      totals.findings += layer.findingCount
      return totals
    },
    { completed: 0, active: 0, blocked: 0, queued: 0, findings: 0 },
  )
}
