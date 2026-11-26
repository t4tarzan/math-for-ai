"""Checks for the rag-chatbot capstone (Floci edition). One function per stage; each appends
{"name", "pass", "detail"} entries. Thresholds match capstone.json and LABS-DESIGN §5."""
import json
import os
import secrets
import subprocess
import time
import urllib.error
import urllib.request

import boto3
from botocore.config import Config

CFG = Config(retries={"max_attempts": 2}, read_timeout=90, connect_timeout=10)


def client(ctx, svc):
    return boto3.client(svc, endpoint_url=ctx["endpoint"], region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"), config=CFG)


def need(ctx, checks, *keys):
    missing = [k for k in keys if not ctx["outputs"].get(k)]
    if missing:
        checks.append({"name": "lab.outputs.json has " + ", ".join(keys), "pass": False,
                       "detail": f"add {', '.join(missing)} to lab.outputs.json (uncomment it in infra/outputs.tf, then `make deploy`)"})
        return False
    return True


def ok(checks, name, cond, detail=""):
    checks.append({"name": name, "pass": bool(cond), "detail": detail})
    return bool(cond)


def ask(ctx, question, token=None):
    """POST {"question"} to /ask. Returns (status, parsed body or text)."""
    url = ctx["outputs"]["api_url"].rstrip("/") + "/ask"
    headers = {"content-type": "application/json"}
    if token:
        headers["Authorization"] = token
    req = urllib.request.Request(url, data=json.dumps({"question": question}).encode(), method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            status, raw = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read().decode()
    ctx["state"]["calls"] = ctx["state"].get("calls", 0) + (1 if status == 200 else 0)
    try:
        return status, json.loads(raw)
    except json.JSONDecodeError:
        return status, raw


def grader_token(ctx):
    """Create (once) a throwaway Cognito user for the grader and return its IdToken."""
    st = ctx["state"]
    if st.get("token"):
        return st["token"]
    o = ctx["outputs"]
    if not (o.get("user_pool_id") and o.get("user_pool_client_id")):
        return None
    cg = client(ctx, "cognito-idp")
    user = f"grader-{secrets.token_hex(4)}@example.com"
    pw = "Gr-" + secrets.token_urlsafe(12) + "9!"
    cg.admin_create_user(UserPoolId=o["user_pool_id"], Username=user, MessageAction="SUPPRESS", TemporaryPassword=pw)
    cg.admin_set_user_password(UserPoolId=o["user_pool_id"], Username=user, Password=pw, Permanent=True)
    res = cg.admin_initiate_auth(UserPoolId=o["user_pool_id"], ClientId=o["user_pool_client_id"],
                                 AuthFlow="ADMIN_USER_PASSWORD_AUTH", AuthParameters={"USERNAME": user, "PASSWORD": pw})
    st.update(token=res["AuthenticationResult"]["IdToken"], user=user)
    return st["token"]


def delete_grader_user(ctx):
    st, o = ctx["state"], ctx["outputs"]
    if st.get("user"):
        try:
            client(ctx, "cognito-idp").admin_delete_user(UserPoolId=o["user_pool_id"], Username=st["user"])
        except Exception:
            pass
        st.pop("user", None)
        st.pop("token", None)


def embed(texts):
    url, token = os.environ.get("LAB_MODEL_URL"), os.environ.get("LAB_TOKEN")
    if not (url and token):
        raise RuntimeError("set LAB_MODEL_URL and LAB_TOKEN (m4ai-lab login writes them to .lab/env)")
    req = urllib.request.Request(url.rstrip("/") + "/embeddings", data=json.dumps({"input": list(texts)}).encode(),
                                 headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())["data"]
    return [d["embedding"] for d in sorted(data, key=lambda d: d["index"])]


# ---------------------------------------------------------------- stages

def stage1_ingest(ctx, checks):
    if not need(ctx, checks, "bucket"):
        return
    s3, bucket = client(ctx, "s3"), ctx["outputs"]["bucket"]
    docs = ctx["golden"]["documents"]
    good, bad = 0, []
    for d in docs:
        key = "documents/" + os.path.basename(d["file"])
        try:
            meta = s3.head_object(Bucket=bucket, Key=key).get("Metadata", {})
            if meta.get("doc_id") == d["doc_id"]:
                good += 1
            else:
                bad.append(f"{key} has doc_id={meta.get('doc_id')!r}")
        except Exception:
            bad.append(f"{key} missing")
    ok(checks, f"all {len(docs)} documents uploaded with doc_id metadata", good == len(docs),
       f"{good}/{len(docs)}" + (f"; {bad[0]}" if bad else ""))


def stage2_index(ctx, checks):
    if not need(ctx, checks, "vector_bucket", "vector_index"):
        return
    o, v = ctx["outputs"], client(ctx, "s3vectors")
    seen, tok = set(), None
    while True:
        kw = {"vectorBucketName": o["vector_bucket"], "indexName": o["vector_index"], "maxResults": 500, "returnMetadata": True}
        if tok:
            kw["nextToken"] = tok
        r = v.list_vectors(**kw)
        seen |= {(x.get("metadata") or {}).get("doc_id") for x in r["vectors"]}
        tok = r.get("nextToken")
        if not tok:
            break
    want = {d["doc_id"] for d in ctx["golden"]["documents"]}
    missing = sorted(want - seen)
    ok(checks, "every document has at least one vector (metadata doc_id)", not missing,
       f"{len(want) - len(missing)}/{len(want)}" + (f"; missing {missing[0]}" if missing else ""))
    hits = 0
    misses = []
    for rq in ctx["golden"]["retrieval_queries"]:
        r = v.query_vectors(vectorBucketName=o["vector_bucket"], indexName=o["vector_index"], queryVector={"float32": embed([rq["q"]])[0]},
                            topK=3, returnMetadata=True)["vectors"]
        if rq["doc_id"] in [(h.get("metadata") or {}).get("doc_id") for h in r]:
            hits += 1
        else:
            misses.append(rq["q"])
    ok(checks, "retrieval queries find the right document in the top 3 (5/5)", hits == len(ctx["golden"]["retrieval_queries"]),
       f"{hits}/{len(ctx['golden']['retrieval_queries'])}" + (f"; missed: {misses[0]!r}" if misses else ""))


def stage3_answer(ctx, checks):
    if not need(ctx, checks, "api_url"):
        return
    token = grader_token(ctx)  # stage 4 puts sign-in in front of /ask; earlier, no token is needed
    good, first_bad = 0, ""
    qs = ctx["golden"]["questions"]
    for q in qs:
        status, body = ask(ctx, q["q"], token)
        if status == 200 and isinstance(body, dict) and not body.get("refused") and set(body.get("citations") or []) & set(q["doc_ids"]):
            good += 1
        elif not first_bad:
            first_bad = f"{q['q']!r} → {status} {str(body)[:140]}"
    ok(checks, "answers cite the right document (≥ 8/10)", good >= 8, f"{good}/{len(qs)}" + (f"; e.g. {first_bad}" if first_bad and good < len(qs) else ""))
    refused, first_bad = 0, ""
    for q in ctx["golden"]["out_of_scope"]:
        status, body = ask(ctx, q, token)
        if status == 200 and isinstance(body, dict) and body.get("refused") is True:
            refused += 1
        elif not first_bad:
            first_bad = f"{q!r} → {str(body)[:120]}"
    n = len(ctx["golden"]["out_of_scope"])
    ok(checks, f"out-of-scope questions are refused ({n}/{n})", refused == n, f"{refused}/{n}" + (f"; e.g. {first_bad}" if first_bad else ""))
    ok(checks, 'response shape {"answer", "citations", "refused"}', isinstance(body, dict) and {"answer", "citations", "refused"} <= set(body), str(body)[:120] if not isinstance(body, dict) else "")


def stage4_users(ctx, checks):
    if not need(ctx, checks, "api_url", "user_pool_id", "user_pool_client_id", "history_table"):
        return
    status, body = ask(ctx, "Where can I get advice about my consumer rights?")
    ok(checks, "no token → 401", status == 401, f"got {status}")
    token = grader_token(ctx)
    for q in ("How many weeks of paid holiday is a worker entitled to?", "Where should I forward a suspicious email?"):
        ask(ctx, q, token)
    sub = json.loads(__import__("base64").urlsafe_b64decode(token.split(".")[1] + "==")).get("sub")
    rows = client(ctx, "dynamodb").query(TableName=ctx["outputs"]["history_table"], KeyConditionExpression="#s = :s",
                                         ExpressionAttributeNames={"#s": "sub"}, ExpressionAttributeValues={":s": {"S": sub}})["Count"]
    ok(checks, "history rows written for the signed-in user (≥ 2)", rows >= 2, f"{rows} rows for the grader's sub")


def stage5_safety(ctx, checks):
    if not need(ctx, checks, "api_url", "log_group"):
        return
    start_ms = int(time.time() * 1000) - 1000
    token = grader_token(ctx)
    calls_before = ctx["state"].get("calls", 0)
    refused, first_bad = 0, ""
    for p in ctx["golden"]["pii"]:
        status, body = ask(ctx, p, token)
        if status == 200 and isinstance(body, dict) and body.get("refused") is True:
            refused += 1
        elif not first_bad:
            first_bad = f"{p[:40]!r} → {str(body)[:100]}"
    n = len(ctx["golden"]["pii"])
    ok(checks, f"prompts with personal data are refused ({n}/{n})", refused == n, f"{refused}/{n}" + (f"; e.g. {first_bad}" if first_bad else ""))
    made = ctx["state"].get("calls", 0) - calls_before
    logs = client(ctx, "logs")
    lines = []
    for _ in range(20):
        ev = logs.filter_log_events(logGroupName=ctx["outputs"]["log_group"], startTime=start_ms).get("events", [])
        lines = []
        for e in ev:
            try:
                j = json.loads(e["message"].strip())
                if isinstance(j, dict) and {"request_id", "latency_ms", "refused"} <= set(j):
                    lines.append(j)
            except (ValueError, json.JSONDecodeError):
                pass
        if len(lines) >= made:
            break
        time.sleep(1)
    ok(checks, 'one JSON log line per request {"request_id", "latency_ms", "refused"}', made > 0 and len(lines) >= made,
       f"{len(lines)} log lines for {made} requests")
    delete_grader_user(ctx)


def stage6_ship(ctx, checks):
    infra = ctx["root"] / "infra"
    if not ok(checks, "infra/ has Terraform files", infra.is_dir() and any(infra.glob("*.tf")), str(infra)):
        return
    env = dict(os.environ)
    if os.environ.get("LAB_MODEL_URL"):
        env.setdefault("TF_VAR_lab_model_url", os.environ["LAB_MODEL_URL"])
    if os.environ.get("LAB_TOKEN"):
        env.setdefault("TF_VAR_lab_token", os.environ["LAB_TOKEN"])
    v = subprocess.run(["terraform", f"-chdir={infra}", "validate", "-no-color"], capture_output=True, text=True, env=env)
    ok(checks, "terraform validate passes", v.returncode == 0, (v.stdout + v.stderr).strip().splitlines()[-1][:160] if v.returncode else "")
    p = subprocess.run(["terraform", f"-chdir={infra}", "plan", "-detailed-exitcode", "-input=false", "-no-color", "-lock=false"],
                       capture_output=True, text=True, env=env)
    msg = {0: "no changes", 2: "terraform would still change something: run `make deploy`"}.get(p.returncode, (p.stderr or p.stdout).strip()[-200:])
    ok(checks, "after deploy, terraform plan shows no changes", p.returncode == 0, msg if p.returncode else "")


STAGES = [
    ("Ingest the documents", stage1_ingest),
    ("Index them as vectors", stage2_index),
    ("Answer with citations", stage3_answer),
    ("Sign-in and history", stage4_users),
    ("Guardrail and logs", stage5_safety),
    ("Ship-ready infrastructure", stage6_ship),
]
