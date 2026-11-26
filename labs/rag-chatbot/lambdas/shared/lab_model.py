"""Model calls for the lab. Embeddings go to the lab's model proxy (OpenAI-compatible /embeddings) with your lab token;
chat goes through Bedrock Converse on Floci, whose proxy backend forwards it to the same lab proxy."""
import json
import os
import urllib.request

import boto3


def embed(texts):
    """Return one vector per text (list of floats)."""
    req = urllib.request.Request(
        os.environ["LAB_MODEL_URL"].rstrip("/") + "/embeddings",
        data=json.dumps({"input": list(texts)}).encode(),
        headers={"Authorization": "Bearer " + os.environ["LAB_TOKEN"], "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())["data"]
    return [d["embedding"] for d in sorted(data, key=lambda d: d["index"])]


def converse(system, user, max_tokens=400):
    """One Bedrock Converse call; returns the text of the reply."""
    br = boto3.client("bedrock-runtime")
    r = br.converse(
        modelId=os.environ.get("CHAT_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0"),
        system=[{"text": system}],
        messages=[{"role": "user", "content": [{"text": user}]}],
        inferenceConfig={"maxTokens": max_tokens, "temperature": 0},
    )
    return "".join(part.get("text", "") for part in r["output"]["message"]["content"])
