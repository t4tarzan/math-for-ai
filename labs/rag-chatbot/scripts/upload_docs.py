"""Upload every document under documents/ to the docs bucket with its doc_id as metadata (stage 1)."""
import json, os, pathlib, re, sys
import boto3

root = pathlib.Path(__file__).resolve().parent.parent
out = json.loads((root / "lab.outputs.json").read_text())
docs = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "documents"
s3 = boto3.client("s3", endpoint_url=os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566"), region_name="us-east-1")
n = 0
for f in sorted(docs.glob("*.md")):
    text = f.read_text()
    m = re.search(r"^doc_id:\s*(\S+)", text, re.M)
    doc_id = m.group(1) if m else f.stem
    s3.put_object(Bucket=out["bucket"], Key=f"documents/{f.name}", Body=text.encode(), Metadata={"doc_id": doc_id}, ContentType="text/markdown")
    n += 1
print(f"uploaded {n} documents to s3://{out['bucket']}/documents/")
