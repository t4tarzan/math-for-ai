"""Stage 2 — runs on every upload under documents/: split the document into chunks, embed them, store them in S3 Vectors.

Provided: shared.lab_model.embed(list_of_texts) -> list_of_vectors (1024 floats each), via the lab model proxy.
"""
import os

import boto3

from shared.lab_model import embed  # noqa: F401  (you will use it)

s3 = boto3.client("s3")
vectors = boto3.client("s3vectors")


def handler(event, context):
    # TODO 1: for each record in event["Records"], read the object (bucket + key) and its "doc_id" metadata.
    # TODO 2: drop the front matter (the block between the first two "---" lines).
    # TODO 3: split the text into chunks of roughly 600-1000 characters (paragraph boundaries are a good place to cut).
    # TODO 4: embed the chunks (batches of up to 16) and put them into os.environ["VECTOR_BUCKET"] / ["VECTOR_INDEX"]
    #         with key "<doc_id>#<n>" and metadata {"doc_id": ..., "text": <the chunk>}.
    raise NotImplementedError("stage 2: write the indexer")
