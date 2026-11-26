"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, FileUp } from "lucide-react";
import { getProjectProgress, importLabStages } from "@/lib/progress";

interface StageLite {
  n: number;
  title: string;
}
type Row = { n: number; pass: boolean; reason?: string };

/** Import lab-report.json: checked by the site, results per stage, XP once per stage. Labelled self-checked. */
export function LabReportImport({ labId, stages }: { labId: string; stages: StageLite[] }) {
  const [done, setDone] = useState<number[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => setDone(getProjectProgress(`lab:${labId}`).stages);
    read();
    window.addEventListener("m4ai:progress", read);
    return () => window.removeEventListener("m4ai:progress", read);
  }, [labId]);

  const onFile = async (f: File) => {
    setMsg(null);
    const text = await f.text();
    const r = await fetch("/api/lab/report", { method: "POST", headers: { "content-type": "application/json" }, body: text });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) return setMsg({ tone: "bad", text: "Sign in first, then import the report." });
    if (!r.ok) return setMsg({ tone: "bad", text: j.message ?? "The report could not be imported." });
    try {
      setRows((JSON.parse(text).stages as Row[]).map((s) => ({ n: s.n, pass: s.pass === true, reason: s.reason })));
    } catch {
      setRows(null);
    }
    const res = importLabStages(labId, j.passed, j.total);
    setDone(res.progress.stages);
    setMsg({
      tone: "good",
      text: `${j.passed.length}/${j.total} stages pass (self-checked).` + (res.xp ? ` +${res.xp} XP.` : " No new stages since your last import."),
    });
  };

  return (
    <div className="space-y-3 text-sm">
      <ol className="space-y-1.5">
        {stages.map((s) => {
          const row = rows?.find((r) => r.n === s.n);
          const ok = done.includes(s.n);
          return (
            <li key={s.n} className="flex items-start gap-2">
              <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${ok ? "bg-emerald-600 text-white" : "bg-[var(--paper)] text-[var(--ink-mute)]"}`}>
                {ok ? "✓" : s.n}
              </span>
              <span className="min-w-0">
                {s.title}
                {row && !row.pass && row.reason && <span className="block text-xs text-[var(--ink-mute)]">{row.reason}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {done.length === stages.length && (
        <p className="inline-flex items-center gap-1 font-semibold text-emerald-700">
          <BadgeCheck className="h-4 w-4" /> Capstone complete (self-checked)
        </p>
      )}
      <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <button type="button" className="pill" onClick={() => file.current?.click()}>
        <FileUp className="h-3.5 w-3.5" /> Import lab-report.json
      </button>
      {msg && <p className={msg.tone === "good" ? "text-emerald-700" : "text-[var(--danger,#b42318)]"}>{msg.text}</p>}
      <p className="text-xs text-[var(--ink-mute)]">
        Self-checked: the grader ran on your own machine. The report shows what your system did; it is not a certificate.
      </p>
    </div>
  );
}
