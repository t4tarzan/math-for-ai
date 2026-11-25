"""L1 spike: does Floci run every service capstone 08 (RAG chatbot) needs? Prints PASS/FAIL per check.

Run via run.sh (starts Floci at the pinned digest + the mini model proxy). Endpoint: http://127.0.0.1:4566.
"""
import io, json, os, sys, time, traceback, urllib.request, zipfile
import boto3
from botocore.config import Config

EP = "http://127.0.0.1:4566"
REGION = "us-east-1"
CFG = Config(retries={"max_attempts": 2}, read_timeout=120, connect_timeout=10)
C = lambda svc: boto3.client(svc, endpoint_url=EP, region_name=REGION, aws_access_key_id="test", aws_secret_access_key="test", config=CFG)
RESULTS = []


def check(name, gap=False):
    def wrap(fn):
        t0 = time.time()
        try:
            detail = fn() or ""
            RESULTS.append((name, "PASS", str(detail)[:160], round(time.time() - t0, 2)))
        except Exception as e:  # noqa: BLE001 — a spike reports every failure
            RESULTS.append((name, "GAP" if gap else "FAIL", f"{type(e).__name__}: {str(e)[:220]}", round(time.time() - t0, 2)))
            if os.environ.get("SPIKE_TRACE"):
                traceback.print_exc()
        print(f"{RESULTS[-1][1]:4}  {name:44} {RESULTS[-1][3]:>6}s  {RESULTS[-1][2]}", flush=True)
        return fn
    return wrap


def http(method, url, body=None, headers=None, host=None):
    h = dict(headers or {})
    if host:
        h["Host"] = host
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method, headers={"content-type": "application/json", **h})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


# ---------------- S3 ----------------
s3 = C("s3")
BUCKET = "spike-docs"


@check("S3: bucket + object with metadata")
def _():
    s3.create_bucket(Bucket=BUCKET)
    s3.put_object(Bucket=BUCKET, Key="docs/a.md", Body=b"# Doc A\nRefunds are processed in 14 days.", Metadata={"doc_id": "doc-a"})
    h = s3.head_object(Bucket=BUCKET, Key="docs/a.md")
    assert h["Metadata"].get("doc_id") == "doc-a", h["Metadata"]
    return f"metadata={h['Metadata']}"


# ---------------- S3 Vectors ----------------
s3v = C("s3vectors")


@check("S3 Vectors: bucket, index, put, query")
def _():
    s3v.create_vector_bucket(vectorBucketName="spike-vectors")
    s3v.create_index(vectorBucketName="spike-vectors", indexName="chunks", dataType="float32", dimension=4, distanceMetric="cosine")
    s3v.put_vectors(vectorBucketName="spike-vectors", indexName="chunks", vectors=[
        {"key": "doc-a#0", "data": {"float32": [1, 0, 0, 0]}, "metadata": {"doc_id": "doc-a"}},
        {"key": "doc-b#0", "data": {"float32": [0, 1, 0, 0]}, "metadata": {"doc_id": "doc-b"}},
    ])
    r = s3v.query_vectors(vectorBucketName="spike-vectors", indexName="chunks", queryVector={"float32": [0.9, 0.1, 0, 0]}, topK=1, returnMetadata=True)
    top = r["vectors"][0]
    assert top["key"] == "doc-a#0", r["vectors"]
    return f"top={top['key']} meta={top.get('metadata')}"


# ---------------- Lambda (Python 3.12) ----------------
lam = C("lambda")
iam = C("iam")
HANDLER = '''
import json, os, time, boto3
s3 = boto3.client("s3")
def handler(event, context):
    t0 = time.time()
    if "Records" in event:  # S3 trigger: write a marker so the spike can see it ran
        for r in event["Records"]:
            key = r["s3"]["object"]["key"]
            s3.put_object(Bucket=r["s3"]["bucket"]["name"], Key="markers/" + key.replace("/", "_"), Body=b"seen")
        return {"ok": True}
    keys = [o["Key"] for o in s3.list_objects_v2(Bucket="spike-docs").get("Contents", [])]
    claims = (event.get("requestContext") or {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    body = {"answer": "spike", "citations": keys[:1], "refused": False, "sub": claims.get("sub")}
    print(json.dumps({"request_id": getattr(context, "aws_request_id", "?"), "latency_ms": round((time.time() - t0) * 1000, 1), "refused": False}))
    return {"statusCode": 200, "headers": {"content-type": "application/json"}, "body": json.dumps(body)}
'''


def zip_code():
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        z.writestr("app.py", HANDLER)
    return b.getvalue()


ROLE = "arn:aws:iam::000000000000:role/spike-lambda"


@check("Lambda: create Python 3.12 function")
def _():
    try:
        iam.create_role(RoleName="spike-lambda", AssumeRolePolicyDocument=json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]}))
    except Exception:
        pass
    lam.create_function(FunctionName="spike-ask", Runtime="python3.12", Role=ROLE, Handler="app.handler", Code={"ZipFile": zip_code()}, Timeout=60, MemorySize=512)
    lam.get_waiter("function_active_v2").wait(FunctionName="spike-ask")
    return "active"


@check("Lambda: invoke (cold), reaches S3 through injected endpoint")
def _():
    t = time.time()
    r = lam.invoke(FunctionName="spike-ask", Payload=b"{}")
    out = json.loads(r["Payload"].read())
    assert r.get("FunctionError") is None, out
    body = json.loads(out["body"])
    assert body["citations"] == ["docs/a.md"], body
    return f"cold {round((time.time() - t) * 1000)} ms, body={body}"


@check("Lambda: invoke (warm)")
def _():
    t = time.time()
    lam.invoke(FunctionName="spike-ask", Payload=b"{}")
    return f"warm {round((time.time() - t) * 1000)} ms"


@check("Lambda: S3 event trigger writes a marker")
def _():
    arn = lam.get_function(FunctionName="spike-ask")["Configuration"]["FunctionArn"]
    try:
        lam.add_permission(FunctionName="spike-ask", StatementId="s3", Action="lambda:InvokeFunction", Principal="s3.amazonaws.com", SourceArn=f"arn:aws:s3:::{BUCKET}")
    except Exception:
        pass
    s3.put_bucket_notification_configuration(Bucket=BUCKET, NotificationConfiguration={"LambdaFunctionConfigurations": [{"LambdaFunctionArn": arn, "Events": ["s3:ObjectCreated:*"], "Filter": {"Key": {"FilterRules": [{"Name": "prefix", "Value": "docs/"}]}}}]})
    s3.put_object(Bucket=BUCKET, Key="docs/b.md", Body=b"# Doc B\nShipping takes 5 days.", Metadata={"doc_id": "doc-b"})
    for _ in range(60):
        if s3.list_objects_v2(Bucket=BUCKET, Prefix="markers/").get("KeyCount", 0):
            return "marker written by the triggered Lambda"
        time.sleep(1)
    raise AssertionError("no marker after 60 s")


@check("CloudWatch Logs: Lambda JSON log line present")
def _():
    logs = C("logs")
    for _ in range(30):
        ev = logs.filter_log_events(logGroupName="/aws/lambda/spike-ask").get("events", [])
        js = [e["message"] for e in ev if "latency_ms" in e["message"]]
        if js:
            return js[-1].strip()[:120]
        time.sleep(1)
    raise AssertionError("no log line with latency_ms in /aws/lambda/spike-ask")


# ---------------- DynamoDB ----------------
@check("DynamoDB: table, put, query by user")
def _():
    d = C("dynamodb")
    d.create_table(TableName="spike-history", AttributeDefinitions=[{"AttributeName": "sub", "AttributeType": "S"}, {"AttributeName": "ts", "AttributeType": "N"}],
                   KeySchema=[{"AttributeName": "sub", "KeyType": "HASH"}, {"AttributeName": "ts", "KeyType": "RANGE"}], BillingMode="PAY_PER_REQUEST")
    for i in range(2):
        d.put_item(TableName="spike-history", Item={"sub": {"S": "u1"}, "ts": {"N": str(i)}, "q": {"S": f"question {i}"}})
    n = d.query(TableName="spike-history", KeyConditionExpression="#s = :u", ExpressionAttributeNames={"#s": "sub"}, ExpressionAttributeValues={":u": {"S": "u1"}})["Count"]
    assert n == 2, n
    return "2 rows for u1"


# ---------------- Cognito + API Gateway v2 (HTTP API) + JWT authorizer ----------------
STATE = {}


@check("Cognito: pool, client, admin user, password auth → IdToken")
def _():
    cg = C("cognito-idp")
    pool = cg.create_user_pool(PoolName="spike-users")["UserPool"]["Id"]
    client = cg.create_user_pool_client(UserPoolId=pool, ClientName="spike-web", ExplicitAuthFlows=["ALLOW_USER_PASSWORD_AUTH", "ALLOW_ADMIN_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"])["UserPoolClient"]["ClientId"]
    cg.admin_create_user(UserPoolId=pool, Username="grader@example.com", MessageAction="SUPPRESS", TemporaryPassword="Tmp-pass-123!")
    cg.admin_set_user_password(UserPoolId=pool, Username="grader@example.com", Password="Spike-pass-123!", Permanent=True)
    tok = cg.admin_initiate_auth(UserPoolId=pool, ClientId=client, AuthFlow="ADMIN_USER_PASSWORD_AUTH", AuthParameters={"USERNAME": "grader@example.com", "PASSWORD": "Spike-pass-123!"})["AuthenticationResult"]["IdToken"]
    STATE.update(pool=pool, client=client, token=tok)
    return f"pool={pool} token_len={len(tok)}"


@check("API Gateway v2: HTTP API POST /ask → Lambda (no auth)")
def _():
    ag = C("apigatewayv2")
    arn = lam.get_function(FunctionName="spike-ask")["Configuration"]["FunctionArn"]
    api = ag.create_api(Name="spike-api", ProtocolType="HTTP")["ApiId"]
    integ = ag.create_integration(ApiId=api, IntegrationType="AWS_PROXY", IntegrationUri=arn, PayloadFormatVersion="2.0")["IntegrationId"]
    ag.create_route(ApiId=api, RouteKey="POST /ask", Target=f"integrations/{integ}")
    ag.create_stage(ApiId=api, StageName="$default", AutoDeploy=True)
    STATE.update(api=api, integ=integ)
    code, body = http("POST", f"{EP}/ask", {"question": "refund?"}, host=f"{api}.execute-api.localhost.floci.io:4566")
    assert code == 200, (code, body[:200])
    return f"200 {body[:100]}"


@check("API Gateway v2: JWT authorizer (Cognito) [known gap]", gap=True)
def _():
    ag = C("apigatewayv2")
    api, integ = STATE["api"], STATE["integ"]
    import base64
    claims = json.loads(base64.urlsafe_b64decode(STATE["token"].split(".")[1] + "=="))
    issuer = claims["iss"]  # use the issuer Floci actually puts in its tokens
    auth = ag.create_authorizer(ApiId=api, AuthorizerType="JWT", IdentitySource=["$request.header.Authorization"], Name="cognito",
                                JwtConfiguration={"Audience": [STATE["client"]], "Issuer": issuer})["AuthorizerId"]
    ag.create_route(ApiId=api, RouteKey="POST /secure", Target=f"integrations/{integ}", AuthorizationType="JWT", AuthorizerId=auth)
    host = f"{api}.execute-api.localhost.floci.io:4566"
    c1, b1 = http("POST", f"{EP}/secure", {"question": "x"}, host=host)
    c2, b2 = http("POST", f"{EP}/secure", {"question": "x"}, headers={"Authorization": "Bearer " + STATE["token"]}, host=host)
    c3, b3 = http("POST", f"{EP}/secure", {"question": "x"}, headers={"Authorization": STATE["token"]}, host=host)
    STATE["iss"] = issuer
    assert c1 == 401 and (c2 == 200 or c3 == 200), (issuer, claims.get("aud"), c1, c2, b2[:160], c3, b3[:160])
    b2 = b2 if c2 == 200 else b3
    return f"iss={STATE['iss']} no token {c1}; Bearer {c2}; raw {c3}; sub in body: {'sub' in b2 and json.loads(b2).get('sub') is not None}"


@check("API Gateway v1 REST + Cognito authorizer → 401 / 200 + sub")
def _():
    ag = C("apigateway")
    pool_arn = C("cognito-idp").describe_user_pool(UserPoolId=STATE["pool"])["UserPool"]["Arn"]
    fn = lam.get_function(FunctionName="spike-ask")["Configuration"]["FunctionArn"]
    api = ag.create_rest_api(name="spike-rest")["id"]
    root = [r for r in ag.get_resources(restApiId=api)["items"] if r["path"] == "/"][0]["id"]
    res = ag.create_resource(restApiId=api, parentId=root, pathPart="ask")["id"]
    auth = ag.create_authorizer(restApiId=api, name="cognito", type="COGNITO_USER_POOLS", providerARNs=[pool_arn], identitySource="method.request.header.Authorization")["id"]
    ag.put_method(restApiId=api, resourceId=res, httpMethod="POST", authorizationType="COGNITO_USER_POOLS", authorizerId=auth)
    ag.put_integration(restApiId=api, resourceId=res, httpMethod="POST", type="AWS_PROXY", integrationHttpMethod="POST",
                       uri=f"arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/{fn}/invocations")
    ag.create_deployment(restApiId=api, stageName="dev")
    url = f"{EP}/restapis/{api}/dev/_user_request_/ask"
    c1, _b = http("POST", url, {"question": "x"})
    c2, b2 = http("POST", url, {"question": "x"}, headers={"Authorization": "Bearer " + STATE["token"]})
    assert c1 == 401 and c2 == 200, (c1, c2, b2[:160])
    return f"no token {c1}; token {c2}"


# ---------------- Bedrock Runtime via the proxy backend ----------------
@check("Bedrock Converse → proxy (bearer token) → real model")
def _():
    br = C("bedrock-runtime")
    r = br.converse(modelId="anthropic.claude-3-haiku-20240307-v1:0", messages=[{"role": "user", "content": [{"text": "In one short sentence: what is retrieval-augmented generation?"}]}],
                    inferenceConfig={"maxTokens": 80})
    text = r["output"]["message"]["content"][0]["text"]
    assert text.strip(), r
    return f"{text.strip()[:90]!r} usage={r.get('usage')}"


@check("Bedrock ConverseStream → proxy")
def _():
    br = C("bedrock-runtime")
    r = br.converse_stream(modelId="anthropic.claude-3-haiku-20240307-v1:0", messages=[{"role": "user", "content": [{"text": "Say OK."}]}], inferenceConfig={"maxTokens": 10})
    parts = [e["contentBlockDelta"]["delta"].get("text", "") for e in r["stream"] if "contentBlockDelta" in e]
    assert "".join(parts).strip(), parts
    return f"{len(parts)} deltas: {''.join(parts)[:40]!r}"


print()
ok = sum(1 for r in RESULTS if r[1] == "PASS")
gaps = sum(1 for r in RESULTS if r[1] == "GAP")
print(f"{ok}/{len(RESULTS) - gaps} required checks passed; {gaps} known gap(s) shown above")
with open(os.environ.get("SPIKE_RESULTS", "results.json"), "w") as f:
    json.dump([{"check": n, "result": r, "detail": d, "seconds": s} for n, r, d, s in RESULTS], f, indent=1)
sys.exit(0 if ok == len(RESULTS) - gaps else 1)
