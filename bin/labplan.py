#!/usr/bin/env python3
"""Math for AI — Floci cloud labs arc: the phasedoc (plan script + task DB).

v2 (after the goldfish review of v1): one devcontainer with Floci that opens in GitHub Codespaces for the first capstone
and runs on the learner's laptop later; we host only a model proxy with budgets and the report import.
Pilot: capstone 08, Production RAG chatbot (Floci edition). Operator 2026-11-26: "both, hosted for the first capstone
then their own"; then D1 = Codespaces first, D2 = honour-system grading.

Design: docs/LABS-DESIGN.md · plan of record: docs/LABS-ARC.md · architecture: docs/LABS-ARCHITECTURE.md
Cockpit: http://127.0.0.1:6847 (loopback, INTERNAL)

A leaf is ticked ONLY after its acceptance test has actually run.

Usage:
  bin/labplan.py init | tree [phase] | next | tick <id> | part <id> | note <id> <txt>
  bin/labplan.py add <id> <parent> <title> <acceptance> [component]
  bin/labplan.py mirror | json | components | gaps | docs
"""
import datetime
import json as _json
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "runtime", "labplan.db")
MIRROR = os.path.join(ROOT, "docs", "LABS-BUILDPLAN.md")
EXPLAINERS = os.path.join(ROOT, "cockpit", "explainers.json")
STATUS_GLYPH = {"todo": "☐", "part": "◐", "done": "☑"}

# components: lowercase letters only (they key comp-<x> in the architecture SVG)
#   pilot floci content grader devbox model app safety
TASKS = [
 ('L0', '', 'Decisions and the design gate', '', ''),
 ('L1', '', 'Prove Floci can carry the capstone (spike + go/no-go)', '', ''),
 ('L2', '', 'Capstone 08, Floci edition: content, grader, reference', '', ''),
 ('L3', '', 'The devcontainer: Codespaces and the learner laptop', '', ''),
 ('L4', '', 'The model proxy with a budget', '', ''),
 ('L5', '', 'The lab inside math.wntap.org', '', ''),
 ('L6', '', 'Caps and cost', '', ''),
 ('L7', '', 'Pilot with real learners', '', ''),

 ('L0.1', 'L0', 'Design v1, plan, task list and architecture written',
  'docs/LABS-DESIGN.md, docs/LABS-ARC.md, docs/LABS-ARCHITECTURE.md and bin/labplan.py exist; `bin/labplan.py tree` prints every phase.', 'pilot'),
 ('L0.2', 'L0', 'Goldfish gate on v1 (design_critic, zoom_out, implementation_readiness)',
  'docs/egm/labs-plan-goldfish-2026-11-26.md exists with every finding listed and the decision it led to.', 'pilot'),
 ('L0.3', 'L0', 'Operator decisions D1 (Codespaces first) and D2 (honour-system grading) recorded; design v2 written',
  'LABS-DESIGN.md §8 shows D1 and D2 with the operator\'s answers and the date; v2 header says it replaces v1.', 'pilot'),
 ('L0.4', 'L0', 'One goldfish on v2 (implementation_readiness) before seeding',
  'docs/egm/labs-v2-goldfish-<date>.md exists; its findings are fixed or answered; `bin/labplan.py tree` matches docs/labs/TASKS-DRAFT.md.', 'pilot'),

 ('L1.1', 'L1', 'Floci (pinned digest) runs every service the capstone needs, scripted',
  'labs/spike/run.sh starts Floci in Docker and runs aws CLI checks for S3, S3 Vectors (create index, put, query), Lambda Python 3.12 (create, invoke, S3 trigger), API Gateway v2 (route → Lambda), Cognito (user pool, token, JWT authorizer rejects no token), DynamoDB, CloudWatch Logs; each prints PASS or FAIL with the error; results in docs/labs/SPIKE.md.', 'floci'),
 ('L1.2', 'L1', 'Bedrock proxy backend sends the configured bearer token, and Converse round-trips',
  'with PROXY_URL pointed at a local echo server, a Converse call from the aws CLI arrives with `Authorization: Bearer <token>` (header logged); pointed at an OpenAI-compatible endpoint it returns a real answer.', 'floci'),
 ('L1.3', 'L1', 'Embeddings path measured (Q1): proxy /embeddings route vs a CPU model in the Lambda',
  'SPIKE.md compares both on the document set: recall@3 on 5 known queries, latency, Lambda package size; the choice is written into LABS-DESIGN.md §4.', 'model'),
 ('L1.4', 'L1', 'Go/no-go: per-stage verdict with a fallback for every FAIL, operator acknowledged',
  'SPIKE.md has a table stage → services → PASS/FAIL → fallback (drop/replace/workaround); the operator\'s go is recorded before L2 starts.', 'pilot'),

 ('L2.1', 'L2', 'capstone.json + six stage guides (Floci edition of capstone 08, source credited)',
  'labs/rag-chatbot/ has capstone.json (stages, version), README and 6 guides; each guide ends with what the grader checks and its threshold (LABS-DESIGN §5); the source capstone 08 and MIT licence are credited.', 'content'),
 ('L2.2', 'L2', 'Starter + licensed document set + public golden set (10 questions, 3 out-of-scope, 5 PII prompts)',
  'D7 (document set) decided; its licence is named and allows reuse; golden.json follows LABS-DESIGN §9.2 (documents, 5 retrieval_queries, 10 questions, 3 out_of_scope, 5 pii); the starter writes lab.outputs.json (§9.1) and contains no stage solution (a grep for the reference handler names is empty).', 'content'),
 ('L2.3', 'L2', 'Grader CLI `m4ai-lab check rag-chatbot` with one check group per stage, against any Floci endpoint',
  'prints per-stage PASS/FAIL with a reason; --report writes JSON with capstone version (hash of capstone.json), per-stage results and the grader version; a run against an empty Floci fails stage 1 with a clear reason.', 'grader'),
 ('L2.4', 'L2', 'Reference solution (private repo) passes every stage; 5 broken variants fail the right stage',
  'on a fresh Floci the reference passes 6/6; variants (no index, wrong citations, no refusal, no auth, no logs) each fail exactly the stage named; results logged in docs/labs/GRADER-PROOF.md.', 'grader'),

 ('L3.1', 'L3', 'devcontainer.json + compose: Floci (pinned) via Docker-in-Docker, aws CLI v2, Python 3.12, Node 22, Terraform, m4ai-lab, Bedrock proxy env wired',
  'on this Mac with Docker: `devcontainer up` (or docker compose) reaches Floci ready; `aws --endpoint-url http://localhost:4566 s3 ls` works; `m4ai-lab check rag-chatbot` runs; no key or token is baked into any file (secret scan clean).', 'devbox'),
 ('L3.2', 'L3', 'Lab repo on GitHub (operator\'s yes first) and the reference passes inside a real Codespace',
  'the public template repo exists; a Codespace from it boots; time to a usable terminal and to Floci ready is recorded for 2-core and 4-core; the reference solution passes 6/6 inside it.', 'devbox'),
 ('L3.3', 'L3', 'Codespaces prebuild (if boot is slow) and the "Run locally" guide tested word for word',
  'with prebuild on, boot-to-terminal is recorded again; a scripted walk of the README local steps on a clean Docker host passes.', 'devbox'),

 ('L4.1', 'L4', '/api/lab/model on math.wntap.org: OpenAI-compatible chat completions for Floci\'s proxy, lab-token auth, model mapping',
  'a Converse call from Floci in the devcontainer returns a real answer through the route; an unknown or revoked token is 401; the provider key never appears in any response or log.', 'model'),
 ('L4.2', 'L4', 'Per-learner USD ledger from provider usage, daily cap, monthly ceiling, rate limit',
  'every call writes a ledger row with usage-derived cost; past the daily cap → 402 with a clear message; past the global ceiling → 402 for everyone; a burst over the rate limit → 429; tested with a lowered cap.', 'safety'),
 ('L4.3', 'L4', 'Embeddings route (if L1.3 chose it), same auth and ledger',
  'the capstone Lambda gets vectors of the documented dimension through the route; cost recorded in the ledger.', 'model'),

 ('L5.1', 'L5', 'Capstone page: guides, Start lab (Codespaces), Run locally, lab token (issue/revoke, shown once)',
  'signed-in allow-listed user sees the token once and can revoke it (old token 401 at once); the Codespaces link opens the lab repo; signed-out users see the guides and a sign-in button.', 'app'),
 ('L5.2', 'L5', 'Import the self-checked report: per-stage results, XP once per stage, capstone complete, labelled "self-checked"',
  'a valid report for this capstone version updates per-stage results and progress (synced); a report for another version is rejected; the page says "self-checked".', 'app'),

 ('L6.1', 'L6', 'Spend view and the monthly ceiling switch',
  'an admin page (operator only) shows spend per day and per learner from the ledger, and the ceiling; changing the ceiling takes effect on the next call.', 'safety'),

 ('L7.1', 'L7', 'Internal pilot: 3 people finish capstone 08 (at least one in Codespaces, one locally)',
  'three self-checked reports with 6/6; time, Codespaces core-hours used and model spend recorded in docs/labs/PILOT.md with every problem found.', 'pilot'),
 ('L7.2', 'L7', 'Goldfish before opening + the operator\'s go to open beyond the allow-list',
  'report in docs/egm/; the operator\'s decision recorded in LABS-DESIGN.md §8.', 'pilot'),
]

EXPLAINER_TEXT = {
 "L0": ["Write down what we are building, have fresh reviewers attack it, and get the operator's decisions. The first design (our own machines for every learner) was judged too risky; the operator chose GitHub Codespaces for the hosted lab and self-checked grading."],
 "L1": ["Prove on our own machine that Floci, the free emulator of Amazon's cloud, runs every service the chatbot capstone needs, including model calls through our proxy. Decide, stage by stage, what to do if a service falls short."],
 "L2": ["Write the capstone itself: a chatbot that answers questions from documents with citations, built in six stages, with an automatic checker. Prove the checker with a private reference solution and with deliberately broken versions."],
 "L3": ["Package the lab as one ready-made development environment. It opens in the browser through GitHub Codespaces (nothing to install) or runs on the learner's own laptop with Docker."],
 "L4": ["Let the learner's code call a real AI model the way it would call Amazon Bedrock, through a small service on our website that holds the key, with a spending limit per learner and for the month."],
 "L5": ["Put it in the course website: the guides, a Start lab button, a personal lab token, and a way to bring the checker's results back for XP and a completed capstone, clearly marked self-checked."],
 "L6": ["A simple view of what the model calls cost, and a switch for the monthly ceiling."],
 "L7": ["Three people do the whole capstone, at least one in Codespaces and one on a laptop; we measure time and cost, fix what hurts, get one more fresh review, and the operator decides when to open it."],
}


def _db():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    c = sqlite3.connect(DB)
    c.execute("""CREATE TABLE IF NOT EXISTS tasks(
        id TEXT PRIMARY KEY, parent TEXT, phase TEXT, title TEXT, test TEXT,
        component TEXT DEFAULT '', status TEXT DEFAULT 'todo',
        note TEXT DEFAULT '', completed_ts TEXT)""")
    c.execute("CREATE TABLE IF NOT EXISTS ticks(ts TEXT, task_id TEXT, status TEXT)")
    return c


def _key(tid):
    return [int("".join(ch for ch in part if ch.isdigit()) or 0) for part in tid.split(".")]


def _rows(c, sql, args=()):
    return sorted(c.execute(sql, args).fetchall(), key=lambda r: _key(r[0]))


def _is_leaf(c, tid):
    return not c.execute("SELECT 1 FROM tasks WHERE parent=? LIMIT 1", (tid,)).fetchone()


LEAF = "id NOT IN (SELECT DISTINCT parent FROM tasks WHERE parent!='')"


def init():
    c = _db()
    for tid, parent, title, test, comp in TASKS:
        phase = tid.split(".")[0]
        c.execute("INSERT OR IGNORE INTO tasks(id,parent,phase,title,test,component) VALUES(?,?,?,?,?,?)",
                  (tid, parent, phase, title, test, comp))
        c.execute("UPDATE tasks SET title=?, test=?, parent=?, phase=?, component=? WHERE id=?",
                  (title, test, parent, phase, comp, tid))
    keep = {t[0] for t in TASKS}
    for (tid, status) in c.execute("SELECT id,status FROM tasks").fetchall():
        if tid not in keep:
            if status != "todo":
                sys.exit(f"refusing to prune {tid}: status {status} (put it back in TASKS)")
            c.execute("DELETE FROM tasks WHERE id=?", (tid,))
    c.commit()
    n = c.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
    leaves = c.execute(f"SELECT COUNT(*) FROM tasks WHERE {LEAF}").fetchone()[0]
    print(f"seeded {n} tasks ({leaves} leaves) → {DB}")
    docs()
    mirror()


def tree(phase=None):
    c = _db()
    q = "SELECT id,parent,title,test,status,note FROM tasks"
    for tid, _p, title, test, status, nt in _rows(c, q + (" WHERE phase=?" if phase else ""), (phase,) if phase else ()):
        leaf = _is_leaf(c, tid)
        line = f"{'  ' * tid.count('.')}{STATUS_GLYPH.get(status, '☐') if leaf else ''} {tid}  {title}"
        if test and leaf:
            line += f"  [{test}]"
        if nt:
            line += f"  ({nt})"
        print(line)


def setstatus(tid, status):
    c = _db()
    if not c.execute("SELECT 1 FROM tasks WHERE id=?", (tid,)).fetchone():
        sys.exit(f"no task {tid}")
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    c.execute("UPDATE tasks SET status=?, completed_ts=? WHERE id=?", (status, ts if status == "done" else None, tid))
    c.execute("INSERT INTO ticks(ts,task_id,status) VALUES(?,?,?)", (ts, tid, status))
    c.commit()
    print(f"{tid} → {STATUS_GLYPH[status]}")


def note(tid, txt):
    c = _db()
    c.execute("UPDATE tasks SET note=? WHERE id=?", (txt, tid))
    c.commit()
    print(f"{tid} note set")


def add(tid, parent, title, test, comp=""):
    c = _db()
    if c.execute("SELECT 1 FROM tasks WHERE id=?", (tid,)).fetchone():
        sys.exit(f"{tid} already exists")
    if parent and not c.execute("SELECT 1 FROM tasks WHERE id=?", (parent,)).fetchone():
        sys.exit(f"no parent {parent}")
    c.execute("INSERT INTO tasks(id,parent,phase,title,test,component) VALUES(?,?,?,?,?,?)",
              (tid, parent, tid.split(".")[0], title, test, comp))
    c.commit()
    print(f"added ☐ {tid}  {title}  (also add it to TASKS so init keeps it)")


def next_task():
    c = _db()
    for tid, title, test in _rows(c, "SELECT id,title,test FROM tasks WHERE status!='done'"):
        if _is_leaf(c, tid):
            print(f"NEXT ☐ {tid}  {title}  [{test}]")
            return
    print("all done")


def as_json():
    c = _db()
    rows = [{"id": tid, "parent": p, "phase": ph, "title": t, "test": te, "component": comp, "status": st,
             "leaf": _is_leaf(c, tid), "note": nt, "completed_ts": cts}
            for tid, p, ph, t, te, comp, st, nt, cts in _rows(c, "SELECT id,parent,phase,title,test,component,status,note,completed_ts FROM tasks")]
    ticks = [{"ts": ts, "task_id": t, "status": s} for ts, t, s in c.execute("SELECT ts,task_id,status FROM ticks ORDER BY ts DESC LIMIT 100")]
    print(_json.dumps({"tasks": rows, "ticks": ticks}))


def components():
    c = _db()
    out = {}
    for comp, status in c.execute(f"SELECT component,status FROM tasks WHERE component!='' AND {LEAF}"):
        d = out.setdefault(comp, {"todo": 0, "part": 0, "done": 0})
        d[status] = d.get(status, 0) + 1
    for d in out.values():
        total = sum(d.values())
        d["state"] = "verified" if d["done"] == total else "building" if (d["done"] or d["part"]) else "planned"
    print(_json.dumps(out))


def gaps():
    c = _db()
    for tid, title, status, nt in _rows(c, "SELECT id,title,status,note FROM tasks WHERE status!='done'"):
        if _is_leaf(c, tid):
            print(f"{STATUS_GLYPH[status]} {tid}  {title}" + (f"  ({nt})" if nt else ""))


def docs():
    os.makedirs(os.path.dirname(EXPLAINERS), exist_ok=True)
    with open(EXPLAINERS, "w") as f:
        _json.dump(EXPLAINER_TEXT, f, indent=1, ensure_ascii=False)
        f.write("\n")


def mirror():
    c = _db()
    done = c.execute(f"SELECT COUNT(*) FROM tasks WHERE status='done' AND {LEAF}").fetchone()[0]
    total = c.execute(f"SELECT COUNT(*) FROM tasks WHERE {LEAF}").fetchone()[0]
    out = ["# Floci cloud labs — generated mirror of `runtime/labplan.db`", "",
           "> Regenerate with `bin/labplan.py mirror`. Do not hand-edit. INTERNAL.",
           "> Design: docs/LABS-DESIGN.md · plan of record: docs/LABS-ARC.md · architecture: docs/LABS-ARCHITECTURE.md · cockpit: http://127.0.0.1:6847", "",
           f"**Progress: {done}/{total} leaves done.**\n"]
    for tid, parent, title, test, status, nt in _rows(c, "SELECT id,parent,title,test,status,note FROM tasks"):
        if parent == "":
            out += [f"\n## {tid} — {title}\n", "| | ID | Task | Acceptance |", "|---|---|---|---|"]
            continue
        glyph = STATUS_GLYPH.get(status, "☐") if _is_leaf(c, tid) else "—"
        out.append(f"| {glyph} | {tid} | {title}{f' _({nt})_' if nt else ''} | {test} |")
    open(MIRROR, "w").write("\n".join(out) + "\n")
    print(f"mirrored → {MIRROR} ({done}/{total})")


if __name__ == "__main__":
    a = sys.argv[1:]
    cmd = a[0] if a else "tree"
    if cmd == "init": init()
    elif cmd == "tree": tree(a[1] if len(a) > 1 else None)
    elif cmd == "tick": setstatus(a[1], "done"); mirror(); docs()
    elif cmd == "part": setstatus(a[1], "part"); mirror(); docs()
    elif cmd == "note": note(a[1], " ".join(a[2:]))
    elif cmd == "add": add(*a[1:6])
    elif cmd == "next": next_task()
    elif cmd == "json": as_json()
    elif cmd == "components": components()
    elif cmd == "gaps": gaps()
    elif cmd == "docs": docs()
    elif cmd == "mirror": mirror()
    else: sys.exit(__doc__)
