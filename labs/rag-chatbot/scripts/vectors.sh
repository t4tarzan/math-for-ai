#!/usr/bin/env bash
# Stage 2: create the S3 Vectors bucket and index (idempotent). Kept outside Terraform because Floci 2.5.0 cannot look
# them up by ARN, which the Terraform provider needs for refresh.
set -u
EP="${AWS_ENDPOINT_URL:-http://localhost:4566}"; BUCKET="${1:-ragbot-vectors}"; INDEX="${2:-chunks}"; DIM="${3:-1024}"
aws --endpoint-url "$EP" s3vectors get-vector-bucket --vector-bucket-name "$BUCKET" >/dev/null 2>&1 \
  || aws --endpoint-url "$EP" s3vectors create-vector-bucket --vector-bucket-name "$BUCKET" >/dev/null
aws --endpoint-url "$EP" s3vectors get-index --vector-bucket-name "$BUCKET" --index-name "$INDEX" >/dev/null 2>&1 \
  || aws --endpoint-url "$EP" s3vectors create-index --vector-bucket-name "$BUCKET" --index-name "$INDEX" \
       --data-type float32 --dimension "$DIM" --distance-metric cosine >/dev/null
echo "vector bucket $BUCKET, index $INDEX ($DIM dims, cosine) ready"
