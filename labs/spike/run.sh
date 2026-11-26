#!/usr/bin/env bash
# L1 spike: Floci (pinned) + the mini model proxy, then spike.py. Tears everything down at the end.
set -u
cd "$(dirname "$0")"
FLOCI_IMAGE="floci/floci@sha256:a0fbf944d7f338cc0856f1ef83831ea749ff2be71956eb7a7fce08fc21458e19"   # 2.5.0
PORT=18080
export SPIKE_LAB_TOKEN="m4ai_lab_spike_$(openssl rand -hex 12)"
rm -f proxy-log.jsonl results.json

# dev key: from keys.md into this process only (never printed, never given to Floci or a Lambda)
OPENROUTER_API_KEY="$(awk -F= '/^LAB_OPENROUTER_API_KEY[ ]*=/{sub(/^[^=]*=[ ]*/,"");print}' ~/hub2/keys/keys.md | tr -d '"' | tr -d ' ')"
[ -n "$OPENROUTER_API_KEY" ] || { echo "no OPENROUTER_API_KEY in keys.md"; exit 2; }
OPENROUTER_API_KEY="$OPENROUTER_API_KEY" python3 proxy.py $PORT & PROXY_PID=$!
cleanup() {
  kill $PROXY_PID 2>/dev/null
  docker rm -f m4ai-floci-spike >/dev/null 2>&1
  # Lambda containers Floci started for the spike
  docker ps -aq --filter "label=floci.managed=true" | xargs -r docker rm -f >/dev/null 2>&1
  docker ps -a --format '{{.ID}} {{.Image}}' | awk '/public.ecr.aws\/lambda|floci.*lambda/ {print $1}' | xargs -r docker rm -f >/dev/null 2>&1
}
trap cleanup EXIT

docker rm -f m4ai-floci-spike >/dev/null 2>&1
docker run -d --name m4ai-floci-spike -p 127.0.0.1:4566:4566 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --add-host host.docker.internal:host-gateway \
  -e FLOCI_SERVICES_UI_ENABLED=false \
  -e FLOCI_SECURITY_ALLOW_PRIVATE_JWT_TARGETS=true \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_BACKEND=proxy \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_URL="http://host.docker.internal:${PORT}/v1" \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_API_KEY="$SPIKE_LAB_TOKEN" \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_PASSTHROUGH=true \
  "$FLOCI_IMAGE" >/dev/null || exit 3
# readiness = the first successful AWS call. The dummy credentials matter: without them the CLI never succeeds
# (an earlier version of this probe ran to its cap and reported ~250 s; Floci is really ready in under a second).
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
t0=$(python3 -c 'import time;print(time.time())')
for i in $(seq 1 600); do aws --endpoint-url http://127.0.0.1:4566 s3 ls >/dev/null 2>&1 && break; sleep 0.2; done
python3 -c "import time;print(f'floci ready in {time.time()-$t0:.1f}s (image $FLOCI_IMAGE)')"
docker stats --no-stream --format '{{.Name}} mem {{.MemUsage}}' m4ai-floci-spike

AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test uv run --quiet --with boto3 python spike.py; rc=$?

echo; echo "proxy log:"; python3 -c "
import json
for l in open('proxy-log.jsonl'): r=json.loads(l); print({k:r.get(k) for k in ('path','auth_ok','auth_scheme','model_in','stream','status','usage','error')})" 2>/dev/null || echo "(no proxy calls)"
docker stats --no-stream --format '{{.Name}} mem {{.MemUsage}}' | head -8
docker logs m4ai-floci-spike 2>&1 | grep -iE "error|exception" | tail -5
exit $rc
