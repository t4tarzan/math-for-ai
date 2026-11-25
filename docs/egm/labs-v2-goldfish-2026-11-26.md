# Goldfish review — Floci cloud labs design v2 (2026-11-26)

Reviewer: implementation_readiness (zero context). Verdict: NOT READY (specification gaps, not design flaws).

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | Model proxy wire contract missing (path, streaming, model mapping, cost source, error bodies) | BLOCKER | LABS-DESIGN §9.4; path/streaming/cost field confirmed by L1.2 |
| 2 | No data model for tokens, ledger, allow-list, reports; token format; UTC boundaries | BLOCKER | §9.6 tables + §9.5 token format |
| 3 | Report schema, import path, version check, XP amounts undefined | BLOCKER | §9.3: schema, browser upload, accepted-hash constant, +10/stage +50 capstone |
| 4 | Grader cannot find resources; chunk-count check uncomputable; retrieval queries missing; test user; log format | MAJOR | §9.1 lab.outputs.json; §5 stage 2/4/5 checks rewritten; §9.2 golden.json schema |
| 5 | Stage 6 "plan against real AWS with a dummy profile" cannot pass | MAJOR | §5 stage 6 → apply/plan-no-changes on Floci + `terraform validate` |
| 6 | Lab token path into Floci unspecified | MAJOR | §9.5 (.lab/env, M4AI_LAB_TOKEN Codespaces secret, restart) |
| 7 | Model path during L1–L2 undefined | MAJOR | §9.4 last bullet: dev key on hub2, switch in L4.1 |
| 8 | D3–D5 open, no rate limit, no embedding dimension, document set unchosen | MAJOR | rate limit 30/min; dimension from L1.3; §9.7 lists D3/D4/D5/D7 with the leaf each blocks |
| 9 | labplan.py docstring and the hub2 PLAN entry still describe v1 | MINOR | docstring updated; PLAN entry updated; L0.4 acceptance adds "tree matches TASKS-DRAFT" |
| 10 | Token UI wording contradictory | MINOR | §9.5: one active token, Issue replaces and revokes, shown once |
