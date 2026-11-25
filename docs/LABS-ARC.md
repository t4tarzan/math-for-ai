# Floci cloud labs — plan of record (v2: Codespaces first)

> Arc of math-for-ai (math.wntap.org), 2026-11-26. Operator: hosted for the first capstone, then the learner's own machine; then (after the goldfish review of v1) **Codespaces first** and **honour-system grading**.
> Design: [LABS-DESIGN.md](LABS-DESIGN.md) · task list: `bin/labplan.py tree` · mirror: LABS-BUILDPLAN.md (generated at seeding) · architecture: [LABS-ARCHITECTURE.md](LABS-ARCHITECTURE.md) · review of v1: [egm/labs-plan-goldfish-2026-11-26.md](egm/labs-plan-goldfish-2026-11-26.md) · cockpit: http://127.0.0.1:6847 (internal).

## In one paragraph

The last part of the course is the capstones: real AI systems built on Amazon-style cloud services. We teach them on Floci, a free emulator of Amazon's cloud, packaged as one ready-made development environment. For the first capstone a learner presses Start lab and GitHub Codespaces opens it in the browser, with nothing to install; for later capstones the same environment runs on their own laptop. We run none of the learners' code: our website only holds the AI model key behind a small proxy with spending limits, and imports the learners' self-checked results. The pilot capstone is a document question-answering chatbot with citations, built in six stages and checked automatically.

## L0 — Decisions and the design gate

Write down what we are building, have fresh reviewers attack it, and get the operator's decisions. The first design (our own machines for every learner) was judged too risky; the operator chose GitHub Codespaces for the hosted lab and self-checked grading.

- **L0.1** Design v1, plan, task list and architecture written
- **L0.2** Goldfish gate on v1 (design_critic, zoom_out, implementation_readiness)
- **L0.3** Operator decisions D1 (Codespaces first) and D2 (honour-system grading) recorded; design v2 written
- **L0.4** One goldfish on v2 (implementation_readiness) before seeding

## L1 — Prove Floci can carry the capstone (spike + go/no-go)

Prove on our own machine that Floci, the free emulator of Amazon's cloud, runs every service the chatbot capstone needs, including model calls through our proxy. Decide, stage by stage, what to do if a service falls short.

- **L1.1** Floci (pinned digest) runs every service the capstone needs, scripted
- **L1.2** Bedrock proxy backend sends the configured bearer token, and Converse round-trips
- **L1.3** Embeddings path measured (Q1): proxy /embeddings route vs a CPU model in the Lambda
- **L1.4** Go/no-go: per-stage verdict with a fallback for every FAIL, operator acknowledged

## L2 — Capstone 08, Floci edition: content, grader, reference

Write the capstone itself: a chatbot that answers questions from documents with citations, built in six stages, with an automatic checker. Prove the checker with a private reference solution and with deliberately broken versions.

- **L2.1** capstone.json + six stage guides (Floci edition of capstone 08, source credited)
- **L2.2** Starter + licensed document set + public golden set (10 questions, 3 out-of-scope, 5 PII prompts)
- **L2.3** Grader CLI `m4ai-lab check rag-chatbot` with one check group per stage, against any Floci endpoint
- **L2.4** Reference solution (private repo) passes every stage; 5 broken variants fail the right stage

## L3 — The devcontainer: Codespaces and the learner laptop

Package the lab as one ready-made development environment. It opens in the browser through GitHub Codespaces (nothing to install) or runs on the learner's own laptop with Docker.

- **L3.1** devcontainer.json + compose: Floci (pinned) via Docker-in-Docker, aws CLI v2, Python 3.12, Node 22, Terraform, m4ai-lab, Bedrock proxy env wired
- **L3.2** Lab repo on GitHub (operator's yes first) and the reference passes inside a real Codespace
- **L3.3** Codespaces prebuild (if boot is slow) and the "Run locally" guide tested word for word

## L4 — The model proxy with a budget

Let the learner's code call a real AI model the way it would call Amazon Bedrock, through a small service on our website that holds the key, with a spending limit per learner and for the month.

- **L4.1** /api/lab/model on math.wntap.org: OpenAI-compatible chat completions for Floci's proxy, lab-token auth, model mapping
- **L4.2** Per-learner USD ledger from provider usage, daily cap, monthly ceiling, rate limit
- **L4.3** Embeddings route (if L1.3 chose it), same auth and ledger

## L5 — The lab inside math.wntap.org

Put it in the course website: the guides, a Start lab button, a personal lab token, and a way to bring the checker's results back for XP and a completed capstone, clearly marked self-checked.

- **L5.1** Capstone page: guides, Start lab (Codespaces), Run locally, lab token (issue/revoke, shown once)
- **L5.2** Import the self-checked report: per-stage results, XP once per stage, capstone complete, labelled "self-checked"

## L6 — Caps and cost

A simple view of what the model calls cost, and a switch for the monthly ceiling.

- **L6.1** Spend view and the monthly ceiling switch

## L7 — Pilot with real learners

Three people do the whole capstone, at least one in Codespaces and one on a laptop; we measure time and cost, fix what hurts, get one more fresh review, and the operator decides when to open it.

- **L7.1** Internal pilot: 3 people finish capstone 08 (at least one in Codespaces, one locally)
- **L7.2** Goldfish before opening + the operator's go to open beyond the allow-list

## How we work this arc

- A leaf is ticked only after its acceptance test has actually run.
- Content before hosting: nothing in L3 starts before the L1 go/no-go and the grader proof (L2.4).
- Outward steps (creating the public lab repo, opening beyond the allow-list) wait for the operator's yes.
