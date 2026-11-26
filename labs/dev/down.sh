#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -f proxy.pid ] && kill "$(cat proxy.pid)" 2>/dev/null; rm -f proxy.pid
docker rm -f m4ai-floci-dev >/dev/null 2>&1
docker ps -a --format '{{.ID}} {{.Names}}' | awk '/floci-aws-/ {print $1}' | xargs -r docker rm -f >/dev/null 2>&1
echo down
