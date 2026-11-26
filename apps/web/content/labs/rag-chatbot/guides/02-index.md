# Stage 2 — Index the documents as vectors

**Goal:** every upload triggers a Lambda that cuts the document into chunks, turns each chunk into an embedding (a list of
1024 numbers that captures its meaning) and stores it in an S3 Vectors index.

Retrieval is the "R" in RAG. Good chunks are small enough to be about one thing and big enough to make sense alone.

## Build
1. `make vectors` creates the vector bucket `ragbot-vectors` and the index `chunks` (1024 dimensions, cosine distance).
   (Floci cannot look these up by ARN, so they stay out of Terraform.)
2. In `infra/stage2_index.tf`: an IAM role, a zip of `lambdas/`, the indexer Lambda, a permission for S3 to call it, and
   a bucket notification for `s3:ObjectCreated:*` under `documents/`. The TODOs list every setting.
3. Write `lambdas/indexer/handler.py`. `shared.lab_model.embed()` is provided: it sends text to the lab's model proxy with
   your lab token and returns vectors.
4. `make deploy`, then `make upload` again (uploads after the trigger exists get indexed).

## Test it yourself
```bash
aws s3vectors list-vectors --vector-bucket-name ragbot-vectors --index-name chunks --return-metadata --max-results 5
```
Logs: `aws logs tail /aws/lambda/ragbot-indexer`.

## The grader checks
- every document has at least one vector whose metadata has its `doc_id` (12/12);
- each of the 5 `retrieval_queries` in `golden.json` finds a chunk of the expected document in the top 3 (5/5).
