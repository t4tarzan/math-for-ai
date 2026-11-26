#!/usr/bin/env bash
# Dev environment for building the capstone on hub2: Floci (pinned) + the spike model proxy, left running.
# Stop with dev/down.sh. The dev key stays in the proxy process; Floci and Lambdas only get a lab token.
set -eu
cd "$(dirname "$0")"
FLOCI_IMAGE="floci/floci@sha256:a0fbf944d7f338cc0856f1ef83831ea749ff2be71956eb7a7fce08fc21458e19"
PORT=18080
TOKEN_FILE="$PWD/.lab-token"; [ -f "$TOKEN_FILE" ] || (umask 077; echo "m4ai_lab_dev_$(openssl rand -hex 12)" > "$TOKEN_FILE")
export SPIKE_LAB_TOKEN="$(cat "$TOKEN_FILE")"
if ! curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
  OPENROUTER_API_KEY="$(awk -F= '/^OPENROUTER_API_KEY[ ]*=/{sub(/^[^=]*=[ ]*/,"");print}' ~/hub2/keys/keys.md | tr -d '" ')" \
  SPIKE_PROXY_LOG="$PWD/proxy-log.jsonl" nohup python3 ../spike/proxy.py $PORT > proxy.out 2>&1 &
  echo $! > proxy.pid
fi
docker rm -f m4ai-floci-dev >/dev/null 2>&1 || true
docker run -d --name m4ai-floci-dev -p 127.0.0.1:4566:4566 -v /var/run/docker.sock:/var/run/docker.sock \
  --add-host host.docker.internal:host-gateway \
  -e FLOCI_SERVICES_UI_ENABLED=false -e FLOCI_SECURITY_ALLOW_PRIVATE_JWT_TARGETS=true \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_BACKEND=proxy \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_URL="http://host.docker.internal:${PORT}/v1" \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_API_KEY="$SPIKE_LAB_TOKEN" \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_PASSTHROUGH=true \
  "$FLOCI_IMAGE" >/dev/null
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
for i in $(seq 1 300); do aws --endpoint-url http://127.0.0.1:4566 s3 ls >/dev/null 2>&1 && break; sleep 0.2; done
echo "dev Floci ready on :4566; model proxy on :$PORT (token in labs/dev/.lab-token)"
