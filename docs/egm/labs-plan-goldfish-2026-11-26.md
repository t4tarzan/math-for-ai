# Goldfish review — Floci cloud labs plan (2026-11-26)

Artifacts: docs/LABS-DESIGN.md, docs/LABS-ARC.md, docs/labs/TASKS-DRAFT.md (draft, before seeding).
Reviewers (zero-context, EGM personas): design_critic, zoom_out, implementation_readiness. **All three: NOT READY.**
All three agreed the L1 spike (one throwaway VM, no learners) could start.

## Agreed by two or more reviewers (strongest signal)

| # | Finding | Who | Severity |
|---|---|---|---|
| A | Learner-controlled apps/editors on `*.lab.wntap.org` are same-site with math.wntap.org (cookie tossing against Clerk, phishing host, Safe Browsing risk to wntap.org); "Host it" at a public `-app` URL publishes learner code under our brand | design_critic, zoom_out, impl (cookie scope) | BLOCKER |
| B | "Trusted grading" overclaims: the learner has root on the VM and controls the Floci the grader queries; golden answers ship in the starter, so a canned Lambda passes | design_critic, impl, zoom_out (signing premature) | BLOCKER/MAJOR |
| C | Budget mechanism left open (sub-key per session vs own counter); € vs USD, gateway fixed cost and Hetzner hourly rounding missing from the ceiling | impl, zoom_out, design_critic | MAJOR |
| D | Workspace store on the gateway: no per-learner auth, quota or backup; a new stateful service | design_critic, zoom_out, impl | MAJOR |
| E | "Idle" undefined (20 min of what?) | impl, design_critic | MAJOR/MINOR |
| F | TASKS-DRAFT export grouped every leaf under L9; LABS-BUILDPLAN.md linked but missing; URL scheme and CLI name inconsistent | all three | MINOR — export **fixed** |

## Single-reviewer findings

- **zoom_out — BLOCKER: an off-the-shelf route was never weighed.** A `devcontainer.json` (Floci via Docker-in-Docker, aws CLI, Terraform, grader) opened in GitHub Codespaces gives the same no-install, editor-in-the-browser experience with no orchestrator, no gateway, no abuse surface on our accounts and no VM spend (learner's Codespaces quota). The same devcontainer is the own-machine kit. Proposed: spike it (L1.4) and make L2/L3/L7 conditional on it failing.
- **zoom_out — content before infrastructure:** capstone guides, starter, grader and reference solution are needed under every hosting choice; build them first.
- **zoom_out — premature for a 3-person pilot:** signing chain (L5.5), honour-report import (L8.2), chaos (L7.3), billing reconciliation (L7.4).
- **design_critic — BLOCKER: the gateway concentrates every secret** (Hetzner token that can delete any server, OpenRouter key, signing key, DNS token, Neon creds, all saved work, all NAT) and sits on the learners' private network. Needs a dedicated Hetzner project, minimal private-interface exposure, secrets in a process learner traffic never reaches.
- **design_critic — the watchdog runs on the box it backs up;** with the gateway dead, VMs bill forever. Run expiry enforcement off-box with a delete-only token.
- **design_critic — egress port allow-list does not stop abuse** (443 carries mining/C2); all abuse comes from our IP. Allow-list destinations (registry mirror), separate account, CPU-pegged kill rule.
- **design_critic — spike has no fail criterion;** add an L1 go/no-go with per-stage fallbacks.
- **impl — no signing/cookie contracts, no persistence schema/state machine, no gateway stack; Floci proxy may not carry a per-session token** (make it an explicit L1.1 check); grader response contract and thresholds undefined for stages 3 and 5; "Host it" routing undefined.

## Decision for the operator (changes the architecture)

The operator chose "hosted for the first capstone, then their own". Two ways to deliver "hosted":

1. **Own Hetzner platform** (the current draft): we build and secure orchestrator + gateway + images; strongest control and grading, most build time and security surface; needs a separate registrable domain and Hetzner project per the blockers.
2. **devcontainer + GitHub Codespaces** (zoom_out): GitHub hosts the learner's machine; we ship one devcontainer that also works locally (the "their own" step for free); we host only a small model proxy (per-learner token, budget) and the grading endpoint. Learners need a GitHub account; grading is honour-system/tamper-resistant at best.

## Fixes applied now
- TASKS-DRAFT export grouping fixed (each leaf under its phase).
- Everything else waits for the operator's choice above; the plan will be revised and re-reviewed (one goldfish) before seeding.
