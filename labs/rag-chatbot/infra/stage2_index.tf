# Stage 2 — Index (guides/02-index.md)
# The vector bucket and index come from `make vectors` (Floci cannot look them up by ARN, so they stay out of Terraform).
#
# TODO:
#   1. An IAM role for your Lambdas (assume-role policy for lambda.amazonaws.com).
#   2. A zip of ../lambdas (data "archive_file"), excluding **/__pycache__/**.
#   3. The indexer Lambda: Python 3.12, handler "indexer.handler.handler", environment
#      LAB_MODEL_URL, LAB_TOKEN, VECTOR_BUCKET (var.vector_bucket), VECTOR_INDEX (var.vector_index).
#   4. Permission for S3 to invoke it, and a bucket notification for s3:ObjectCreated:* under "documents/".
