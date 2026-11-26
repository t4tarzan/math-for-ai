# Stage 6 — Ship-ready infrastructure

**Goal:** your whole stack is described by Terraform, and what is deployed matches it exactly.

## Build
1. `make deploy` until it applies cleanly.
2. `terraform -chdir=infra plan` must say **No changes**. If it shows changes after an apply, find out why (a file that
   changes on every build is the usual cause: exclude `__pycache__` from the Lambda zip).
3. To go live on real AWS later: set `floci = false`, configure your own AWS credentials, and replace `make vectors` with the
   `aws_s3vectors_vector_bucket` / `aws_s3vectors_index` resources. Real AWS costs money; nothing in this lab does.

## The grader checks
- `terraform validate` passes;
- `terraform plan -detailed-exitcode` exits 0 (no changes) after your deploy.
