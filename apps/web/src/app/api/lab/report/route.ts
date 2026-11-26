import { NextResponse } from "next/server";
import { getAppUserId } from "@/lib/current-user";
import { getPool } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-schema";
import { checkReport, loadLab } from "@/lib/labs";

export const dynamic = "force-dynamic";

/** Import a self-checked grader report. Signed-in learners get a stored record; XP is added by the page either way. */
export async function POST(req: Request) {
  const userId = await getAppUserId();
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const text = await req.text();
  if (text.length > 200_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "That file is not JSON." }, { status: 400 });
  }
  const capstone = (body as { capstone?: unknown })?.capstone;
  const lab = typeof capstone === "string" ? await loadLab(capstone) : null;
  if (!lab) return NextResponse.json({ error: "unknown_lab", message: "This report is not for a lab on this site." }, { status: 400 });
  const r = checkReport(lab, body);
  if (!r.ok) return NextResponse.json({ error: "rejected", message: r.error }, { status: 400 });
  await ensureDbSchema();
  const stages = r.report.stages.map((s) => ({ n: s.n, pass: s.pass, reason: (s.reason ?? "").slice(0, 300) }));
  await getPool().query(`INSERT INTO lab_report (user_id, capstone, capstone_hash, stages) VALUES ($1, $2, $3, $4::jsonb)`, [
    userId, lab.id, r.report.capstone_hash, JSON.stringify(stages),
  ]);
  return NextResponse.json({ ok: true, passed: r.passed, total: lab.stages.length });
}
