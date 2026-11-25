"""Spike stand-in for /api/lab/model: an OpenAI-compatible endpoint that Floci's Bedrock proxy calls.
Logs whether the lab token arrived as `Authorization: Bearer`, forwards to OpenRouter with the dev key
(OPENROUTER_API_KEY in this process's env only, never in Floci or the lab), and records the usage cost.
"""
import json, os, sys, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOG = os.environ.get("SPIKE_PROXY_LOG", "proxy-log.jsonl")
EXPECT = os.environ["SPIKE_LAB_TOKEN"]
# a non-reasoning model: reasoning models can spend the whole max_tokens on hidden reasoning and return empty text
MODEL = os.environ.get("SPIKE_MODEL", "mistralai/mistral-small-24b-instruct-2501")

class H(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("content-length", 0)))
        auth = self.headers.get("authorization", "")
        rec = {"path": self.path, "auth_ok": auth == f"Bearer {EXPECT}", "auth_scheme": auth.split(" ")[0] if auth else None}
        try:
            req = json.loads(body or b"{}")
        except Exception:
            req = {}
        rec["model_in"] = req.get("model"); rec["stream"] = bool(req.get("stream")); rec["keys"] = sorted(req.keys())
        if not rec["auth_ok"]:
            self._send(401, {"error": "invalid_token"}); rec["status"] = 401
        else:
            req["model"] = MODEL
            req["usage"] = {"include": True}
            up = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(req).encode(),
                headers={"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(up, timeout=60) as r:
                    raw = r.read()
                    if rec["stream"]:
                        self.send_response(200); self.send_header("content-type", "text/event-stream"); self.end_headers(); self.wfile.write(raw)
                        rec["status"] = 200; rec["streamed_bytes"] = len(raw)
                    else:
                        out = json.loads(raw); rec["status"] = 200
                        rec["usage"] = out.get("usage"); rec["answer_chars"] = len(out["choices"][0]["message"].get("content") or "")
                        self._send(200, out)
            except Exception as e:
                rec["status"] = 502; rec["error"] = str(e)[:200]; self._send(502, {"error": "upstream"})
        with open(LOG, "a") as f:
            f.write(json.dumps(rec) + "\n")
    def _send(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code); self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def log_message(self, *a): pass

ThreadingHTTPServer(("0.0.0.0", int(sys.argv[1]) if len(sys.argv) > 1 else 18080), H).serve_forever()
