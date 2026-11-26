"""m4ai-lab — check your capstone against your own Floci and write a self-checked report.

  m4ai-lab check rag-chatbot [--endpoint URL] [--report lab.json] [--only N]

Reads lab.outputs.json (written by your Terraform), golden.json and capstone.json from the lab repo root.
Model calls (embeddings for the retrieval check) use LAB_MODEL_URL and LAB_TOKEN from your environment or .lab/env.
"""
import argparse
import datetime
import hashlib
import json
import os
import pathlib
import sys

from . import GRADER_VERSION
from .rag_chatbot import STAGES


def load_lab_env(root):
    f = root / ".lab" / "env"
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))


def main(argv=None):
    ap = argparse.ArgumentParser(prog="m4ai-lab")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check", help="check a capstone")
    c.add_argument("capstone", choices=["rag-chatbot"])
    c.add_argument("--root", default=".", help="lab repo root (default: current directory)")
    c.add_argument("--endpoint", default=os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566"))
    c.add_argument("--report", help="write the JSON report here")
    c.add_argument("--only", type=int, help="run one stage")
    a = ap.parse_args(argv)

    root = pathlib.Path(a.root).resolve()
    load_lab_env(root)
    os.environ.setdefault("AWS_ACCESS_KEY_ID", "test")
    os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test")
    os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
    capstone_raw = (root / "capstone.json").read_bytes()
    golden = json.loads((root / "golden.json").read_text())
    try:
        outputs = json.loads((root / "lab.outputs.json").read_text())
    except FileNotFoundError:
        outputs = {}

    ctx = {"root": root, "endpoint": a.endpoint, "outputs": outputs, "golden": golden, "state": {}}
    results = []
    for n, (title, fn) in enumerate(STAGES, 1):
        if a.only and n != a.only:
            continue
        checks = []
        try:
            fn(ctx, checks)
        except Exception as e:  # a stage that crashes fails with the reason, never the whole run
            checks.append({"name": "stage ran", "pass": False, "detail": f"{type(e).__name__}: {str(e)[:300]}"})
        ok = bool(checks) and all(ch["pass"] for ch in checks)
        reason = "" if ok else next((f"{ch['name']}: {ch['detail']}" for ch in checks if not ch["pass"]), "no checks ran")
        results.append({"n": n, "pass": ok, "checks": checks, "reason": reason})
        print(f"{'PASS' if ok else 'FAIL'}  stage {n} · {title}" + ("" if ok else f"\n      → {reason}"))
        for ch in checks:
            print(f"        {'✓' if ch['pass'] else '✗'} {ch['name']}" + (f" — {ch['detail']}" if ch.get("detail") else ""))

    report = {
        "schema": 1,
        "capstone": "rag-chatbot",
        "capstone_hash": hashlib.sha256(capstone_raw).hexdigest(),
        "grader_version": GRADER_VERSION,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "self_checked": True,
        "stages": results,
    }
    passed = sum(r["pass"] for r in results)
    print(f"\n{passed}/{len(results)} stages pass (self-checked)")
    if a.report:
        pathlib.Path(a.report).write_text(json.dumps(report, indent=1))
        print(f"report written to {a.report} — import it on the capstone page")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
