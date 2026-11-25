// math-for-ai — PM2 entries. The cockpit is the SHARED vke/cockpit/app.py, env-parameterized, never forked.
const path = require("path"), os = require("os");
const HERE = __dirname, VKE = path.join(os.homedir(), "hub2", "vke"), LOG = path.join(os.homedir(), "hub2", "runtime");
module.exports = { apps: [
 // local dev server for apps/web on :7790 (production is Vercel); started ad hoc on 2026-11-25, tracked here since 2026-11-26
 { name: "math-for-ai", cwd: path.join(HERE, "apps", "web"), script: path.join(HERE, "apps", "web", "node_modules", ".bin", "next"),
   args: "dev -p 7790", interpreter: "none", autorestart: true, max_restarts: 10,
   out_file: path.join(LOG, "math-for-ai-dev.log"), error_file: path.join(LOG, "math-for-ai-dev.log") },
 { name: "labs-cockpit", cwd: VKE, script: path.join(VKE, ".venv", "bin", "uvicorn"),
  args: "cockpit.app:app --host 127.0.0.1 --port 6847", interpreter: "none", autorestart: true, max_restarts: 10,
  env: { VKE_COCKPIT_DB: path.join(HERE, "runtime", "labplan.db"), VKE_COCKPIT_DOCS: path.join(HERE, "docs"),
    VKE_COCKPIT_PLAN_DOC: "LABS-ARC.md", VKE_COCKPIT_ARCH_DOC: "LABS-ARCHITECTURE.md",
    VKE_COCKPIT_RESOURCES: path.join(HERE, "cockpit", "resources.json"), VKE_COCKPIT_EXPLAINERS: path.join(HERE, "cockpit", "explainers.json"),
    VKE_COCKPIT_TITLE: "Math for AI — Floci cloud labs · cockpit", VKE_COCKPIT_SUB: ":6847 · loopback · INTERNAL · reads labplan.db + docs/LABS-*",
    VKE_COCKPIT_APP: "labs-cockpit", VKE_COCKPIT_PROGRESS_RE: "math-for-ai|Floci|labs",
    VKE_COCKPIT_PROGRESS_HEADING: "^\\*\\*(\\d{4}-\\d\\d-\\d\\d.*? — .+?)\\*\\*", VKE_COCKPIT_PROGRESS_FILES: "~/hub2/PROGRESS.md" },
  out_file: path.join(LOG, "labs-cockpit.log"), error_file: path.join(LOG, "labs-cockpit.log") }] };
