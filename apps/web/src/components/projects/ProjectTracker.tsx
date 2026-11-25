"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, FileUp } from "lucide-react";
import { getProjectProgress, importProjectReport, setProjectStage, type ProjectProgress } from "@/lib/progress";

interface StageLite {
  n: number;
  id: string;
  title: string;
}

/** Stage checklist (honour system) + import of the project runner's completion.json (checked against this version). */
export function ProjectTracker({
  projectId,
  manifestHash,
  stages,
}: {
  projectId: string;
  manifestHash: string;
  stages: StageLite[];
}) {
  const [prog, setProg] = useState<ProjectProgress>({ stages: [], completedAt: null });
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => setProg(getProjectProgress(projectId));
    read();
    window.addEventListener("m4ai:progress", read);
    return () => window.removeEventListener("m4ai:progress", read);
  }, [projectId]);

  const toggle = (n: number) => {
    const done = !prog.stages.includes(n);
    const r = setProjectStage(projectId, n, done, stages.length);
    setProg(r.progress);
    if (r.xp) setMsg({ tone: "good", text: `+${r.xp} XP` });
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      if (f.size > 2_000_000) throw new Error("That file is too large to be a completion report.");
      const report = JSON.parse(await f.text());
      const entry = Array.isArray(report?.projects) ? report.projects.find((p: { id?: string }) => p?.id === projectId) : null;
      if (report?.schemaVersion !== 1 || !entry) throw new Error(`No result for "${projectId}" in that file. Run the runner with --report for this project.`);
      if (entry.mode !== "learner") throw new Error("This report graded the reference solution. Grade your own workspace with --path.");
      if (entry.manifestHash !== manifestHash)
        throw new Error("The report was made for a different version of this project. Pull the latest repo and run the stages again.");
      const passed = Array.isArray(entry.stages) && entry.stages.length === stages.length &&
        entry.stages.every((s: { status?: string; tests?: number; skippedTests?: number }) => s.status === "pass" && (s.tests ?? 0) > 0 && !s.skippedTests);
      if (!entry.allStagesPassed || !entry.certificateEligible || !passed)
        throw new Error("Not every stage passed with tests and no skips. Run --all --strict and try again.");
      const r = importProjectReport(projectId, stages.length);
      setProg(getProjectProgress(projectId));
      setMsg({ tone: "good", text: `Report accepted: all ${stages.length} stages passed.${r.xp ? ` +${r.xp} XP` : ""}` });
    } catch (e) {
      setMsg({ tone: "bad", text: e instanceof Error ? e.message : "That file could not be read." });
    } finally {
      if (file.current) file.current.value = "";
    }
  };

  const done = prog.stages.length;
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold">Your progress</p>
        <p className="font-mono text-xs text-[var(--ink-mute)]">
          {done}/{stages.length} stages
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-sunk)]">
        <div className="h-full rounded-full bg-[var(--blueprint)] transition-[width] duration-300" style={{ width: `${((done / Math.max(1, stages.length)) * 100).toFixed(1)}%` }} />
      </div>
      {prog.completedAt && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <BadgeCheck className="h-3.5 w-3.5" /> Project complete{prog.verifiedReport ? " · runner report imported" : ""}
        </p>
      )}
      <ol className="mt-4 space-y-1.5">
        {stages.map((s) => {
          const on = prog.stages.includes(s.n);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.n)}
                aria-pressed={on}
                className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm ${on ? "border-emerald-300 bg-emerald-50/60" : "border-[var(--rule)] bg-white hover:border-[var(--rule-strong)]"}`}
              >
                <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--rule-strong)]"}`}>
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span>
                  <span className="font-mono text-xs text-[var(--ink-mute)]">Stage {s.n}</span> <span className="text-[var(--ink)]">{s.title}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-[var(--ink-mute)]">Tick a stage when its tests pass on your machine.</p>
      <div className="mt-4 border-t border-[var(--rule)] pt-4">
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => file.current?.click()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule-strong)] bg-white px-3 text-sm font-medium hover:border-[var(--ink)]"
        >
          <FileUp className="h-4 w-4" /> Import completion.json
        </button>
        <p className="mt-2 text-xs text-[var(--ink-mute)]">
          The report your runner writes after <code className="font-mono">--all --strict --report completion.json</code>. It is checked against this exact project version.
        </p>
      </div>
      {msg && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.tone === "good" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>
      )}
    </div>
  );
}
