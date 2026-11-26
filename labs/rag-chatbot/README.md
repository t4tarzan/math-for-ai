# Capstone: a production RAG chatbot (Floci edition)

Build a chatbot that answers questions about UK consumer and data rights **only from its documents**, cites the
document it used, refuses what it cannot answer, keeps each user's history and logs every request. You build it on
**Floci**, a free local emulator of Amazon Web Services: the real AWS CLI and Terraform, pointed at `http://localhost:4566`.
The same Terraform files work on real AWS later.

This is the Floci edition of **Capstone 08, Production RAG Chatbot for a Regulated Vertical** from
[ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch) (MIT). The documents are
GOV.UK guidance pages, reused under the Open Government Licence v3.0 (each file names its source).

## The six stages

| # | Stage | You build | The grader checks |
|---|---|---|---|
| 1 | [Ingest](guides/01-ingest.md) | an S3 bucket with the 12 documents | all 12 present with `doc_id` metadata |
| 2 | [Index](guides/02-index.md) | S3 event → indexer Lambda → embeddings → S3 Vectors | every document has vectors; 5/5 retrieval queries find the right document in the top 3 |
| 3 | [Answer](guides/03-answer.md) | REST API `POST /ask` → answer Lambda (retrieve + model) | ≥ 8/10 golden questions cite the right document; 3/3 off-topic questions refused |
| 4 | [Users](guides/04-users.md) | Cognito sign-in on `/ask`; history in DynamoDB | no token → 401; a signed-in user's questions are saved |
| 5 | [Safety and logs](guides/05-safety.md) | a personal-data guardrail; one JSON log line per request | 5/5 prompts with personal data refused; every request logged |
| 6 | [Ship-ready](guides/06-ship.md) | everything in Terraform | `terraform validate` passes; after deploy, `terraform plan` shows no changes |

## Start

1. Get your **lab token** from the capstone page on math.wntap.org (sign in first). It is personal and has a daily budget
   for model calls. It is never an API key for a model provider.
2. Open this repo in **GitHub Codespaces** (Start lab on the capstone page), or locally with Docker (see the course page).
3. In the terminal: `make login` (paste the token), then follow the guides in order. `make help` lists every command.

```bash
make login      # once
make vectors    # stage 2
make deploy     # after each change to infra/ or lambdas/
make upload     # stage 1 (re-run after stage 2 to index everything)
make check      # grade all stages; `make check ONLY=3` for one
```

## Grading is self-checked

`make check` runs the grader against **your** Floci and writes `lab-report.json`. Import it on the capstone page for XP.
The report is labelled self-checked: it shows what your system did, it is not a certificate. The golden questions are in
`golden.json` on purpose; the point is a chatbot that works, not one that passes a hidden test.

## Known Floci gaps (and what we do instead)

- The HTTP API's JWT authorizer rejects valid Cognito tokens in Floci 2.5.0 → use the **REST API** with a
  `COGNITO_USER_POOLS` authorizer (real AWS supports both).
- Floci cannot look up S3 Vectors buckets or indexes by ARN, which Terraform needs → create them with `make vectors`.
