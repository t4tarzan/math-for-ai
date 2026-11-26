"""Stages 3-5 — POST /ask {"question": "..."} returns {"answer": str, "citations": [doc_id, ...], "refused": bool}.

Provided: shared.lab_model.embed(texts) and shared.lab_model.converse(system, user) -> reply text.
"""
import json
import os  # noqa: F401
import time

import boto3

from shared.lab_model import converse, embed  # noqa: F401

vectors = boto3.client("s3vectors")
dynamodb = boto3.client("dynamodb")


def respond(status, body):
    return {"statusCode": status, "headers": {"content-type": "application/json"}, "body": json.dumps(body)}


def handler(event, context):
    t0 = time.time()  # noqa: F841  (stage 5 logs the latency)
    question = (json.loads(event.get("body") or "{}").get("question") or "").strip()
    if not question:
        return respond(400, {"error": 'send {"question": "..."}'})
    # Stage 3 TODO: embed the question, query S3 Vectors (topK ~5, returnMetadata, returnDistance), refuse when the best
    #   match is too far away (measure the distances of in-scope and off-topic questions and choose a threshold),
    #   otherwise ask the model to answer ONLY from the retrieved chunks, as JSON, citing doc_ids.
    # Stage 4 TODO: if event["requestContext"]["authorizer"]["claims"]["sub"] exists, write a history row.
    # Stage 5 TODO: refuse questions that contain personal data (ID numbers, card numbers, email, phone, ...) BEFORE any
    #   model call, and print ONE JSON log line per request: {"request_id", "latency_ms", "refused"}.
    raise NotImplementedError("stage 3: answer the question")
