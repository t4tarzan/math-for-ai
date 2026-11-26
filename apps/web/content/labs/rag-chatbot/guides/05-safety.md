# Stage 5 — Guardrail and logs

**Goal:** questions that contain personal data are refused before they reach the model, and every request leaves one JSON
log line you can search.

A regulated chatbot must not collect personal data it does not need, and you cannot run what you cannot see.

## Build
1. In the ask Lambda, before any model call, refuse questions that contain personal data: National Insurance numbers,
   card numbers, email addresses, phone numbers, passport numbers, dates of birth. Do not store the question text when
   you refuse for this reason.
2. Print one line per request: `{"request_id": ..., "latency_ms": ..., "refused": ...}` (json.dumps).
3. In `infra/stage5_logs.tf`, a log group for the ask Lambda; uncomment `log_group` in outputs.

## The grader checks
- the 5 `pii` prompts in `golden.json` are refused (5/5);
- every request the grader made has a JSON log line with `request_id`, `latency_ms` and `refused`.
