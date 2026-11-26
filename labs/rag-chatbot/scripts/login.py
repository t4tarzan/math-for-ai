"""Save your lab token so Floci, Terraform and the grader can use it: writes .lab/env (mode 600, gitignored)."""
import getpass, os, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
url = os.environ.get("LAB_MODEL_URL", "https://math.wntap.org/api/lab/model/v1")
token = os.environ.get("M4AI_LAB_TOKEN") or getpass.getpass("Paste your lab token (from your capstone page): ").strip()
if not token.startswith("m4ai_lab_"):
    raise SystemExit("That does not look like a lab token (it starts with m4ai_lab_).")
d = root / ".lab"; d.mkdir(exist_ok=True)
f = d / "env"
f.write_text(
    f"LAB_MODEL_URL={url}\nLAB_TOKEN={token}\n"
    f"TF_VAR_lab_model_url={url}\nTF_VAR_lab_token={token}\n"
    f"FLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_URL={url}\nFLOCI_SERVICES_BEDROCK_RUNTIME_PROXY_API_KEY={token}\n"
)
os.chmod(f, 0o600)
print(f"saved to {f} — restart Floci so it picks up the token: make floci-restart")
