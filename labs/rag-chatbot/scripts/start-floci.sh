#!/usr/bin/env bash
# Start (or restart) Floci at the pinned version, with the Bedrock proxy pointed at the lab model proxy and your lab token.
# Token source: .lab/env (written by `make login`), or the Codespaces secret M4AI_LAB_TOKEN.
set -u
cd "$(dirname "$0")/.."
FLOCI_IMAGE="floci/floci@sha256:a0fbf944d7f338cc0856f1ef83831ea749ff2be71956eb7a7fce08fc21458e19"   # 2.5.0
if [ ! -f .lab/env ] && [ -n "${M4AI_LAB_TOKEN:-}" ]; then
  M4AI_LAB_TOKEN="$M4AI_LAB_TOKEN" python3 scripts/login.py >/dev/null && echo "lab token taken from the Codespaces secret M4AI_LAB_TOKEN"
fi
[ -f .lab/env ] && set -a && . .lab/env && set +a
for i in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 1; done
docker rm -f floci >/dev/null 2>&1
docker run -d --name floci --restart unless-stopped -p 127.0.0.1:4566:4566 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e FLOCI_SERVICES_UI_ENABLED=false \
  -e FLOCI_SECURITY_ALLOW_PRIVATE_JWT_TARGETS=true \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_BACKEND=proxy \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_URL="${FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_URL:-https://math.wntap.org/api/lab/model/v1}" \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_API_KEY="${FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_API_KEY:-not-logged-in}" \
  -e FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_PASSTHROUGH=true \
  "$FLOCI_IMAGE" >/dev/null
t0=$(date +%s)
for i in $(seq 1 300); do aws --endpoint-url http://localhost:4566 s3 ls >/dev/null 2>&1 && break; sleep 0.2; done
echo "Floci ready ($(( $(date +%s) - t0 ))s). $( [ -f .lab/env ] && echo 'Lab token loaded.' || echo 'Run `make login` to add your lab token.' )"
