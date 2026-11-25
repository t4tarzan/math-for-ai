#!/usr/bin/env node
/**
 * Sync lessons from ai-engineering-from-scratch (MIT, github.com/rohitg00/ai-engineering-from-scratch)
 * at ONE pinned commit into the app, so builds are reproducible and updates are a reviewable diff.
 *
 *   node scripts/sync-source.mjs --from <local clone at the commit you want>
 *
 * Writes:
 *   apps/web/src/content/source/manifest.json      phases + lesson index + the pinned commit
 *   apps/web/src/content/source/lessons/<id>.json  title, markdown, quizzes, main code files
 *   apps/web/src/content/lessons/catalog.json      the app catalogue (ids kept stable)
 *
 * Markdown is copied as written. Relative images point at raw.githubusercontent.com at the pinned
 * commit; other relative links point at the GitHub file at that commit. Rendering (and escaping of
 * any raw HTML) happens in the app, see src/lib/source-render.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = "rohitg00/ai-engineering-from-scratch";
const SITE = "https://aiengineeringfromscratch.com";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps/web/src/content");
const OUT = path.join(WEB, "source");
const OUT_LESSONS = path.join(OUT, "lessons");
const CATALOG = path.join(WEB, "lessons/catalog.json");
const INTERACTIVE_DIR = path.join(WEB, "lessons/interactive");
const COMPILED_DIR = path.join(WEB, "lessons/compiled");

const CODE_EXT = new Map([
  [".py", "python"], [".ts", "typescript"], [".js", "javascript"], [".jl", "julia"], [".rs", "rust"],
  [".go", "go"], [".sql", "sql"], [".sh", "bash"], [".tsx", "tsx"], [".yaml", "yaml"], [".yml", "yaml"],
  [".toml", "toml"], [".c", "c"],
]);
const MAX_FILE = 40_000;
const MAX_FILES = 4;
const MAX_CODE_TOTAL = 120_000;

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const from = arg("--from");
if (!from || !fs.existsSync(path.join(from, "phases"))) {
  console.error("usage: node scripts/sync-source.mjs --from <clone of ai-engineering-from-scratch>");
  process.exit(2);
}
const sha = execFileSync("git", ["-C", from, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const committedAt = execFileSync("git", ["-C", from, "log", "-1", "--format=%cI"], { encoding: "utf8" }).trim();
const RAW = `https://raw.githubusercontent.com/${REPO}/${sha}`;
const BLOB = `https://github.com/${REPO}/blob/${sha}`;

const stripNum = (s) => s.replace(/^\d+-/, "");
const titleCase = (s) => stripNum(s).split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

// Existing catalogue decides which phase keeps a duplicated folder name (saved progress is keyed by id).
const oldCatalog = fs.existsSync(CATALOG) ? JSON.parse(fs.readFileSync(CATALOG, "utf8")) : { lessons: [] };
const oldById = new Map(oldCatalog.lessons.map((l) => [l.id, l]));

function phaseNameFromReadme(dir, fallback) {
  const f = path.join(dir, "README.md");
  if (!fs.existsSync(f)) return { name: fallback, tagline: "" };
  const t = fs.readFileSync(f, "utf8");
  const h1 = t.match(/^#\s+(.+)$/m)?.[1]?.replace(/^Phase\s+\d+\s*[:—-]\s*/i, "").trim();
  const tag = t.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? "";
  return { name: h1 || fallback, tagline: tag };
}

/** Rewrite relative links/images against the lesson's docs folder, pinned to the commit. */
function rewriteLinks(md, docsRel) {
  const fix = (target, isImage) => {
    if (/^(https?:|mailto:|#|data:)/i.test(target)) return target;
    const [p, frag] = target.split("#");
    const resolved = path.posix.normalize(path.posix.join(docsRel, p));
    if (resolved.startsWith("..")) return target;
    return (isImage ? `${RAW}/${resolved}` : `${BLOB}/${resolved}`) + (frag ? `#${frag}` : "");
  };
  return md
    .replace(/(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (_, a, t, b) => a + fix(t, true) + b)
    .replace(/(^|[^!])(\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (_, pre, a, t, b) => pre + a + fix(t, false) + b);
}

function normalizeQuiz(file) {
  if (!fs.existsSync(file)) return null;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  const qs = Array.isArray(data) ? data : data.questions ?? [];
  const out = { pre: [], post: [] };
  for (const q of qs) {
    if (!q?.question || !Array.isArray(q.options) || typeof q.correct !== "number") continue;
    if (q.correct < 0 || q.correct >= q.options.length) continue;
    const item = { q: String(q.question), options: q.options.map(String), correct: q.correct, explanation: String(q.explanation ?? "") };
    (q.stage === "pre" ? out.pre : out.post).push(item);
  }
  return out.pre.length + out.post.length ? out : null;
}

function collectCode(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && CODE_EXT.has(path.extname(d.name)))
    .map((d) => ({ name: d.name, full: path.join(dir, d.name), size: fs.statSync(path.join(dir, d.name)).size }))
    .filter((f) => f.size > 0 && f.size <= MAX_FILE);
  const rank = (n) => (/^main\./.test(n) ? 0 : n.endsWith(".py") ? 1 : n.endsWith(".ts") ? 2 : 3);
  files.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  const out = [];
  let total = 0;
  for (const f of files) {
    if (out.length >= MAX_FILES || total + f.size > MAX_CODE_TOTAL) break;
    out.push({ name: f.name, lang: CODE_EXT.get(path.extname(f.name)), content: fs.readFileSync(f.full, "utf8") });
    total += f.size;
  }
  return out;
}

// ---- walk the curriculum ----
const phasesDir = path.join(from, "phases");
const phaseDirs = fs.readdirSync(phasesDir).filter((d) => /^\d{2}-/.test(d)).sort();
const raw = [];
const phases = [];
for (const pdir of phaseDirs) {
  const phaseId = Number(pdir.slice(0, 2));
  const pfull = path.join(phasesDir, pdir);
  const meta = phaseNameFromReadme(pfull, titleCase(pdir));
  const ldirs = fs
    .readdirSync(pfull, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+-/.test(d.name) && fs.existsSync(path.join(pfull, d.name, "docs/en.md")))
    .map((d) => d.name)
    .sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
  phases.push({ id: phaseId, dir: pdir, name: meta.name, tagline: meta.tagline, lessonCount: ldirs.length });
  for (const ldir of ldirs) raw.push({ phaseId, pdir, ldir });
}

// stable ids: folder name; a repeated name keeps the plain id where the old catalogue had it
const counts = new Map();
for (const r of raw) counts.set(r.ldir, (counts.get(r.ldir) ?? 0) + 1);
for (const r of raw) {
  if (counts.get(r.ldir) === 1) r.id = r.ldir;
  else r.id = oldById.get(r.ldir)?.phaseId === r.phaseId ? r.ldir : `p${String(r.phaseId).padStart(2, "0")}-${r.ldir}`;
}

fs.rmSync(OUT_LESSONS, { recursive: true, force: true });
fs.mkdirSync(OUT_LESSONS, { recursive: true });

const index = [];
let bytes = 0;
for (const r of raw) {
  const lessonRel = `phases/${r.pdir}/${r.ldir}`;
  const full = path.join(from, lessonRel);
  let md = fs.readFileSync(path.join(full, "docs/en.md"), "utf8").replace(/\r\n/g, "\n");
  const h1 = md.match(/^#\s+(.+)$/m);
  const title = (h1?.[1] ?? titleCase(r.ldir)).trim();
  if (h1) md = md.replace(h1[0], "").replace(/^\s+/, "");
  md = rewriteLinks(md, `${lessonRel}/docs`);
  // Lift the opening "> motto" and "**Type:** …" lines into structured fields (shown in the page header).
  const head = md.split(/\n(?=## )/)[0];
  const meta = {};
  let motto = "";
  const kept = [];
  for (const line of head.split("\n")) {
    const m = line.match(/^\*\*([A-Za-z][A-Za-z ]{1,30}):\*\*\s*(.+)$/);
    if (m) meta[m[1].trim().toLowerCase()] = m[2].trim();
    else if (!motto && /^>\s+\S/.test(line) && kept.every((l) => !l.trim())) motto = line.replace(/^>\s+/, "").trim();
    else kept.push(line);
  }
  md = (kept.join("\n").trim() + "\n\n" + md.slice(head.length)).trim() + "\n";
  const words = md.split(/\s+/).filter(Boolean).length;
  const quiz = normalizeQuiz(path.join(full, "quiz.json"));
  const code = collectCode(path.join(full, "code"));
  const phase = phases.find((p) => p.id === r.phaseId);
  const lesson = {
    id: r.id,
    phaseId: r.phaseId,
    phaseName: phase.name,
    lessonNumber: parseInt(r.ldir, 10),
    title,
    sourcePath: lessonRel,
    upstreamUrl: `${SITE}/learn/${stripNum(r.pdir)}/${stripNum(r.ldir)}`,
    githubUrl: `${BLOB}/${lessonRel}/docs/en.md`,
    minutes: Number(meta.time?.match(/(\d+)\s*min/)?.[1]) || Math.max(1, Math.round(words / 220)),
    motto,
    meta,
    markdown: md,
    quiz,
    code,
  };
  const json = JSON.stringify(lesson);
  bytes += json.length;
  fs.writeFileSync(path.join(OUT_LESSONS, `${r.id}.json`), json);
  index.push({
    id: r.id,
    phaseId: r.phaseId,
    lessonNumber: lesson.lessonNumber,
    title,
    minutes: lesson.minutes,
    quiz: quiz ? quiz.pre.length + quiz.post.length : 0,
    code: code.length,
  });
}

const manifest = { repo: REPO, sha, committedAt, syncedAt: new Date().toISOString(), license: "MIT", phases, lessons: index };
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
// MIT requires the copyright and permission notice to travel with the content
fs.copyFileSync(path.join(from, "LICENSE"), path.join(OUT, "LICENSE"));

// ---- the app catalogue (same shape as before; path now points at the reader) ----
const hasPlayer = (id) =>
  fs.existsSync(path.join(INTERACTIVE_DIR, `${id}.json`)) || fs.existsSync(path.join(COMPILED_DIR, `${id}.json`));
const catalog = {
  generatedAt: new Date().toISOString(),
  source: { repo: REPO, sha },
  phases: phases.map((p) => p.id),
  lessonCount: index.length,
  interactiveCount: index.filter((l) => fs.existsSync(path.join(INTERACTIVE_DIR, `${l.id}.json`))).length,
  lessons: index.map((l) => ({
    id: l.id,
    title: l.title,
    phaseId: l.phaseId,
    phaseName: phases.find((p) => p.id === l.phaseId).name,
    lessonNumber: l.lessonNumber,
    interactive: fs.existsSync(path.join(INTERACTIVE_DIR, `${l.id}.json`)),
    hasPlayer: hasPlayer(l.id),
    quiz: l.quiz,
    minutes: l.minutes,
    path: `/learn/${l.id}`,
  })),
};
fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 1));

const lost = [...oldById.keys()].filter((id) => !index.some((l) => l.id === id));
console.log(
  `synced ${index.length} lessons in ${phases.length} phases from ${REPO}@${sha.slice(0, 10)} (${(bytes / 1e6).toFixed(1)} MB)\n` +
    `quizzes: ${index.filter((l) => l.quiz).length} lessons · code files: ${index.reduce((s, l) => s + l.code, 0)}\n` +
    `ids in the old catalogue missing now: ${lost.length}${lost.length ? " → " + lost.slice(0, 10).join(", ") : ""}`,
);
