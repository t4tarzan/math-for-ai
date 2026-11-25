# Floci cloud labs — generated mirror of `runtime/labplan.db`

> Regenerate with `bin/labplan.py mirror`. Do not hand-edit. INTERNAL.
> Design: docs/LABS-DESIGN.md · plan of record: docs/LABS-ARC.md · architecture: docs/LABS-ARCHITECTURE.md · cockpit: http://127.0.0.1:6847

**Progress: 4/23 leaves done.**


## L0 — Decisions and the design gate

| | ID | Task | Acceptance |
|---|---|---|---|
| ☑ | L0.1 | Design v1, plan, task list and architecture written | docs/LABS-DESIGN.md, docs/LABS-ARC.md, docs/LABS-ARCHITECTURE.md and bin/labplan.py exist; `bin/labplan.py tree` prints every phase. |
| ☑ | L0.2 | Goldfish gate on v1 (design_critic, zoom_out, implementation_readiness) | docs/egm/labs-plan-goldfish-2026-11-26.md exists with every finding listed and the decision it led to. |
| ☑ | L0.3 | Operator decisions D1 (Codespaces first) and D2 (honour-system grading) recorded; design v2 written | LABS-DESIGN.md §8 shows D1 and D2 with the operator's answers and the date; v2 header says it replaces v1. |
| ☑ | L0.4 | One goldfish on v2 (implementation_readiness) before seeding | docs/egm/labs-v2-goldfish-<date>.md exists; its findings are fixed or answered; `bin/labplan.py tree` matches docs/labs/TASKS-DRAFT.md. |

## L1 — Prove Floci can carry the capstone (spike + go/no-go)

| | ID | Task | Acceptance |
|---|---|---|---|
| ☐ | L1.1 | Floci (pinned digest) runs every service the capstone needs, scripted | labs/spike/run.sh starts Floci in Docker and runs aws CLI checks for S3, S3 Vectors (create index, put, query), Lambda Python 3.12 (create, invoke, S3 trigger), API Gateway v2 (route → Lambda), Cognito (user pool, token, JWT authorizer rejects no token), DynamoDB, CloudWatch Logs; each prints PASS or FAIL with the error; results in docs/labs/SPIKE.md. |
| ☐ | L1.2 | Bedrock proxy backend sends the configured bearer token, and Converse round-trips | with PROXY_URL pointed at a local echo server, a Converse call from the aws CLI arrives with `Authorization: Bearer <token>` (header logged); pointed at an OpenAI-compatible endpoint it returns a real answer. |
| ☐ | L1.3 | Embeddings path measured (Q1): proxy /embeddings route vs a CPU model in the Lambda | SPIKE.md compares both on the document set: recall@3 on 5 known queries, latency, Lambda package size; the choice is written into LABS-DESIGN.md §4. |
| ☐ | L1.4 | Go/no-go: per-stage verdict with a fallback for every FAIL, operator acknowledged | SPIKE.md has a table stage → services → PASS/FAIL → fallback (drop/replace/workaround); the operator's go is recorded before L2 starts. |

## L2 — Capstone 08, Floci edition: content, grader, reference

| | ID | Task | Acceptance |
|---|---|---|---|
| ☐ | L2.1 | capstone.json + six stage guides (Floci edition of capstone 08, source credited) | labs/rag-chatbot/ has capstone.json (stages, version), README and 6 guides; each guide ends with what the grader checks and its threshold (LABS-DESIGN §5); the source capstone 08 and MIT licence are credited. |
| ☐ | L2.2 | Starter + licensed document set + public golden set (10 questions, 3 out-of-scope, 5 PII prompts) | D7 (document set) decided; its licence is named and allows reuse; golden.json follows LABS-DESIGN §9.2 (documents, 5 retrieval_queries, 10 questions, 3 out_of_scope, 5 pii); the starter writes lab.outputs.json (§9.1) and contains no stage solution (a grep for the reference handler names is empty). |
| ☐ | L2.3 | Grader CLI `m4ai-lab check rag-chatbot` with one check group per stage, against any Floci endpoint | prints per-stage PASS/FAIL with a reason; --report writes JSON with capstone version (hash of capstone.json), per-stage results and the grader version; a run against an empty Floci fails stage 1 with a clear reason. |
| ☐ | L2.4 | Reference solution (private repo) passes every stage; 5 broken variants fail the right stage | on a fresh Floci the reference passes 6/6; variants (no index, wrong citations, no refusal, no auth, no logs) each fail exactly the stage named; results logged in docs/labs/GRADER-PROOF.md. |

## L3 — The devcontainer: Codespaces and the learner laptop

| | ID | Task | Acceptance |
|---|---|---|---|
| ☐ | L3.1 | devcontainer.json + compose: Floci (pinned) via Docker-in-Docker, aws CLI v2, Python 3.12, Node 22, Terraform, m4ai-lab, Bedrock proxy env wired | on this Mac with Docker: `devcontainer up` (or docker compose) reaches Floci ready; `aws --endpoint-url http://localhost:4566 s3 ls` works; `m4ai-lab check rag-chatbot` runs; no key or token is baked into any file (secret scan clean). |
| ☐ | L3.2 | Lab repo on GitHub (operator's yes first) and the reference passes inside a real Codespace | the public template repo exists; a Codespace from it boots; time to a usable terminal and to Floci ready is recorded for 2-core and 4-core; the reference solution passes 6/6 inside it. |
| ☐ | L3.3 | Codespaces prebuild (if boot is slow) and the "Run locally" guide tested word for word | with prebuild on, boot-to-terminal is recorded again; a scripted walk of the README local steps on a clean Docker host passes. |

## L4 — The model proxy with a budget

| | ID | Task | Acceptance |
|---|---|---|---|
| ☐ | L4.1 | /api/lab/model on math.wntap.org: OpenAI-compatible chat completions for Floci's proxy, lab-token auth, model mapping | a Converse call from Floci in the devcontainer returns a real answer through the route; an unknown or revoked token is 401; the provider key never appears in any response or log. |
| ☐ | L4.2 | Per-learner USD ledger from provider usage, daily cap, monthly ceiling, rate limit | every call writes a ledger row with usage-derived cost; past the daily cap → 402 with a clear message; past the global ceiling → 402 for everyone; a burst over the rate limit → 429; tested with a lowered cap. |
| ☐ | L4.3 | Embeddings route (if L1.3 chose it), same auth and ledger | the capstone Lambda gets vectors of the documented dimension through the route; cost recorded in the ledger. |

## L5 — The lab inside math.wntap.org

| | ID | Task | Acceptance |
|---|---|---|---|
| ☐ | L5.1 | Capstone page: guides, Start lab (Codespaces), Run locally, lab token (issue/revoke, shown once) | signed-in allow-listed user sees the token once and can revoke it (old token 401 at once); the Codespaces link opens the lab repo; signed-out users see the guides and a sign-in button. |
| ☐ | L5.2 | Import the self-checked report: per-stage results, XP once per stage, capstone complete, labelled "self-checked" | a valid report for this capstone version updates per-stage results and progress (synced); a report for another version is rejected; the page says "self-checked". |

## L6 — Caps and cost

| | ID | Task | Acceptance |
|---|---|---|---|
| ☐ | L6.1 | Spend view and the monthly ceiling switch | an admin page (operator only) shows spend per day and per learner from the ledger, and the ceiling; changing the ceiling takes effect on the next call. |

## L7 — Pilot with real learners

| | ID | Task | Acceptance |
|---|---|---|---|
| ☐ | L7.1 | Internal pilot: 3 people finish capstone 08 (at least one in Codespaces, one locally) | three self-checked reports with 6/6; time, Codespaces core-hours used and model spend recorded in docs/labs/PILOT.md with every problem found. |
| ☐ | L7.2 | Goldfish before opening + the operator's go to open beyond the allow-list | report in docs/egm/; the operator's decision recorded in LABS-DESIGN.md §8. |
