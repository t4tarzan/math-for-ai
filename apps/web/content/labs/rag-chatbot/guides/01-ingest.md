# Stage 1 — Ingest the documents

**Goal:** the 12 documents in `documents/` live in an S3 bucket, each with its `doc_id` as object metadata.

A chatbot can only cite what it can find. The `doc_id` you attach now is what your answers will cite in stage 3.

## Build
1. In `infra/stage1_ingest.tf`, add an S3 bucket named `"${var.name}-docs"` with `force_destroy = true`.
2. In `infra/outputs.tf`, uncomment the `bucket` line.
3. `make deploy`, then `make upload`. The upload script reads `doc_id` from each file's front matter and sends it as
   metadata (`x-amz-meta-doc_id`).

## Test it yourself
```bash
aws s3 ls s3://ragbot-docs/documents/
aws s3api head-object --bucket ragbot-docs --key documents/uk-05-data-protection.md --query Metadata
```

## The grader checks
- all 12 documents are under `documents/` with the right `doc_id` metadata (12/12).
