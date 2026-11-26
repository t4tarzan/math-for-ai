import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/** Cloud labs (Floci capstones). Content is copied from labs/<id> by scripts/sync-labs.mjs. */
export interface LabStage {
  n: number;
  id: string;
  title: string;
  needs: string[];
}
export interface Lab {
  id: string;
  version: string;
  title: string;
  based_on: { title: string; source: string; licence: string };
  documents: { publisher: string; licence: string; count: number };
  stages: LabStage[];
  thresholds: Record<string, string>;
  repo: string;
  accepted: string[];
  guides: { file: string; markdown: string }[];
  readme: string;
}

export const LAB_IDS = ["rag-chatbot"] as const;
const DIR = path.join(process.cwd(), "content/labs");

export async function loadLab(id: string): Promise<Lab | null> {
  if (!(LAB_IDS as readonly string[]).includes(id)) return null;
  const d = path.join(DIR, id);
  const cap = JSON.parse(await fs.readFile(path.join(d, "capstone.json"), "utf8"));
  const acc = JSON.parse(await fs.readFile(path.join(d, "accepted.json"), "utf8"));
  const files = (await fs.readdir(path.join(d, "guides"))).filter((f) => f.endsWith(".md")).sort();
  const guides = await Promise.all(files.map(async (f) => ({ file: f, markdown: await fs.readFile(path.join(d, "guides", f), "utf8") })));
  return { ...cap, repo: acc.repo, accepted: acc.hashes, guides, readme: await fs.readFile(path.join(d, "README.md"), "utf8") };
}

export interface LabReport {
  schema: 1;
  capstone: string;
  capstone_hash: string;
  grader_version: string;
  generated_at: string;
  stages: { n: number; pass: boolean; reason?: string; checks?: { name: string; pass: boolean; detail?: string }[] }[];
}

/** Check a report against the lab (design §9.3). Returns the stages that passed, or an error a learner can act on. */
export function checkReport(lab: Pick<Lab, "id" | "stages" | "accepted">, r: unknown): { ok: true; passed: number[]; report: LabReport } | { ok: false; error: string } {
  const x = r as Partial<LabReport> | null;
  if (!x || typeof x !== "object" || x.schema !== 1) return { ok: false, error: "This is not a lab report (schema 1). Run `make check` and import lab-report.json." };
  if (x.capstone !== lab.id) return { ok: false, error: `This report is for "${String(x.capstone)}", not ${lab.id}.` };
  if (typeof x.capstone_hash !== "string" || !lab.accepted.includes(x.capstone_hash))
    return { ok: false, error: "This report comes from a different version of the lab. Update your lab repo (git pull) and run `make check` again." };
  if (!Array.isArray(x.stages)) return { ok: false, error: "The report has no stages." };
  const valid = new Set(lab.stages.map((s) => s.n));
  const passed = [...new Set(x.stages.filter((s) => s && s.pass === true && valid.has(s.n)).map((s) => s.n))].sort((a, b) => a - b);
  return { ok: true, passed, report: x as LabReport };
}
