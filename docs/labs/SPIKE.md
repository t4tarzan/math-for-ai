# L1 spike — Floci 2.5.0 for capstone 08 (2026-11-26)

Floci `floci/floci@sha256:a0fbf944d7f338cc0856f1ef83831ea749ff2be71956eb7a7fce08fc21458e19` (2.5.0, multi-arch amd64 + arm64),
in Docker (Colima, arm64) on hub2, with the Docker socket mounted for Lambda. Script: `labs/spike/run.sh` (Floci + a mini model
proxy standing in for `/api/lab/model`) and `labs/spike/spike.py` (boto3). Raw results: `spike-results-2026-11-26.json`.

## Results: 13/13 required checks pass, 1 known gap

| Check | Result | Measured |
|---|---|---|
| S3 bucket + object metadata | PASS | metadata round-trips (`doc_id`) |
| S3 Vectors: bucket, index (cosine), put, query + metadata | PASS | nearest vector returned with metadata |
| Lambda Python 3.12: create, invoke | PASS | cold ≈ 0.2 s once the runtime image is cached; **first ever cold start 15.8 s (image pull)**; warm 3 ms |
| Lambda reaches S3 through the endpoint Floci injects | PASS | `AWS_ENDPOINT_URL` injected automatically |
| S3 event → Lambda | PASS | marker object written ~1 s after upload |
| CloudWatch Logs: JSON log line from the Lambda | PASS | `{"request_id","latency_ms","refused"}` found |
| DynamoDB table, put, query by user | PASS | |
| Cognito: pool, client, admin user, password auth → IdToken | PASS | |
| API Gateway v2 HTTP API POST → Lambda (no auth) | PASS | via `Host: <api>.execute-api.localhost.floci.io:4566` |
| **API Gateway v2 JWT authorizer (Cognito)** | **GAP** | valid ID and access tokens, with and without `Bearer`, are all 401, although the issuer's OIDC discovery and JWKS answer 200 (`FLOCI_SECURITY_ALLOW_PRIVATE_JWT_TARGETS=true`) |
| API Gateway v1 REST + `COGNITO_USER_POOLS` authorizer | PASS | no token 401; token 200; the user's `sub` reaches the Lambda |
| Bedrock Converse → proxy backend → real model | PASS | `Authorization: Bearer <lab token>` arrives at the proxy (logged); path `/v1/chat/completions` |
| Bedrock ConverseStream → proxy | PASS | streaming request (`stream: true`) proxied, deltas returned |

**Resources:** Floci ready **0.3 s** after `docker run` (first successful AWS call); Floci ≈ 72 MB RSS; one Lambda container ≈ 41 MB.
An earlier probe reported ~250 s: it ran the AWS CLI without the dummy credentials and never succeeded; fixed and noted in run.sh.

**Model calls:** OpenRouter returns cost in `usage.cost` (USD) on non-streaming calls. A reasoning model (`qwen/qwen3.7-flash`) spent
the whole `maxTokens` on hidden reasoning and returned empty text → the proxy must use a **non-reasoning model** (spike:
`mistralai/mistral-small-24b-instruct-2501`, $0.05/$0.08 per M tokens). Streaming responses did not carry usage in the spike;
L4.2 must request usage on streams too or count them another way.

## Embeddings (Q1, L1.3)

OpenRouter `/api/v1/embeddings` works with the same key and returns `usage.cost`:

| Model | Dim | cos(question, its answer) on a 2-line sample | Cost per call |
|---|---|---|---|
| openai/text-embedding-3-small | 1536 | 0.637 | $3.2e-7 (16 tokens) |
| baai/bge-m3 | 1024 | 0.802 | $2.1e-7 |
| qwen/qwen3-embedding-8b | 4096 | 0.783 | $1.9e-7 |

**Choice: the proxy route** (`/api/lab/model/v1/embeddings`, same token and ledger) rather than a CPU model inside the Lambda
(much larger package, slower, no gain). Model pick (bge-m3 vs text-embedding-3-small) and the recall@3 comparison wait for the
real document set (D7) and run in L2.2; until then L1.3 is partial.

## Go / no-go per capstone stage (L1.4)

| Stage | Services | Verdict | Fallback / change |
|---|---|---|---|
| 1 Ingest | S3 | GO | — |
| 2 Index | S3 event, Lambda, S3 Vectors, embeddings via proxy | GO | — |
| 3 Answer | API Gateway → Lambda, Bedrock Converse via proxy | GO | non-reasoning model |
| 4 Users | Cognito + authorizer, DynamoDB | **GO with a change** | use **API Gateway v1 REST + COGNITO_USER_POOLS authorizer** (the HTTP API JWT authorizer fails in Floci 2.5.0); real AWS supports the same setup. To keep one API, stages 3–6 use the REST API. Worth reporting upstream to floci-io. |
| 5 Safety + logs | Lambda, CloudWatch Logs | GO | — |
| 6 Ship-ready | Terraform against Floci | not yet tested | test in L3.1 (Terraform is not installed on hub2; the devcontainer has it) |

## Found while building the reference (L2)

- **S3 Vectors lookup by ARN fails** (`GetVectorBucket`/`GetIndex` with an ARN → "The vector bucket null does not exist"; by
  name works). The Terraform AWS provider refreshes these resources by ARN, so it thinks they vanished and tries to recreate
  them. Workaround: create the vector bucket and index with `make vectors` (by name); Terraform takes their names as variables.
- Terraform (AWS provider 6.x) applies the rest of the stack (21 resources incl. REST API + Cognito authorizer + DynamoDB)
  to Floci cleanly, and `plan` shows no changes after apply once `__pycache__` is excluded from the Lambda zip.
- The Lambda Python 3.12 runtime ships boto3 1.43 with the `s3vectors` client; Lambdas reach a host service via
  `host.docker.internal` (in Codespaces the proxy is a public URL instead).
- Embeddings: **bge-m3, recall@3 15/15** on the real document set; out-of-scope gap 0.348 (in-scope max) vs 0.620 (off-topic
  min) → threshold 0.48.

Spend: model and embedding calls ≈ $0.0001 in total. No learner code ran anywhere.
