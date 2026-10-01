import type { GitHubProjection, JiraProjection, TestOpsProjection } from "./projections"

export const JIRA_FALLBACK_SNAPSHOT: JiraProjection = {
  "openCount": 59,
  "byStatus": {
    "In Progress": 42,
    "In Review": 8,
    "To Do": 9,
    "Done": 10
  },
  "issues": [
    {
      "key": "OR-11",
      "summary": "Milestone — Image Factory deterministic production replay",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "linear-milestone",
        "linear-milestone-id-1a885b37-640c-415a-90e1-d9c810c34271",
        "linear-progress-22-5"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-11",
      "updated": "2026-09-29T13:59:57.789+0200"
    },
    {
      "key": "OR-16",
      "summary": "Milestone — Orchy domain-oriented repository reorganization",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Medium",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "linear-milestone",
        "linear-milestone-id-a6640997-6668-44f0-aab8-02f1b395545c",
        "linear-progress-29-17"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-16",
      "updated": "2026-09-29T14:04:10.722+0200"
    },
    {
      "key": "OR-18",
      "summary": "Milestone — Orchy capability platforms & factory expansion",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Medium",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "linear-milestone",
        "linear-milestone-id-88df4b3d-7edb-4856-b8fe-9b99e343061a",
        "linear-progress-0"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-18",
      "updated": "2026-10-01T09:33:13.532+0200"
    },
    {
      "key": "OR-108",
      "summary": "ORCHY-073 — Capture V1 PBR/Icons production repair chains",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-11",
      "labels": [
        "area/image-factory",
        "area/pipeline",
        "area/testing",
        "constraint/host-required",
        "evidence/empirical",
        "evidence/validation-deferred",
        "linear-estimate-2",
        "linear-id-pix-162",
        "linear-source",
        "linear-status-backlog",
        "reconciled-2026-09-29"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-108",
      "updated": "2026-09-29T14:02:12.956+0200"
    },
    {
      "key": "OR-138",
      "summary": "ORCHY-122 — Real-host specialized runtime and factory certification",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-18",
      "labels": [
        "area/3d",
        "area/comfyui",
        "area/comfyui-platform",
        "area/document-ai",
        "area/llm",
        "area/llm-platform",
        "area/media-factory",
        "area/model-runtime",
        "area/runtime",
        "area/scientific-ai",
        "area/speech",
        "area/testing",
        "area/vision",
        "constraint/host-required",
        "evidence/empirical",
        "evidence/validation-deferred",
        "linear-estimate-5",
        "linear-id-pix-227",
        "linear-source",
        "linear-status-backlog",
        "state/blocked-host-offline"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-138",
      "updated": "2026-10-01T10:38:39.934+0200"
    },
    {
      "key": "OR-153",
      "summary": "ORCHY-114 — Real-host full-system certification after repository reorganization",
      "status": "In Review",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-16",
      "labels": [
        "area/control-plane",
        "area/image-factory",
        "area/runtime",
        "area/testing",
        "area/ui",
        "constraint/host-required",
        "evidence/empirical",
        "evidence/validation-deferred",
        "linear-estimate-5",
        "linear-id-pix-212",
        "linear-source",
        "linear-status-backlog",
        "mode/fast-development",
        "state/implementation-complete"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-153",
      "updated": "2026-09-30T05:15:01.406+0200"
    },
    {
      "key": "OR-207",
      "summary": "ORCHY-059.1 — V1 Icons production qualification",
      "status": "In Review",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Subtask",
      "parentKey": "OR-39",
      "labels": [
        "image-factory",
        "leaf-validation",
        "profile-icons",
        "reconciled-2026-09-29",
        "scope-v1"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-207",
      "updated": "2026-09-29T14:00:02.664+0200"
    },
    {
      "key": "OR-236",
      "summary": "Video Factory M6 — DEFERRED host commissioning and real-video validation",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "Medium",
      "type": "Task",
      "parentKey": "OR-234",
      "labels": [
        "deferred",
        "host-validation",
        "video-factory"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-236",
      "updated": "2026-09-29T14:04:15.175+0200"
    },
    {
      "key": "OR-273",
      "summary": "Milestone — Image Factory QA, repair and PBR accuracy hardening",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "area/image-factory",
        "area/testing",
        "evidence/empirical",
        "mode/fast-development",
        "priority/frozen",
        "quality/accuracy",
        "scope-v1",
        "state/implementation-complete",
        "validation/deferred"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-273",
      "updated": "2026-09-29T14:00:06.200+0200"
    },
    {
      "key": "OR-278",
      "summary": "QA-05 — PBR physical plausibility and deterministic reference-render validation",
      "status": "In Review",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-273",
      "labels": [
        "area/image-factory",
        "area/testing",
        "constraint/host-required",
        "mode/fast-development",
        "pbr",
        "quality/accuracy",
        "scope-v1",
        "state/implementation-complete",
        "validation/deferred"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-278",
      "updated": "2026-09-29T14:00:08.516+0200"
    },
    {
      "key": "OR-280",
      "summary": "QA-07 — Empirical threshold calibration and false-accept/false-reject reporting",
      "status": "In Review",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-273",
      "labels": [
        "area/image-factory",
        "area/testing",
        "benchmark",
        "calibration",
        "mode/fast-development",
        "quality/accuracy",
        "scope-v1",
        "state/implementation-complete",
        "validation/deferred"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-280",
      "updated": "2026-09-29T14:02:19.729+0200"
    },
    {
      "key": "OR-281",
      "summary": "QA-08 — Accuracy certification gate, benchmark deltas and production go/no-go evidence",
      "status": "In Review",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-273",
      "labels": [
        "area/image-factory",
        "area/testing",
        "benchmark",
        "mission/required",
        "mode/fast-development",
        "quality/accuracy",
        "scope-v1",
        "state/implementation-complete",
        "validation/deferred"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-281",
      "updated": "2026-09-29T14:02:47.671+0200"
    },
    {
      "key": "OR-287",
      "summary": "Milestone — Full-stack coverage and Sonar zero-issue hardening",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": null,
      "labels": [],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-287",
      "updated": "2026-09-29T14:00:10.736+0200"
    },
    {
      "key": "OR-290",
      "summary": "QA-GPUV — Pending GPU/real-host accuracy certification",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-278",
      "labels": [
        "evidence/validation-deferred",
        "mode/fast-development"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-290",
      "updated": "2026-09-29T14:02:49.963+0200"
    },
    {
      "key": "OR-296",
      "summary": "QA-ALLV — Deferred integrated validation after frozen accuracy hardening",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-273",
      "labels": [
        "area/image-factory",
        "area/testing",
        "benchmark",
        "constraint/host-required",
        "mode/fast-development",
        "quality/accuracy",
        "validation/deferred"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-296",
      "updated": "2026-09-29T14:00:13.408+0200"
    },
    {
      "key": "OR-300",
      "summary": "QA-07V — Deferred validation for calibration registry and reports",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-280",
      "labels": [
        "area/image-factory",
        "area/testing",
        "mode/fast-development",
        "quality/accuracy",
        "validation/deferred"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-300",
      "updated": "2026-09-29T14:02:52.208+0200"
    },
    {
      "key": "OR-301",
      "summary": "QA-08V — Deferred integrated accuracy certification",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-281",
      "labels": [
        "area/image-factory",
        "area/testing",
        "mode/fast-development",
        "quality/accuracy",
        "validation/deferred"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-301",
      "updated": "2026-09-29T14:02:54.667+0200"
    },
    {
      "key": "OR-336",
      "summary": "SC-05 — Sonar zero actionable issues",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Subtask",
      "parentKey": "OR-287",
      "labels": [],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-336",
      "updated": "2026-10-01T03:21:47.335+0200"
    },
    {
      "key": "OR-337",
      "summary": "Inherited coverage/Sonar certification debt — close through TEST LAYER 09",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Subtask",
      "parentKey": "OR-605",
      "labels": [
        "coverage-static-sonar",
        "inherited-testing-debt",
        "layer-09",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-337",
      "updated": "2026-09-30T05:37:59.122+0200"
    },
    {
      "key": "OR-354",
      "summary": "ORCHY-114V — Finish exact-head domain-reorg Image Factory runtime certification",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Subtask",
      "parentKey": "OR-153",
      "labels": [
        "area/image-factory",
        "area/runtime",
        "area/testing",
        "constraint/host-required",
        "evidence/empirical",
        "quality/accuracy",
        "validation/deferred"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-354",
      "updated": "2026-09-30T05:39:15.119+0200"
    },
    {
      "key": "OR-356",
      "summary": "Milestone — Mission Autotune v3: evidence-driven factory self-improvement",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "director",
        "gamification",
        "gpu-efficiency",
        "host-validation-umbrella",
        "image-factory",
        "mission-rpg-v3",
        "mission-spec-v2",
        "missions",
        "progression",
        "rpg",
        "top-priority"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-356",
      "updated": "2026-09-29T14:00:37.245+0200"
    },
    {
      "key": "OR-372",
      "summary": "Milestone — Testing assurance 2026: effectiveness, resilience and evidence closure",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "2026",
        "advanced-testing",
        "quality",
        "reliability",
        "testing"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-372",
      "updated": "2026-10-01T09:33:17.626+0200"
    },
    {
      "key": "OR-379",
      "summary": "TA26-O07 — Advanced-testing evidence, adoption map and final validation-doc closeout",
      "status": "In Review",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-372",
      "labels": [
        "closeout",
        "docs",
        "evidence",
        "testing"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-379",
      "updated": "2026-09-29T14:02:56.891+0200"
    },
    {
      "key": "OR-381",
      "summary": "HOST-TA26-O — Host-only advanced assurance on Madriguera",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-372",
      "labels": [
        "advanced-testing",
        "blocked",
        "chaos",
        "deferred-validation",
        "hardware-only",
        "host-validation",
        "private-network",
        "reconciled-2026-09-29",
        "zero-dc"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-381",
      "updated": "2026-09-29T23:33:39.055+0200"
    },
    {
      "key": "OR-385",
      "summary": "MUT-DEBT — ExecutionStore survivors (rebaseline current SHA)",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-373",
      "labels": [
        "advanced-testing",
        "historical-baseline",
        "measured-baseline",
        "mutation",
        "rebaseline-required",
        "reconciled-2026-09-29",
        "survivor-debt"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-385",
      "updated": "2026-10-01T09:30:56.385+0200"
    },
    {
      "key": "OR-387",
      "summary": "MUT-DEBT — MissionSpec survivors (rebaseline current SHA)",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-373",
      "labels": [
        "advanced-testing",
        "historical-baseline",
        "measured-baseline",
        "mutation",
        "rebaseline-required",
        "reconciled-2026-09-29",
        "survivor-debt"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-387",
      "updated": "2026-10-01T09:30:58.368+0200"
    },
    {
      "key": "OR-399",
      "summary": "HOST-TA26-O07 — Final advanced-assurance evidence reconciliation",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-379",
      "labels": [
        "advanced-testing",
        "closeout",
        "evidence",
        "host-validation"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-399",
      "updated": "2026-09-29T23:33:51.552+0200"
    },
    {
      "key": "OR-410",
      "summary": "MRPG3-08 — Mission Autotune acceptance, exact-SHA factory qualification and docs reconciliation",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-356",
      "labels": [
        "acceptance",
        "deferred-validation",
        "gpu",
        "host-validation",
        "madriguera",
        "mission-rpg-v3",
        "missions",
        "rpg",
        "top-priority"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-410",
      "updated": "2026-10-01T09:32:24.788+0200"
    },
    {
      "key": "OR-441",
      "summary": "Mission Scientist demand-managed LLM runtime — real-host acceptance",
      "status": "In Review",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": null,
      "labels": [
        "OR-431",
        "autotune",
        "deferred-validation",
        "host-validation",
        "inference",
        "madriguera",
        "missions",
        "reconciled-2026-09-29",
        "runtime",
        "vllm"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-441",
      "updated": "2026-09-29T14:00:50.543+0200"
    },
    {
      "key": "OR-447",
      "summary": "Mission Core — cross-domain self-improvement control plane",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "dashboard",
        "host-validation-umbrella",
        "mission-core",
        "missions",
        "self-improvement"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-447",
      "updated": "2026-10-01T03:33:23.607+0200"
    },
    {
      "key": "OR-453",
      "summary": "Deep Research Mission adapter — active-learning self-improvement loop",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-447",
      "labels": [
        "deep-research",
        "deferred-validation",
        "host-validation",
        "madriguera",
        "mission-core",
        "missions",
        "self-improvement"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-453",
      "updated": "2026-10-01T04:40:04.522+0200"
    },
    {
      "key": "OR-457",
      "summary": "Rotate exposed cloud-runner credentials after onboarding",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "High",
      "type": "Task",
      "parentKey": null,
      "labels": [
        "cloud-runner",
        "credentials",
        "security"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-457",
      "updated": "2026-09-29T14:03:24.025+0200"
    },
    {
      "key": "OR-479",
      "summary": "Qualify Azure Pipelines Free runner when Microsoft account is unblocked",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "Medium",
      "type": "Task",
      "parentKey": null,
      "labels": [
        "azure",
        "cloud-runner",
        "deferred",
        "zero-spend"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-479",
      "updated": "2026-09-29T14:04:17.490+0200"
    },
    {
      "key": "OR-481",
      "summary": "Offload SonarScanner and coverage analysis to Buildkite Hosted",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-480",
      "labels": [
        "buildkite",
        "cloud-runner",
        "coverage",
        "sonar"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-481",
      "updated": "2026-09-30T14:42:25.887+0200"
    },
    {
      "key": "OR-495",
      "summary": "Milestone — Agentic Coding reconciliation: lean execution loop and New Task recovery",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "agentic-coding",
        "audit-2026-09-27",
        "new-task",
        "reconciliation"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-495",
      "updated": "2026-10-01T09:33:21.989+0200"
    },
    {
      "key": "OR-504",
      "summary": "AGREC-09 P1 — Frozen benchmark, exact-SHA certification and final documentation reconciliation",
      "status": "In Review",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-495",
      "labels": [
        "agentic-coding",
        "new-task",
        "reconciliation"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-504",
      "updated": "2026-09-30T14:32:08.896+0200"
    },
    {
      "key": "OR-515",
      "summary": "Milestone — Recursive Mission Self-Improvement v1 (near-singularity)",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "agentic-coding",
        "dashboard",
        "host-validation-umbrella",
        "missions",
        "recursive-improvement",
        "self-improvement",
        "singularity-v1"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-515",
      "updated": "2026-10-01T09:33:25.695+0200"
    },
    {
      "key": "OR-518",
      "summary": "RSI-03 P0 — Real recursive Mission qualification (3 generations)",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-515",
      "labels": [
        "benchmark",
        "deferred-validation",
        "exact-sha",
        "host-validation",
        "madriguera",
        "missions",
        "qualification",
        "recursive-improvement"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-518",
      "updated": "2026-09-29T14:01:55.428+0200"
    },
    {
      "key": "OR-521",
      "summary": "Milestone — Agentic Coding 16GB efficiency + runtime selection v2",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "16gb-vram",
        "agentic-coding",
        "benchmark",
        "exact-sha",
        "local-llm",
        "runtime-selection"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-521",
      "updated": "2026-10-01T09:33:29.835+0200"
    },
    {
      "key": "OR-524",
      "summary": "AG16-03 P0 — 16 GB local model + vLLM memory qualification",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-521",
      "labels": [
        "16gb-vram",
        "agentic-coding",
        "host-required",
        "model-benchmark",
        "vllm"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-524",
      "updated": "2026-09-30T11:52:12.439+0200"
    },
    {
      "key": "OR-525",
      "summary": "AG16-04 P0 — Current-controller benchmark adapters for Aider, Cline and OpenCode",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-521",
      "labels": [
        "agentic-coding",
        "aider",
        "cline",
        "opencode",
        "runtime-selection"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-525",
      "updated": "2026-09-30T11:52:14.689+0200"
    },
    {
      "key": "OR-527",
      "summary": "AG16-06 P0 — Strict-parity Aider vs Cline vs OpenCode bake-off",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-521",
      "labels": [
        "agentic-coding",
        "aider",
        "benchmark",
        "cline",
        "opencode",
        "runtime-selection"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-527",
      "updated": "2026-09-30T11:52:18.765+0200"
    },
    {
      "key": "OR-528",
      "summary": "AG16-07 P1 — Native-strength optimization lane for eligible runtimes",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-521",
      "labels": [
        "agentic-coding",
        "benchmark",
        "native-strength",
        "runtime-selection"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-528",
      "updated": "2026-09-29T14:03:31.350+0200"
    },
    {
      "key": "OR-529",
      "summary": "AG16-08 P1 — ChatGPT reference throughput + local gap analysis",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-521",
      "labels": [
        "agentic-coding",
        "benchmark",
        "chatgpt-reference",
        "local-llm"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-529",
      "updated": "2026-09-29T14:03:55.328+0200"
    },
    {
      "key": "OR-530",
      "summary": "AG16-09 P1 — Evidence-gated runtime/model promotion, rollback and reconciliation",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-521",
      "labels": [
        "agentic-coding",
        "promotion",
        "reconciliation",
        "rollback",
        "runtime-selection"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-530",
      "updated": "2026-09-29T14:05:06.690+0200"
    },
    {
      "key": "OR-532",
      "summary": "Qualify OCI A1 Always Free as primary durable SonarQube Server host",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Medium",
      "type": "Task",
      "parentKey": "OR-480",
      "labels": [
        "arm64",
        "cloud-runner",
        "oci",
        "persistent-service",
        "sonar",
        "zero-spend"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-532",
      "updated": "2026-10-01T10:30:13.217+0200"
    },
    {
      "key": "OR-534",
      "summary": "Deferred empirical Mission evidence — drift, freshness and shadow challenger",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-446",
      "labels": [
        "cloud-detached",
        "deferred-validation",
        "empirical-validation",
        "missions",
        "reconciled-2026-09-29",
        "self-improvement"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-534",
      "updated": "2026-09-29T14:03:59.638+0200"
    },
    {
      "key": "OR-535",
      "summary": "Deferred empirical Strategy Lab acceptance — real challenger to next-Mission champion",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-455",
      "labels": [
        "cloud-detached",
        "deferred-validation",
        "empirical-validation",
        "missions",
        "reconciled-2026-09-29",
        "self-improvement",
        "strategy-lab"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-535",
      "updated": "2026-09-29T14:04:01.939+0200"
    },
    {
      "key": "OR-548",
      "summary": "RESEARCH-CARRYOVER — Deferred Surfer empirical qualification after repository retirement",
      "status": "To Do",
      "statusCategory": "To Do",
      "priority": "High",
      "type": "Task",
      "parentKey": null,
      "labels": [
        "deferred-validation",
        "missions",
        "research",
        "surfer-retirement"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-548",
      "updated": "2026-10-01T03:33:30.121+0200"
    },
    {
      "key": "OR-557",
      "summary": "RREL-08 P1 — Noninteractive Tailscale WIF recovery; remove interactive-auth recovery from normal operations",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-549",
      "labels": [
        "execution-reliability-v2",
        "p1",
        "recovery",
        "tailscale",
        "wif",
        "zero-dc"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-557",
      "updated": "2026-09-30T14:47:36.337+0200"
    },
    {
      "key": "OR-590",
      "summary": "TEST LAYER 01 — Fast Web",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "fast-web",
        "layer-01",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-590",
      "updated": "2026-09-29T20:47:26.442+0200"
    },
    {
      "key": "OR-594",
      "summary": "TEST LAYER 02 — Fast Python",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "fast-python",
        "layer-02",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-594",
      "updated": "2026-09-30T03:51:42.850+0200"
    },
    {
      "key": "OR-598",
      "summary": "TEST LAYER 03 — Property / State-machine",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "layer-03",
        "property-state-machine",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-598",
      "updated": "2026-09-29T21:41:48.478+0200"
    },
    {
      "key": "OR-600",
      "summary": "TEST LAYER 04 — Security",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "layer-04",
        "security",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-600",
      "updated": "2026-10-01T02:34:14.789+0200"
    },
    {
      "key": "OR-601",
      "summary": "TEST LAYER 05 — Fuzz",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "fuzz",
        "layer-05",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-601",
      "updated": "2026-10-01T02:11:28.081+0200"
    },
    {
      "key": "OR-602",
      "summary": "TEST LAYER 06 — Performance",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "layer-06",
        "performance",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-602",
      "updated": "2026-10-01T03:24:28.321+0200"
    },
    {
      "key": "OR-603",
      "summary": "TEST LAYER 07 — Portability",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "layer-07",
        "portability",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-603",
      "updated": "2026-10-01T03:24:31.485+0200"
    },
    {
      "key": "OR-604",
      "summary": "TEST LAYER 08 — Flakes / Randomized repetition",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "flakes",
        "layer-08",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-604",
      "updated": "2026-10-01T03:24:35.053+0200"
    },
    {
      "key": "OR-605",
      "summary": "TEST LAYER 09 — Coverage / Static / Sonar",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "coverage-static-sonar",
        "layer-09",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-605",
      "updated": "2026-09-30T03:19:11.582+0200"
    },
    {
      "key": "OR-606",
      "summary": "TEST LAYER 10 — Mutation",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "layer-10",
        "mutation",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-606",
      "updated": "2026-10-01T09:32:28.349+0200"
    },
    {
      "key": "OR-607",
      "summary": "TEST LAYER 11 — Browser / E2E",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "browser-e2e",
        "layer-11",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-607",
      "updated": "2026-09-29T23:49:23.579+0200"
    },
    {
      "key": "OR-608",
      "summary": "TEST LAYER 12 — Live Chaos / Soak / Recovery",
      "status": "Done",
      "statusCategory": "Done",
      "priority": "High",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "layer-12",
        "live-chaos-soak-recovery",
        "test-layer-parent",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-608",
      "updated": "2026-10-01T10:40:05.713+0200"
    },
    {
      "key": "OR-620",
      "summary": "Milestone — Orchy Operator Dashboard: zero-cost private hosted UI + Notion fallback",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "cloud-control",
        "mobile-first",
        "notion-operator",
        "notion-parity",
        "supabase",
        "test-assurance",
        "zero-spend"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-620",
      "updated": "2026-10-01T09:30:22.911+0200"
    },
    {
      "key": "OR-644",
      "summary": "Layer 10 current target regresses frozen mutation score and survivor ratchets",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "High",
      "type": "Subtask",
      "parentKey": "OR-606",
      "labels": [
        "deferred-remediation",
        "layer-10",
        "mutation",
        "quality-regression"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-644",
      "updated": "2026-10-01T09:33:34.043+0200"
    },
    {
      "key": "OR-647",
      "summary": "OCC-14 — Operator UI parity and platform limitation register",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-620",
      "labels": [
        "notion-operator",
        "notion-parity",
        "ui-gap-register",
        "zero-spend"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-647",
      "updated": "2026-10-01T09:30:24.556+0200"
    },
    {
      "key": "OR-648",
      "summary": "Emergency Supabase-independent 12-layer certification sweep",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-579",
      "labels": [
        "12-layer-sweep",
        "emergency-certification",
        "supabase-outage",
        "testops"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-648",
      "updated": "2026-10-01T09:29:57.812+0200"
    },
    {
      "key": "OR-651",
      "summary": "Milestone — Supabase-free critical path & quota-resilient Orchy",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Epic",
      "parentKey": null,
      "labels": [
        "execution-reliability",
        "p0",
        "quota-resilience",
        "supabase-optional",
        "zero-spend"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-651",
      "updated": "2026-10-01T09:31:46.088+0200"
    },
    {
      "key": "OR-656",
      "summary": "P0 — Prove Supabase is optional and reconcile architecture/ADR/operations contracts",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-651",
      "labels": [
        "architecture",
        "p0",
        "supabase-optional",
        "validation"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-656",
      "updated": "2026-10-01T09:31:47.792+0200"
    },
    {
      "key": "OR-670",
      "summary": "OCC-15 — Restore authenticated zero-cost hosted operator dashboard on Netlify",
      "status": "In Progress",
      "statusCategory": "In Progress",
      "priority": "Highest",
      "type": "Task",
      "parentKey": "OR-620",
      "labels": [
        "netlify",
        "operator-ui",
        "public-repo",
        "zero-cost"
      ],
      "browseUrl": "https://espalwebs.atlassian.net/browse/OR-670",
      "updated": "2026-10-01T09:30:21.016+0200"
    }
  ]
}
export const JIRA_FALLBACK_OBSERVED_AT = "2026-10-01T08:45:20.797Z"

export const TESTOPS_FALLBACK_SNAPSHOT: TestOpsProjection = {
  target: "PixelGaps/orchy",
  layers: [
    { layerId: "01", runId: "github-36610058030-report-v1", revision: "a21d165906fc73b9d180c27486d7bba2b7967bcb", outcome: "PASS", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 8181, jiraMilestone: "OR-590" },
    { layerId: "02", runId: "github-36612283534", revision: "16f786996e7af8bbfdf798f99c8bfdab577e3a33", outcome: "PASS", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 42163, jiraMilestone: "OR-594" },
    { layerId: "03", runId: "github-36613975980", revision: "405d42150f80ea6101243a4feab9221f3a088a49", outcome: "PASS", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 5850, jiraMilestone: "OR-598" },
    { layerId: "04", runId: "github-36615308611", revision: "1a983ae87478eed8549f58ad9e2c539147dca2f5", outcome: "PASS", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 6633, jiraMilestone: "OR-600" },
    { layerId: "05", runId: "github-36638357589", revision: "f15221c14451692e6d439ddfe54e679d0eb2893b", outcome: "PASS", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 41000, jiraMilestone: "OR-601" },
    { layerId: "06", runId: "github-36630013004", revision: "c6878e7cd67e5febfe780f14514625179cc572dc", outcome: "PASS", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 33000, jiraMilestone: "OR-602" },
    { layerId: "07", runId: "github-36639460120", revision: "f7c1cf41452c2af9cf3ab113120f885454140f1d", outcome: "PASS", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 39000, jiraMilestone: "OR-603" },
    { layerId: "08", runId: "github-36640165720", revision: "553da67e209bfd30aa2e3bb6acaa0cccf2b08ef4", outcome: "PASS", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 35000, jiraMilestone: "OR-604" },
    { layerId: "09", runId: "buildkite-48", revision: "e709a09af40375929aeb0295179eef56040aad8a", outcome: "FAIL", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 48564, jiraMilestone: "OR-605" },
    { layerId: "10", runId: "buildkite-56", revision: "74f0bb5b0b8bf98e3815e79b18cfd57abeb75b5d", outcome: "FAIL", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 396320, jiraMilestone: "OR-606" },
    { layerId: "12", runId: "or608-layer12-0931b839", revision: "0931b8390067b3f5122b2a7e69ebd7910a2b3f4f", outcome: "ERROR", finishedAt: "2026-09-30T23:59:00.000Z", durationMs: 302398, jiraMilestone: "OR-608" }
  ],
  findings: []
}
export const TESTOPS_FALLBACK_OBSERVED_AT = "2026-09-30T23:59:00.000Z"


export const GITHUB_FALLBACK_SNAPSHOT: GitHubProjection = {
  "repository": "PixelGaps/orchy",
  "defaultBranch": "main",
  "headSha": "dc40c26243057e38ed2263ccc68ba57dd0d7430a",
  "openWorkflowRuns": 0,
  "recentRuns": [
    {
      "id": 36800759742,
      "name": "OR-336 Hostless Quality Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "dc40c26243057e38ed2263ccc68ba57dd0d7430a",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36800759742"
    },
    {
      "id": 36799853225,
      "name": "OR-336 Hostless Quality Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "fa6f286faa06c94b20841379c45e656a8e4ca874",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36799853225"
    },
    {
      "id": 36798747383,
      "name": "OR closure portability and flakes",
      "status": "completed",
      "conclusion": "success",
      "headSha": "6a639966af8c62451aee651357611b29f1f5857d",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36798747383"
    },
    {
      "id": 36798630645,
      "name": "OR closure portability and flakes",
      "status": "completed",
      "conclusion": "failure",
      "headSha": "bb8326ea834ee9a75913ff8852d2ca0edb4e5b0f",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36798630645"
    },
    {
      "id": 36796531014,
      "name": "OR closure portability and flakes",
      "status": "completed",
      "conclusion": "failure",
      "headSha": "1ac14b653ac6f0cd4513e80e5adf1736481137b6",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36796531014"
    },
    {
      "id": 36796038414,
      "name": "OR closure portability and flakes",
      "status": "completed",
      "conclusion": "failure",
      "headSha": "0ae725b87930288571cf3d0984e9bfcfa3c49fe4",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36796038414"
    },
    {
      "id": 36795911873,
      "name": "OR closure portability and flakes",
      "status": "completed",
      "conclusion": "failure",
      "headSha": "f22eb4eda711281e4158442e670a0f11b103e584",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36795911873"
    },
    {
      "id": 36795483533,
      "name": "OR closure portability and flakes",
      "status": "completed",
      "conclusion": "failure",
      "headSha": "666e8e6b5f83a5be5a325f6d539f35e90bdaadd5",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36795483533"
    },
    {
      "id": 36795054766,
      "name": "OR-336 Hostless Quality Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "9bdaaa2817a0f9ece6b3338287e93ca88232d421",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36795054766"
    },
    {
      "id": 36794973377,
      "name": "OR-336 Hostless Coverage Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "e85bdfaaa8877f390a0d160cfd9418cbba9ce80a",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36794973377"
    },
    {
      "id": 36794840362,
      "name": "OR-336 Hostless Quality Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "d257fda68e5cc14413a62ad4600272db883b4d90",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36794840362"
    },
    {
      "id": 36794616870,
      "name": "OR-336 Hostless Quality Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "b62909351fd5eef2baa0829f656cf122fa6bcf77",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36794616870"
    },
    {
      "id": 36793990784,
      "name": "OR-336 Hostless Quality Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "455b4e98baaf19c1b6ce6c14dac30808fbbb26e9",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36793990784"
    },
    {
      "id": 36793647934,
      "name": "OR-336 Hostless Quality Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "7f55c874daa4b11bdafcf2a017b9e60417971bb8",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36793647934"
    },
    {
      "id": 36793527300,
      "name": "OR-336 Ruff Safe Autofix",
      "status": "completed",
      "conclusion": "success",
      "headSha": "a2ac6863f3facdd2e53e703663f9d65351e68f2e",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36793527300"
    },
    {
      "id": 36793388308,
      "name": "OR-336 Hostless Quality Sweep",
      "status": "completed",
      "conclusion": "success",
      "headSha": "fd1acb2eaddc0a150316155214fbd4e8c67066b5",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36793388308"
    },
    {
      "id": 36791281689,
      "name": "OR-388 Focused Mutation",
      "status": "completed",
      "conclusion": "failure",
      "headSha": "d2fc1ffc9efbc19a53eacc545939b5afd05c4c66",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36791281689"
    },
    {
      "id": 36790241514,
      "name": "OR-385 Focused Mutation",
      "status": "completed",
      "conclusion": "failure",
      "headSha": "b4cbd427815b1107d5bb029f5acfef6e6f2ae9f7",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36790241514"
    },
    {
      "id": 36790196667,
      "name": "OR-388 Focused Mutation",
      "status": "completed",
      "conclusion": "failure",
      "headSha": "2c17ed30a3a1fd6b92905a870d8353b03e41817e",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36790196667"
    },
    {
      "id": 36790089003,
      "name": "OR-387 Focused Mutation",
      "status": "completed",
      "conclusion": "success",
      "headSha": "ed4053f1387e478f9b22d5c1fd215c44809b6dc9",
      "htmlUrl": "https://github.com/PixelGaps/orchy/actions/runs/36790089003"
    }
  ]
}
export const GITHUB_FALLBACK_OBSERVED_AT = "2026-10-01T08:48:19.270Z"
