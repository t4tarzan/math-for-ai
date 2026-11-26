# Stage 3 — Answer with citations

**Goal:** `POST /ask {"question": "..."}` returns `{"answer": str, "citations": [doc_id, ...], "refused": bool}`.

## Build
1. In `infra/stage3_answer.tf`: the ask Lambda and a REST API with `POST /ask` (authorization `NONE` for now), an
   `AWS_PROXY` integration, a permission for API Gateway, a deployment and a `dev` stage. Uncomment `api_url` in outputs.
2. In `lambdas/ask/handler.py`:
   - embed the question and query the index for the closest chunks (with their distance);
   - **refuse when the best match is too far away**: print the distances of a few golden questions and a few off-topic
     questions, then choose a threshold between them;
   - otherwise send the retrieved chunks to the model (`shared.lab_model.converse()`), ask for JSON only, and keep only
     citations that were in the retrieved chunks.

## Test it yourself
```bash
API=$(python3 -c "import json;print(json.load(open('lab.outputs.json'))['api_url'])")
curl -s -X POST "$API/ask" -d '{"question":"Where should I forward a suspicious email?"}'
```

## The grader checks
- at least 8 of the 10 golden questions cite one of their expected documents;
- the 3 off-topic questions come back with `"refused": true` (3/3);
- the response has `answer`, `citations` and `refused`.
