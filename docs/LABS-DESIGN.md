# Floci cloud labs: design v2 (2026-11-26)

> v1 (own Hetzner VM per learner behind our gateway) was reviewed by three zero-context goldfish and judged NOT READY
> (report: `docs/egm/labs-plan-goldfish-2026-11-26.md`). The operator then chose (2026-11-26):
> **D1 = GitHub Codespaces first** and **D2 = honour-system grading**. This v2 replaces v1. Nothing is built yet.

## 1. What we are building

The capstones are the top of the course: learners build a real AI system on AWS-shaped services. We teach them on
**Floci** (`floci-io/floci`, MIT), a free local AWS emulator: the real AWS CLI, SDKs and Terraform pointed at
`http://localhost:4566`.

The operator's model is "hosted for the first capstone, then their own machine". v2 delivers both with **one artifact,
a devcontainer**:

1. **Hosted:** the capstone's "Start lab" button opens the lab repo in **GitHub Codespaces**. GitHub runs the machine on
   the learner's own Codespaces quota; the learner gets VS Code in the browser, a terminal and Floci, with no install.
2. **Their own:** the same repo and devcontainer run on the learner's laptop (VS Code Dev Containers, or plain
   `docker compose`). Later capstones use this path.

The pilot is **capstone 08, Production RAG chatbot**, re-staged as a "Floci edition".

## 2. Principles

- **We run no learner code.** Learner machines are GitHub's (Codespaces) or the learner's own. We host only two small
  endpoints on math.wntap.org: a model proxy and the report import. Nothing runs on hub2, hub4 or the demo box.
- **No provider key ever reaches a learner machine.** The model proxy holds the key; the learner gets a personal,
  revocable lab token tied to their Clerk account, with a budget.
- **Content first.** The capstone guides, starter, grader and reference solution are built and proven before any
  hosting work; they are needed whatever the hosting route.
- **Honour-system grading, labelled as such.** The grader runs inside the learner's lab and checks their running system;
  the site imports the report and labels it "self-checked". It is not a certificate.
- **The same files work on Floci and on real AWS.** Only the endpoint changes. "Host it for real" means the learner's
  own AWS account; we publish nothing learner-written on our domains.
- **Caps before opening:** per-learner daily model budget, a global monthly ceiling, and per-token rate limits. The proxy
  refuses when any cap is reached.

## 3. Pieces

```
math.wntap.org (Vercel)                                  learner machine (Codespaces, or their laptop)
 ├─ capstone page: guides · "Start lab" (Codespaces)      ├─ devcontainer: Floci (pinned digest) + Docker-in-Docker,
 │   · "Run locally" · lab token · import report          │   aws CLI v2, Python 3.12, Node 22, Terraform, m4ai-lab CLI
 ├─ /api/lab/model  ← Bedrock-shaped calls (proxy)  ◄─────┼─ Floci Bedrock Runtime backend = proxy → our /api/lab/model
 │   per-learner token · budget · rate limit · USD ledger │     (bearer = the learner's lab token)
 └─ /api/lab/report ← self-checked grader report  ◄───────┴─ `m4ai-lab check rag-chatbot --report lab.json` → upload
                                                         lab repo (public template on GitHub): devcontainer + starter
                                                         + stage guides + grader + public golden set
```

- **Lab repo:** a public GitHub template repo per capstone (name chosen at L3, operator's yes before it is created).
  It holds the devcontainer, the starter, the guides, the grader and the public golden questions. The **reference
  solution and broken variants live in a private repo**, used only to prove the grader.
- **"Start lab":** a link to `https://github.com/codespaces/new?repo=<lab repo>` (GitHub's own flow). A learner without a
  GitHub account uses "Run locally" or creates one.
- **Lab token:** shown on the capstone page to a signed-in learner (Clerk). The learner runs `m4ai-lab login` and pastes it
  (or sets it as a Codespaces secret). Stored hashed; revocable; scoped to the model route; never a provider key.
- **Codespace size:** the 2-core / 8 GB machine if Floci + Docker-in-Docker + 3 Lambda containers fit (measured in L1);
  otherwise 4-core. GitHub's free personal quota is in core-hours, so size matters for the learner (state the numbers
  measured in L1 on the page; do not quote quota figures from memory).

## 4. Model calls

Floci's Bedrock Runtime `proxy` backend forwards `Converse`/`ConverseStream` to an OpenAI-compatible endpoint and sends
`FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_API_KEY` as `Authorization: Bearer …` (Floci docs, bedrock-runtime.md). The lab sets
`PROXY_URL` to `https://math.wntap.org/api/lab/model/v1` and the API key to the learner's lab token. **L1 proves this
header actually arrives.** `InvokeModel` is a stub in Floci, so embeddings (Q1) go through the same proxy as an
OpenAI-style `/embeddings` route, or through a small CPU model inside the learner's Lambda; L1 measures both.

- **Budget:** one OpenRouter key on the server; our own ledger per learner (USD, from the provider's usage response on
  every call); daily cap per learner (proposal $0.25) and a global monthly ceiling (proposal $30). Over a cap → a clear
  HTTP 402 the grader and the guides explain.
- **Model:** one cheap OpenRouter model, mapped from whatever Bedrock model id the learner writes (mapping in the proxy).
- **Own key option:** on their laptop, learners may point Floci's proxy at their own OpenAI-compatible key or Ollama
  instead; the guides show both.

## 5. Capstone 08, Floci edition

Keeps the source capstone's idea (a regulated-domain RAG chatbot with citations, guardrails and observability; MIT,
credited) and maps its rubric to checks against the learner's running Floci.

**Response contract (stage 3 onward):** `POST /ask {"question": "..."}` returns
`{"answer": str, "citations": [doc_id, ...], "refused": bool}`.

| Stage | Learner builds | The grader checks (pass threshold) |
|---|---|---|
| 1 Ingest | S3 bucket + upload the document set | bucket exists; all N documents present with `doc_id` metadata (N/N) |
| 2 Index | Lambda on S3 event: chunk + embed → S3 Vectors index (bucket + index created by `make vectors`: Floci cannot look them up by ARN, which Terraform needs) | index exists; every document has ≥ 1 vector (learners choose their chunking); the 5 `retrieval_queries` in golden.json return a chunk of the expected document in the top 3 (5/5) |
| 3 Answer | API Gateway **REST API (v1)** → Lambda: retrieve + Bedrock Converse (v1 because Floci's HTTP API JWT authorizer fails; SPIKE.md) | 10 public golden questions: correct `doc_id` in `citations` (≥ 8/10); 3 out-of-scope questions return `refused: true` (3/3) |
| 4 Users | Cognito user pool + `COGNITO_USER_POOLS` authorizer on the REST API; chat history in DynamoDB | no token → 401; the grader creates its own test user (AdminCreateUser), asks 2 questions → 2 history rows with that user's `sub`, then deletes the user |
| 5 Safety + logs | guardrail before the model (PII + out-of-scope) + CloudWatch logs | 5 listed PII prompts → `refused: true` (5/5); every request the grader made has a JSON log line `{"request_id", "latency_ms", "refused"}` in the log group named in `lab.outputs.json` |
| 6 Ship-ready | Terraform for the whole stack | after `terraform apply` against Floci, `terraform plan` shows no changes; `terraform validate` passes with the provider's endpoint override removed (the real-AWS step itself is the learner's own account, not graded) |

The grader is one CLI (`m4ai-lab`) used in both paths, versioned by a hash of the lab repo's `capstone.json`; the report
carries that version and the site checks it. Golden questions are public (honour system); a hidden set can be added later
if results ever matter for certificates.

## 6. Cost (to confirm in the pilot)

- Learner machines: $0 to us (Codespaces quota or the learner's laptop).
- Model calls: capped per learner per day; global ceiling per month (proposals in §4).
- Hosting: the two API routes run on the existing Vercel project and Neon database.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Floci lacks or mis-emulates a service a stage needs | L1 runs every stage's services first; L1 go/no-go lists a fallback per stage (drop or replace the stage) before content is written |
| Codespace too small or slow; learner quota burned | measure in L1 (2-core vs 4-core, boot time, prebuild); state real numbers on the page; "Run locally" always available |
| Lab token leaked or shared | per-learner budget and rate limit cap the damage; revoke and re-issue on the page; tokens stored hashed |
| Proxy abuse / runaway spend | daily per-learner cap, global monthly ceiling, rate limit per token, all refusing with 402/429 |
| Self-checked results are not trustworthy | labelled "self-checked"; no certificate claims; hidden set later if needed |
| Learners without GitHub | "Run locally" path with Docker; documented |

## 8. Decisions

| # | Decision | Operator (2026-11-26) / proposal |
|---|---|---|
| D1 | Hosted route | **Codespaces first** (operator); own platform only if the pilot shows Codespaces falls short |
| D2 | Grading strictness | **Honour system, labelled "self-checked"** (operator) |
| D3 | Model + budget | proposal: one cheap OpenRouter model; $0.25 per learner per day; $30 per month ceiling |
| D4 | Lab repo | proposal: public GitHub template repo under t4tarzan, created at L3 on the operator's yes; reference solution in a private repo |
| D5 | Who can use the lab token | proposal: signed-in users; allow-list during the pilot |
| D6 | Free or paid | free during the pilot |

## 9. Contracts (v2.1, after the second goldfish; values marked L1 are confirmed or corrected by the spike)

### 9.1 Resource discovery
The learner's Terraform (and the starter's helper) writes **`lab.outputs.json`** at the repo root:
`{"bucket", "vector_bucket", "vector_index", "api_url", "user_pool_id", "user_pool_client_id", "history_table", "log_group"}`.
The grader reads only this file to find resources; a missing key fails the stage that needs it with "add <key> to lab.outputs.json".

### 9.2 Golden set (`golden.json`, public)
`{"documents": [{"doc_id", "file"}], "retrieval_queries": [5 × {"q", "doc_id"}], "questions": [10 × {"q", "doc_ids": [...]}],
"out_of_scope": [3 × "q"], "pii": [5 × "q"]}`. Stage 1's N is `len(documents)`.

### 9.3 Grader report (`m4ai-lab check rag-chatbot --report lab.json`)
`{"schema": 1, "capstone": "rag-chatbot", "capstone_hash": sha256(capstone.json), "grader_version": "x.y.z",
"generated_at": ISO-8601, "stages": [{"n": 1..6, "pass": bool, "checks": [{"name", "pass", "detail"}], "reason": str}]}`.
**Import path: browser upload on the capstone page** (same pattern as the project ladder's completion.json). The web app keeps
the accepted `capstone_hash` values as a constant committed at each lab release; another hash is rejected with "update your lab
repo". XP: **+10 per stage passed (once), +50 for the capstone**, labelled "self-checked".

### 9.4 Model proxy (`/api/lab/model`)
- Routes: `POST /api/lab/model/v1/chat/completions` (Floci's proxy path, **L1** confirms the exact path and whether
  ConverseStream needs SSE; streaming is supported if Floci asks for it), and `POST /api/lab/model/v1/embeddings` if L1.3
  chooses the proxy path (**it did**: SPIKE.md; model bge-m3 or text-embedding-3-small, picked on the real document set in L2.2).
- Auth: `Authorization: Bearer <lab token>`. Unknown/revoked → `401 {"error":"invalid_token"}`.
- Model mapping: any Bedrock model id → one default OpenRouter model (D3), **non-reasoning** (a reasoning model spent the whole max_tokens on hidden reasoning in the spike); the response carries the Bedrock id back.
- Cost source: OpenRouter's usage accounting in the response (`usage.cost`, USD; **L1** confirms the field), never estimates.
- Errors: daily cap → `402 {"error":"daily_cap","resets_at"}`; monthly ceiling → `402 {"error":"monthly_ceiling"}`;
  rate limit (**30 requests/min per token**) → `429 {"error":"rate_limited","retry_after_s"}`. The guides show these bodies.
- During L1–L2 (before the proxy exists) Floci's proxy points straight at OpenRouter with a **dev key that stays on hub2**;
  switching to `/api/lab/model` is part of L4.1.

### 9.5 Lab token into Floci
Token format `m4ai_lab_` + 32 random bytes (base62); stored as SHA-256; **one active token per learner, Issue replaces and
revokes the previous one, the value is shown once**. `m4ai-lab login` writes `.lab/env` (gitignored, mode 600) with
`FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_URL` and `..._PROXY_API_KEY`, then restarts the Floci service (`docker compose up -d floci`).
In Codespaces the learner may instead add a Codespaces secret **`M4AI_LAB_TOKEN`**, which devcontainer.json maps into `.lab/env`
on start. Own key / Ollama on a laptop = edit the two lines in `.lab/env`.

### 9.6 Data model (Neon, the existing math-for-ai database; boundaries in UTC)
- `lab_token(user_id uuid pk → users, token_sha256 text unique, created_at, revoked_at)`
- `lab_ledger(id bigserial, user_id, at timestamptz, route text, model text, tokens_in int, tokens_out int, cost_usd numeric(10,6), status int)`
- `lab_config(key text pk, value jsonb)`: `daily_cap_usd`, `monthly_ceiling_usd`, `allow_list` (emails), `default_model`
- `lab_report(user_id, capstone text, capstone_hash text, stages jsonb, imported_at)`, one row per import
- Daily cap resets 00:00 UTC; monthly ceiling resets on the 1st (UTC). The allow-list and ceiling are edited on the admin page (L6.1, operator only).

### 9.7 Decisions still open
| # | Decision | Proposal | Blocks |
|---|---|---|---|
| D3 | Model + budget | one cheap OpenRouter model; $0.25 per learner per day; $30 per month | L4.2 |
| D4 | Lab repo | public template repo under t4tarzan; reference solution in a private repo | L3.2 |
| D5 | Lab token access | signed-in users on an allow-list during the pilot | L5.1 |
| D7 | Document set for the chatbot | a small, openly licensed regulated-domain corpus (e.g. public-domain government guidance), 10–20 documents; licence named | L2.2 |
