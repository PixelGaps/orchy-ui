export type Telemetry = {
  timestamp: number
  cpu: { load1: number; load5: number; load15: number }
  ram: { used_gb: number; total_gb: number; available_gb: number }
  disk: { used_gb: number; total_gb: number; free_gb: number }
  gpu: {
    utilization_pct: number | null
    temperature_c: number | null
    vram_used_mib: number | null
    vram_total_mib: number | null
  }
}

export type Execution = {
  execution_id: string
  state: string
  phase: string
  resource_class: string
  activity: string
  task: string
  kind: string
  output_tail: string
  error: string
  elapsed_ms: number
  started_at?: number | string | null
  updated_at?: number | string | null
  created_at?: number | string | null
  target: string
  worker: string
  model: string
  progress: Record<string, unknown>
  attempt: number
  max_attempts: number
  correlation: Record<string, unknown>
  validation: Record<string, unknown>
  evidence: Record<string, unknown>[]
  result: unknown
  metadata: Record<string, unknown>
}

export type Candidate = {
  id?: string
  path?: string
  run_id?: string
  attempt?: number
  parent_id?: string | null
  parents?: string[]
  children?: string[]
  decision?: string
  score?: number | null
  score_delta?: number | null
  score_vector?: Record<string, number>
  score_deltas?: Record<string, number>
  failure_codes?: string[]
  resolved_failures?: string[]
  new_failures?: string[]
  best_status?: string
  prompt?: string
  exact_prompt?: string
}

type PackageResult = {
  id?: string
  directory?: string
  manifest?: string
  archive?: string
}

export type PBRResult = {
  status?: string
  passed?: boolean
  selected_maps?: Record<string, string>
  family_qa?: {
    decision?: string
    status?: string
    failure_codes?: string[]
  } | null
  family_history?: Array<Record<string, unknown>>
  package?: PackageResult | null
}

export type IsolatedObjectResult = {
  status?: string
  passed?: boolean
  selected_items?: Record<string, string>
  pack_qa?: {
    decision?: string
    status?: string
    failure_codes?: string[]
    affected_items?: string[]
  } | null
  pack_history?: Array<Record<string, unknown>>
  package?: PackageResult | null
}


export type Run = {
  databaseId: number
  name: string
  displayTitle: string
  status: string
  conclusion: string
  event: string
  headBranch: string
  createdAt: string
  url: string
}

export type HealthcheckItem = {
  id: string
  domain: string
  label: string
  description: string
  resource_class: string
  gpu_required: boolean
  latest?: Execution | null
}

export type LogsPayload = {
  executions: Execution[]
  jobs: Array<Record<string, unknown>>
  healthchecks: Execution[]
  ci_runs: Run[]
  evidence: Record<string, unknown>
  response_preview?: string
}

export type OperatorSettingField = {
  name: string
  value: unknown
  type: string
  choices: string[]
  restart_required: boolean
  secret: boolean
  description: string
  category?: string
  affected_components?: string[]
  host_critical?: boolean
  source?: "environment" | "default"
  derived?: boolean
  path_status?: {
    exists?: boolean
    writable?: boolean
    valid?: boolean
    nearest_existing_parent?: string
    free_bytes?: number | null
    reasons?: string[]
  }
}

export type OperatorSettingSection = {
  section: string
  fields: OperatorSettingField[]
}

export type ConfigurationPreview = {
  section: string
  field: string
  current: unknown
  proposed: unknown
  restart_required: boolean
  allowed: boolean
  reason: string
  host_apply_required?: boolean
  apply_mode?: string
  affected_components?: string[]
  host_critical?: boolean
  automatic_reload_components?: string[]
  deferred_components?: string[]
  current_path_status?: Record<string, unknown>
  proposed_path_status?: Record<string, unknown>
  active_execution_blockers?: Array<Record<string, string>>
}

export type ConfigurationApplyResult = ConfigurationPreview & {
  applied: boolean
  reload_status?: string
  verified_components?: string[]
  verification_required?: boolean
}

export type RuntimeStatus = {
  containers: Array<Record<string, unknown>>
  model: string
  base_url: string
  health_url: string
}

export type CapabilityEntry = {
  id: string
  platform: string
  label: string
  status: "available" | "unavailable" | "unsupported" | "host-required" | "not-qualified" | "installed" | "resource-ineligible"
  implemented: boolean
  executable: boolean
  runtime_required: boolean
  capabilities: string[]
  reason: string
  metadata: Record<string, unknown>
}

export type CapabilityRegistry = {
  schema: string
  entries: CapabilityEntry[]
}

export type LLMRuntime = RuntimeStatus & {
  models: Record<string, string[]>
  provider_adapters?: Record<string, {
    transport: string
    capability_mode: string
    optional: boolean
  }>
  configuration: OperatorSettingSection
}

export type DeepResearchRuntime = {
  ready?: boolean
  status?: string
  provider?: string
  model: string
  base_url?: string
  capabilities?: string[]
  model_path?: string
  model_present?: boolean
  served_models?: string[]
  detail?: string
  pid?: number
  log_path?: string
}

export type DeepResearchRequest = {
  question: string
  max_queries?: number
  max_sources?: number
}

export type DeepResearchSource = {
  id: string
  title: string
  url: string
  query: string
  authority?: "primary" | "secondary" | "unknown"
  domain?: string
  published_at?: string
  snippet?: string
}

export type DeepResearchResponse = {
  question: string
  model: string
  queries: string[]
  evidence_count: number
  ranking_mode: string
  answer: string
  sources: DeepResearchSource[]
  cited_source_ids?: string[]
  usage: Record<string, unknown>
  reasoning_tokens: number
}

export type ComfyUIRuntime = {
  url: string
  health_url: string
  workflow_path: string
  pbr_source_workflow_path: string
  pbr_map_workflow_path: string
  pbr_source_image_node_id: string
  isolated_object_workflow_path: string
  output_dir: string
  configuration: OperatorSettingSection
}

export type ComponentHealth = {
  status: string
  http_status?: number | null
  latency_ms?: number | null
  [key: string]: unknown
}

export type MissionStepOverview = {
  id: string
  label: string
  status: string
  elapsed_ms?: number | null
  error?: string
  log?: string
}

export type MissionResultSummary =
  | {
      adapter_id: string
      kind: "pbr_qualification"
      available: boolean
      status: string
      package_id: string | null
      publish_ready: boolean
      passed_layers: number
      failed_layers: number
      family_qa: string | null
      repair_clear: boolean
      repair_score_delta: number | null
      manifest_available: boolean
      archive_available: boolean
      preview_count: number
      evidence_available: boolean
    }
  | {
      adapter_id: string
      kind: "icon_qualification"
      available: boolean
      status: string
      package_id: string | null
      item_count: number
      pack_qa: string | null
      gallery_cataloged: boolean | null
      manifest_available: boolean
      archive_available: boolean
      evidence_available: boolean
    }
  | {
      adapter_id: string
      kind: "generic"
      available: boolean
      status: string
      successful: boolean | null
      elapsed_ms: number | null
      step_total: number
      passed_steps: number
      failed_steps: number
      evidence_available: boolean
    }

export type MissionRunOverview = {
  execution_id: string
  state: string
  terminal: boolean
  successful: boolean | null
  phase?: string
  activity?: string
  target?: string
  started_at?: number | string | null
  updated_at?: number | string | null
  elapsed_ms?: number | null
  error?: string
  test_count: number
  passed_steps: number
  failed_steps: number
  running_steps: number
  pending_steps: number
  steps: MissionStepOverview[]
  result_summary: MissionResultSummary
  mission_evaluation?: MissionEvaluation | null
}

export type MissionLaunchParameter = {
  name: string
  type: string
  required: boolean
  default: unknown
  minimum: number | null
  maximum: number | null
  pattern: string | null
  max_length: number | null
  source: string
  choices: string[]
}

export type MissionLaunchDefinition = {
  kind: string
  first_launch_supported: boolean
  parameters: MissionLaunchParameter[]
  fixed_parameters: Record<string, unknown>
}

export type MissionRuntimeEstimate = {
  estimate_ms: number
  tier: "QUICK" | "STANDARD" | "LONG" | "EPIC" | "MARATHON"
  source: "successful_median" | "terminal_median" | "catalog_default"
  observation_count: number
  confidence: "high" | "medium" | "low" | "default"
  display_hint: string
}

export type MissionEvaluation = {
  schema?: string
  version?: number
  observed_duration_class?: string
  information_value?: { class?: string; explanation?: string }
  improvements?: Record<string, unknown>[]
  regressions?: Record<string, unknown>[]
  remaining_gaps?: Record<string, unknown>[]
  uncertainty?: Record<string, unknown>
  contribution?: Record<string, unknown>
  decision?: { action?: string; reason?: string }
  candidate_next_missions?: Array<{
    candidate_id?: string
    candidate_type?: string
    reason?: string
    expected_value_class?: string
    expected_information_gain?: number
    estimated_p50_seconds?: number
    estimated_p95_seconds?: number
    candidate_change_set?: Record<string, unknown>
    operator?: string
    tuning_surface?: string
    predicted?: Record<string, number>
    utility?: number
    promotion_policy?: string
  }>
  suppressed_candidates?: Array<{ candidate_id?: string; reason?: string }>
  autotune?: {
    session_id?: string
    round?: number
    diagnosis?: string
    predicted_vs_realized?: Record<string, unknown>
    session_budget?: Record<string, unknown>
    promotion?: Record<string, unknown>
    champion?: Record<string, unknown>
    rollback?: Record<string, unknown>
    capability_gap?: Record<string, unknown>
  }
}

export type MissionAutotuneCandidate = {
  candidate_id?: string | null
  tuning_surface?: string | null
  experiment_operator?: string | null
  reason?: string | null
  dominated_by?: string | null
}

export type MissionAutotuneProjection = {
  candidate_id?: string | null
  spec_digest?: string | null
  spec_version?: number | null
  session_id?: string | null
  session_status?: string | null
  session_mode?: string | null
  generation?: number
  source_champion?: {
    candidate_id?: string | null
    sha?: string | null
    prior_sha?: string | null
    promotion_digest?: string | null
    rollback_digest?: string | null
    challenger_ref?: string | null
  } | null
  strategy_champion?: {
    key?: string | null
    version?: number | null
    version_digest?: string | null
    state?: string | null
  } | null
  champion_history?: Array<{
    candidate_id?: string | null
    prior_champion_sha?: string | null
    champion_sha?: string | null
    promotion_digest?: string | null
    benchmark_digest?: string | null
  }>
  rollback_available?: boolean
  review_available?: boolean
  operator_review?: {
    decision?: string | null
    reason?: string | null
    reviewed_action?: string | null
    deterministic_reentry_required?: boolean
  } | null
  site_intelligence?: {
    snapshot?: {
      schema?: string | null
      version?: number | null
      source_revision?: string | null
      query_digest?: string | null
      cluster_id?: string | null
      page_count?: number | null
      digest?: string | null
    }
    page_ids?: string[]
    metrics?: Record<string, number>
  } | null
  round?: number | null
  purpose?: string | null
  domain?: string | null
  target_scope: Record<string, unknown>
  resource_class?: string | null
  estimated_p50_seconds?: number | null
  estimated_p95_seconds?: number | null
  max_runtime_seconds?: number | null
  observed_elapsed_ms?: number | null
  operator?: string | null
  operator_version?: number | null
  tuning_surface?: string | null
  tuning_surface_version?: number | null
  opportunity_type?: string | null
  question?: string | null
  hypothesis?: string | null
  controlled_variables: string[]
  candidate_change_set: Record<string, unknown>
  invariants: Record<string, unknown>
  current_champion: Record<string, unknown>
  baseline_identity?: string | null
  comparison_context?: string | null
  frozen_inputs: {
    corpus_identity?: string | null
    seed_set_identity?: string | null
    evaluator_bundle?: string | null
    prompt?: unknown
    baseline_metric?: number | null
    held_out_baseline_metric?: number | null
    qa_sample_count: number
    held_out_qa_sample_count: number
  }
  candidate_generation: Record<string, unknown>
  predicted_outcome: Record<string, unknown>
  utility?: number | null
  rank?: number | null
  calibration: {
    sample_count?: number
    realization_probability?: number
    quality_realization_ratio?: number
    information_realization_ratio?: number
    failure_rate?: number
    regression_rate?: number
  }
  inference?: {
    status?: string | null
    prompt_contract_version?: number | null
    provider?: {
      provider?: string | null
      model?: string | null
    }
    error?: string | null
    diagnoses?: Array<Record<string, unknown>>
    hypotheses?: Array<{
      id?: string
      claim?: string
      confidence?: number
      falsifier?: string
      supporting_evidence_refs?: string[]
      contradicting_evidence_refs?: string[]
      assumptions?: string[]
    }>
    accepted_proposal_count?: number
    rejected_proposals?: Array<{
      index?: string
      reason?: string
    }>
    critic?: {
      hypothesis_verdicts?: Array<{
        hypothesis_id?: string
        verdict?: string
        confidence?: number
        reason?: string
      }>
      prediction_error_explanation?: string
      revised_beliefs?: string[]
      evidence_needed?: string[]
    }
  }
  contribution?: {
    evidence_quality?: number
    information_gain?: number
    uncertainty_reduction?: number
    verified_quality_impact?: number
    discovery_value?: number
    efficiency_gain?: number
    reproducibility_gain?: number
    regression_safe?: boolean
    regression_count?: number
    new_defect_count?: number
    predicted?: {
      quality_gain?: number
      information_gain?: number
    }
    predicted_vs_realized?: {
      quality_gain_error?: number
      information_gain_error?: number
    }
  } | null
  diagnoses: Array<Record<string, unknown>>
  decision: {
    action?: string | null
    reason?: string | null
  }
  capability_gaps: Array<Record<string, unknown>>
  suppressed_candidates: MissionAutotuneCandidate[]
  promotion_policy?: string | null
  promotion?: Record<string, unknown> | null
  rollback_reference?: Record<string, unknown> | null
  session_budget: {
    max_rounds?: number | null
    remaining_rounds?: number | null
    max_candidates?: number | null
    remaining_candidates?: number | null
    max_wall_seconds?: number | null
    remaining_wall_seconds?: number | null
    max_gpu_seconds?: number | null
    remaining_gpu_seconds?: number | null
    max_attempts?: number | null
    remaining_attempts?: number | null
  }
  session_usage: Record<string, unknown>
  session_stop_reason?: string | null
}

export type MissionOverviewItem = {
  key: string
  label: string
  class: "required" | "exploratory"
  registered: boolean
  family: string
  description: string
  icon_token: string
  tags: string[]
  resource_class: string
  launch: MissionLaunchDefinition | null
  default_expected_duration_ms: number | null
  output_summary_adapter_id: string
  evidence_route: string
  output_route: string | null
  never_run: boolean
  run_count: number
  terminal_count: number
  clear_count: number
  failure_count: number
  first_run_at: number | null
  last_run_at: number | null
  last_clear_at: number | null
  success_streak: number
  best_elapsed_ms: number | null
  latest_clear_target: string | null
  current_target: string | null
  latest_clear_stale: boolean | null
  statistics_scope: "retained_execution_window"
  runtime_estimate: MissionRuntimeEstimate
  recent_history: MissionRunOverview[]
  history_limit: number
  history_truncated: boolean
  active: MissionRunOverview | null
  latest: MissionRunOverview | null
  output_summary: MissionResultSummary | null
  mission_spec_version?: number | null
  rpg_display?: { icon?: string; accent?: string }
  rpg_objectives?: { metric: string; direction: string; target?: number }[]
  rpg_stats?: Record<string, number>
  rpg_rewards?: {
    completion_xp?: number
    discovery_xp_min?: number
    discovery_xp_max?: number
    impact_xp_cap?: number
  }
  mission_evaluation?: MissionEvaluation | null
  autotune?: MissionAutotuneProjection | null
  mission_scorecard?: {
    comparable_objectives?: number
    improved_objectives?: number
    regressed_objectives?: number
    unchanged_objectives?: number
    entries?: {
      metric?: string
      baseline?: number | null
      outcome?: number | null
      absolute_delta?: number | null
      normalized_gain?: number | null
      result?: string
      explanation?: string
    }[]
  } | null
  mission_progression?: {
    purpose?: "SYSTEM" | "EXPLORATORY" | "PRODUCTION"
    xp?: {
      evidence?: number
      discovery?: number
      impact?: number
      efficiency?: number
      regression_safety?: number
      total?: number
    }
    confidence?: number
    level?: number
    xp_to_next_level?: number
    mastery?: Record<string, number>
    duplicate_reward_suppressed?: boolean
    achievements?: string[]
    explanation?: {
      formula?: string
      evidence?: string
      discovery?: string
      impact?: string
      efficiency?: string
      regression_safety?: string
      anti_farming?: string
    }
  } | null
  prompt_repair?: {
    quest_code: string | null
    quest_title: string | null
    tier: number
    target_layer: string
    baseline_identity: string | null
    baseline_strategy: string | null
    candidate_strategy: string | null
    repair_effectiveness_before: number | null
    repair_effectiveness_after: number | null
    repair_effectiveness_delta: number | null
    first_repair_pass_before: number | null
    first_repair_pass_after: number | null
    new_defect_rate_before: number | null
    new_defect_rate_after: number | null
    attempts_to_pass_before: number | null
    attempts_to_pass_after: number | null
    seconds_to_pass_before: number | null
    seconds_to_pass_after: number | null
    passed_pack_count: number
    publish_ready_yield: number | null
    best_pass_streak: number
    promotion_eligible: boolean | null
    per_layer_before: Record<string, {
      pass_rate?: number | null
      repair_effectiveness?: number | null
      first_repair_pass_rate?: number | null
      new_defect_rate?: number | null
      attempts_to_pass_median?: number | null
      seconds_to_pass_median?: number | null
      seconds_to_pass_p95?: number | null
    }>
    per_layer_after: Record<string, {
      pass_rate?: number | null
      repair_effectiveness?: number | null
      first_repair_pass_rate?: number | null
      new_defect_rate?: number | null
      attempts_to_pass_median?: number | null
      seconds_to_pass_median?: number | null
      seconds_to_pass_p95?: number | null
    }>
  } | null
  can_rerun: boolean
  rerun_execution_id: string | null
}

export type MissionOverview = {
  schema: string
  required_health: {
    status: "green" | "failed" | "running" | "unknown"
    total: number
    green: number
    failed: number
    running: number
  }
  required: MissionOverviewItem[]
  exploratory: MissionOverviewItem[]
  rpg_profile?: {
    level: number
    total_xp: number
    xp_to_next_level: number
    mastery: Record<string, number>
    achievements: string[]
  }
  mission_core?: {
    schema: string
    domains: Array<Record<string, unknown>>
    domain_registry_digest: string
    strategies: Array<Record<string, unknown>>
    strategy_registry_digest: string
    registered_missions: number
    required_missions: number
    exploratory_missions: number
    active_iterations: number
    adaptive_iterations: number
    capability_gap_backlog: Array<Record<string, unknown>>
    capability_gap_clusters: number
    capability_gap_count: number
    principles: Record<string, unknown>
  }
}

export type ProductQuotaOverview = {
  id: string
  product: string
  quota: string
  unit: string
  limit: number | null
  used: number | null
  remaining: number | null
  percent_used: number | null
  exhausted: boolean
  status: "ok" | "warning" | "exhausted" | "unknown"
  period?: string | null
  reset_at?: string | null
  source: string
  updated_at?: string | null
}


export type GatewayCapability = {
  allowed: boolean
  reason: string
}

export type GatewayJobPolicy = {
  policy_version: string
  classification: string
  health: string
  reason: string
  stale: boolean
  age_seconds: number
  claim_age_seconds: number | null
  thresholds: {
    queued_old_seconds: number
    running_abandoned_seconds: number
    worker_fresh_seconds: number
  }
  queue: {
    present: boolean
    visible: boolean | null
    lease_active: boolean
    visible_at: string | null
    read_count: number | null
  }
  worker: {
    host_id: string | null
    last_seen_at: string | null
    age_seconds: number | null
    fresh: boolean
  }
  recovery: {
    eligible: boolean
    action: string | null
    reason: string
    descriptor_replayable: boolean
    descendant_exists: boolean
    guard: string
  }
  capabilities: Record<"cancel" | "pause" | "resume" | "retry" | "rerun", GatewayCapability>
}

export type GatewayJob = {
  id: string
  repo: "orchy"
  job: string
  target_sha: string
  request_id: string
  host_id: string | null
  status: "queued" | "running" | "paused" | "pass" | "fail" | "rejected" | "timeout" | "cancelled"
  created_at: string
  claimed_at: string | null
  finished_at: string | null
  queue_msg_id: number | null
  retry_of: string | null
  pause_requested_at?: string | null
  paused_at?: string | null
  resume_requested_at?: string | null
  resumed_at?: string | null
  resume_count?: number
  checkpoint_mode?: string | null
  result_available?: boolean
  result_preview?: string | null
  error_available?: boolean
  error_preview?: string | null
  policy?: GatewayJobPolicy
}

export type GatewayLineageItem = {
  id: string
  status: GatewayJob["status"]
  created_at: string
  retry_of: string | null
  request_id: string
  depth?: number
  relation?: "ancestor" | "self" | "descendant"
}

export type GatewayAuditItem = {
  operation_id: string
  actor: string
  action: string
  job_id: string
  result_job_id: string | null
  from_status: string | null
  to_status: string | null
  occurred_at: string
  evidence: Record<string, unknown>
}

export type GatewayJobDetail = GatewayJob & {
  params_bytes?: number
  params_preview?: string | null
  result?: unknown
  error?: string | null
  lineage?: GatewayLineageItem[]
  audit?: GatewayAuditItem[]
  policy: GatewayJobPolicy
}

export type GatewayQueueList = {
  available: boolean
  status: "idle" | "active" | "empty" | "unavailable" | "disconnected" | "unknown"
  reason: string
  dashboard_url: string | null
  jobs: GatewayJob[]
  total_count: number
  has_more: boolean
  next_cursor: string | null
  limit: number
  order: "created_at_desc,id_desc"
  filters: Record<string, unknown>
}

export type GatewayQueueHealth = {
  available: boolean
  status: "live" | "unavailable" | "disconnected"
  reason: string
  dashboard_url: string | null
  observed_at?: string
  metrics?: {
    queue_name?: string
    queue_length?: number
    queue_visible_length?: number
    total_messages?: number
    newest_msg_age_sec?: number | null
    oldest_msg_age_sec?: number | null
    scrape_time?: string
  }
  lifecycle_counts?: Partial<Record<GatewayJob["status"], number>>
  classification_counts?: Record<string, number>
  health_counts?: Record<string, number>
  stale_count?: number
  queue_orphan_messages?: number
  ledger_queue_mismatches?: number
  oldest_pending_age_seconds?: number | null
  newest_pending_age_seconds?: number | null
  claimed_count?: number
  in_flight_count?: number
  paused_count?: number
  retry_count?: number
  resume_count?: number
  operator_retry_count?: number
  operator_rerun_count?: number
  operator_resume_count?: number
  workers?: Array<{
    host_id: string
    last_seen_at: string | null
    version: string | null
    age_seconds: number | null
    fresh: boolean
  }>
  recent_audit?: GatewayAuditItem[]
}

export type GatewayQueueSnapshot = {
  available: boolean
  status: "idle" | "active" | "unavailable" | "disconnected"
  reason: string
  dashboard_url: string | null
  metrics: {
    queue_name?: string
    queue_length?: number
    queue_visible_length?: number
    total_messages?: number
    newest_msg_age_sec?: number | null
    oldest_msg_age_sec?: number | null
    scrape_time?: string
  }
  counts: Partial<Record<GatewayJob["status"], number>>
  recent_jobs: GatewayJob[]
}

export type QualificationBatch = {
  id: string
  batch_key: string
  target_sha: string
  scope_digest: string
  affected_domains: string[]
  required_capabilities: string[]
  status: string
  evidence: Record<string, unknown>
  created_at: string
  finished_at?: string | null
}

export type QualificationBatchOverview = {
  available: boolean
  status: "active" | "idle" | "unavailable" | "disconnected" | "unknown"
  reason: string
  batches: QualificationBatch[]
}

export type OverviewPayload = {
  health: {
    status?: string
    components?: Record<string, ComponentHealth>
    [key: string]: unknown
  }
  telemetry: Telemetry
  active_executions: Execution[]
  healthchecks: Record<string, Execution>
  missions: MissionOverview
  quotas: ProductQuotaOverview[]
  qualification_batches: QualificationBatchOverview
}

export type ValidationPayload = {
  passed: boolean
  output: string
  elapsed_ms: number
}

export type LineagePayload = {
  path: string
  candidates: Candidate[]
}

export type GalleryArtifact = {
  id: string
  job_id: string
  run_id: string
  profile: string
  category: string
  subcategory: string
  status: "PASS" | "FAIL"
  decision: string
  score?: number | null
  failure_codes: string[]
  resolved_failures: string[]
  new_failures: string[]
  attempt: number
  selected: boolean
  best_status?: string | null
  relative_path: string
  sha256: string
  media_url: string
  created_at: number
}

export type GalleryPack = {
  id: string
  job_id: string
  profile: string
  status: "PUBLISH_READY"
  qa_status: string
  member_ids: string[]
  member_count: number
  manifest: string
  archive: string
  cover_artifact_id: string
  created_at: number
  members: GalleryArtifact[]
}

export type GalleryGroups = Record<
  string,
  Record<string, GalleryArtifact[]>
>

export type GalleryPayload = {
  schema: string
  updated_at: number
  summary: {
    publish_ready_packs: number
    passed_artifacts: number
    failed_artifacts: number
    passed_layers: number
    failed_layers: number
  }
  publish_ready: GalleryPack[]
  passed: GalleryGroups
  failed: GalleryGroups
}

export type AcceptedExecution = {
  status: string
  execution_id: string
}

export type ImageFactoryRunResponse = AcceptedExecution & {
  job_id: string
}

export type CancellationResponse = {
  status: string
  execution_id: string
}

export type HealthcheckRunResponse = AcceptedExecution & {
  check_id: string
}

export type RepositoryOption = {
  id: string
  name: string
  remote_identity: string
  default_branch: string
  available: boolean
  writable: boolean
  reason: string
  head: string
}

export type TaskRequest = {
  task: string
  repository_id: string
  additional_repository_ids: string[]
}

export type ImageFactoryProfile =
  | "generic"
  | "pbr"
  | "isolated_objects"
  | "seamless_patterns"
  | "icon_pack"
  | "sticker_pack"
  | "vfx_atlas"

export type ImageFactoryProductionMissionRequest = {
  objective: string
  profile: "pbr" | "icon_pack"
  preset_id?: "production-default"
  desired_outputs?: number
  candidate_budget?: number
  max_repair_attempts?: number
  qa_policy?: "production-default"
  qa_threshold?: number
  seed?: number
  seed_policy?: "increment"
  max_duration_seconds?: number
  items_per_output?: number
}

export type ImageFactoryProductionMissionResponse = AcceptedExecution & {
  mission_id: string
  production_id: string
}

export type ImageFactoryRunRequest = {
  profile: ImageFactoryProfile
  profile_spec?: Record<string, unknown>
  prompt: string
  workflow_path?: string
  comfy_url?: string
  output_dir?: string
  batch_size?: number
  required_passes?: number
  candidate_budget?: number
  qa_threshold?: number
  max_attempts?: number
  seed?: number
  job_id?: string
  resume?: boolean
}
