"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Lightbulb, Loader2, Play, RotateCcw, Send, TriangleAlert, X } from "lucide-react";
import { recordPracticePass, getPracticePasses } from "@/lib/progress";

const CodeEditor = dynamic(() => import("@/components/shell/CodeEditor"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--ink-mute)]">Loading editor…</div>,
});

interface CheckResult {
  layer: string;
  name: string;
  explain: string;
  status: "pass" | "fail" | "error" | "skip";
  message: string;
  expected: string | null;
  actual: string | null;
  ms?: number;
}
interface Report {
  results: CheckResult[];
  summary: { total: number; passed: number; failed: number; ok: boolean };
  load_error: string;
  stdout: string;
  warnings: string[];
  ms?: number;
}

export interface PracticeData {
  id: string;
  kind: string;
  starter: string;
  tests: string;
  fixtures: string;
  support: string;
  timeLimitS: number;
  lessonId: string | null;
}

const LAYER_LABEL: Record<string, string> = {
  examples: "Examples",
  properties: "Properties",
  edge: "Edge cases",
  reference: "Reference",
};
const storageKey = (id: string) => `m4ai:practice:${id}`;

/** Write the function, run the source repo's own checks in Pyodide (a Web Worker), get told exactly what is wrong. */
export function PracticeRunner({ p, hintsHtml, notesHtml }: { p: PracticeData; hintsHtml: string[]; notesHtml: string }) {
  const [code, setCode] = useState(p.starter);
  const [phase, setPhase] = useState<"idle" | "booting" | "ready" | "running" | "failed">("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [mode, setMode] = useState<"examples" | "all">("examples");
  const [error, setError] = useState("");
  const [hints, setHints] = useState(0);
  const [passed, setPassed] = useState(false);
  const [xp, setXp] = useState(0);
  const [curve, setCurve] = useState<{ step: number; value: number }[]>([]);
  const worker = useRef<Worker | null>(null);
  const runId = useRef(0);

  // restore saved code + pass state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(p.id));
      if (saved) setCode(saved);
    } catch {
      /* storage blocked */
    }
    setPassed(Boolean(getPracticePasses()[p.id]));
  }, [p.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(p.id), code);
      } catch {
        /* storage blocked */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code, p.id]);

  const ensureWorker = useCallback(() => {
    if (worker.current) return worker.current;
    const w = new Worker("/practice/worker.js", { type: "module" });
    w.onmessage = (e: MessageEvent) => {
      const m = e.data ?? {};
      if (m.type === "status") {
        if (m.phase === "ready") setPhase((ph) => (ph === "running" ? ph : "ready"));
        else if (m.phase === "failed") {
          setPhase("failed");
          setError(m.message ?? "Python did not start.");
        }
      } else if (m.type === "progress" && m.id === runId.current) {
        setCurve((c) => (c.length > 400 ? c : [...c, { step: m.step, value: m.value }]));
      } else if (m.type === "result" && m.id === runId.current) {
        setPhase("ready");
        setReport(m.report as Report);
      } else if (m.type === "error" && m.id === runId.current) {
        setPhase("ready");
        setError(m.message);
      }
    };
    worker.current = w;
    setPhase("booting");
    w.postMessage({ type: "boot" });
    return w;
  }, []);

  useEffect(() => () => worker.current?.terminate(), []);

  const run = (which: "examples" | "all") => {
    const w = ensureWorker();
    runId.current += 1;
    setMode(which);
    setError("");
    setReport(null);
    setCurve([]);
    setPhase("running");
    w.postMessage({
      type: "run",
      id: runId.current,
      code,
      tests: p.tests,
      fixtures: p.fixtures,
      support: p.support,
      layers: which === "examples" ? ["examples"] : [],
      limit: p.timeLimitS,
    });
  };

  // award XP the first time every check passes on a full submit
  useEffect(() => {
    if (report && mode === "all" && report.summary.ok) {
      const r = p.lessonId ? recordPracticePass(p.lessonId, p.id) : { xpAwarded: 0 };
      setXp(r.xpAwarded);
      setPassed(true);
    }
  }, [report, mode, p.id, p.lessonId]);

  const busy = phase === "running" || phase === "booting";
  const grouped = report ? Object.entries(groupBy(report.results, (r) => r.layer)) : [];

  return (
    <div className="space-y-5">
      {/* editor */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--rule)] bg-[var(--bg-sunk)] px-3 py-2">
          <span className="font-mono text-xs text-[var(--ink-soft)]">answer.py</span>
          {passed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Solved
            </span>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCode(p.starter)}
              className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs text-[var(--ink-mute)] hover:text-[var(--ink)]"
              title="Replace your code with the starter"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run("examples")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--rule-strong)] bg-white px-3 text-xs font-semibold disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Run examples
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run("all")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> Submit all checks
            </button>
          </span>
        </div>
        <div className="h-[420px]">
          <CodeEditor value={code} onChange={setCode} filename={`${p.id}.py`} language="python" />
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--rule)] px-3 py-2 text-xs text-[var(--ink-mute)]">
          {phase === "booting" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting Python and numpy in your browser (first run only)…
            </>
          )}
          {phase === "running" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running {mode === "examples" ? "the examples" : "every check"}…
            </>
          )}
          {phase === "idle" && <>Your code runs in your browser. Nothing is sent to a server.</>}
          {phase === "ready" && !report && !error && <>Python is ready.</>}
          {phase === "ready" && report && (
            <>
              {report.summary.passed} of {report.summary.total} checks passed{report.ms ? ` in ${(report.ms / 1000).toFixed(1)} s` : ""}
            </>
          )}
          {phase === "failed" && <span className="text-rose-700">{error}</span>}
        </div>
      </div>

      {error && phase !== "failed" && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
      )}

      {/* training curve (train problems report loss while they run) */}
      {curve.length > 1 && <LossCurve points={curve} />}

      {/* results */}
      {report && (
        <div className="card p-4 sm:p-5">
          {report.summary.ok ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              <Check className="h-4 w-4" />
              {mode === "all" ? "Every check passes. Solved." : "The examples pass. Now submit all checks."}
              {xp > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">+{xp} XP</span>}
            </div>
          ) : report.load_error ? (
            <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{report.load_error}</div>
          ) : null}
          <div className="space-y-4">
            {grouped.map(([layer, items]) => (
              <div key={layer}>
                <p className="eyebrow mb-1.5 text-[var(--ink-mute)]">
                  {LAYER_LABEL[layer] ?? layer} · {items.filter((i) => i.status === "pass").length}/{items.length}
                </p>
                <ul className="space-y-1.5">
                  {items.map((r, i) => (
                    <li key={i} className={`rounded-xl border px-3 py-2 text-sm ${r.status === "pass" ? "border-[var(--rule)] bg-white" : "border-rose-200 bg-rose-50/60"}`}>
                      <div className="flex items-start gap-2">
                        {r.status === "pass" ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : r.status === "skip" ? (
                          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[var(--ink)]">{r.name}</p>
                          {r.status !== "pass" && (
                            <>
                              <p className="mt-1 text-[var(--ink-soft)]">{r.explain}</p>
                              {r.message && <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-xs text-rose-800">{r.message}</pre>}
                              {(r.expected || r.actual) && (
                                <div className="mt-1.5 grid gap-1 font-mono text-xs sm:grid-cols-2">
                                  {r.expected && <pre className="whitespace-pre-wrap break-words rounded-lg bg-white px-2 py-1">expected: {r.expected}</pre>}
                                  {r.actual && <pre className="whitespace-pre-wrap break-words rounded-lg bg-white px-2 py-1">yours: {r.actual}</pre>}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {report.stdout && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-[var(--ink-mute)]">Printed output</summary>
              <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-[var(--bg-sunk)] p-3 font-mono text-xs">{report.stdout}</pre>
            </details>
          )}
          {report.warnings.length > 0 && <p className="mt-3 text-xs text-amber-700">Warnings: {report.warnings.join(" · ")}</p>}
        </div>
      )}

      {/* hints, one at a time */}
      {hintsHtml.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 font-semibold">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Hints
            </p>
            {hints < hintsHtml.length && (
              <button type="button" onClick={() => setHints((h) => h + 1)} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--blueprint)]">
                Show hint {hints + 1} of {hintsHtml.length} <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
          {hints === 0 && <p className="mt-1 text-sm text-[var(--ink-mute)]">Stuck? Each hint gets a little closer. The first is a nudge, the last gives the key idea.</p>}
          <ol className="mt-3 space-y-3">
            {hintsHtml.slice(0, hints).map((h, i) => (
              <li key={i} className="lesson-prose rounded-xl bg-[var(--bg-sunk)] px-4 py-3 !text-[15px]" dangerouslySetInnerHTML={{ __html: h }} />
            ))}
          </ol>
        </div>
      )}

      {/* notes once solved */}
      {passed && notesHtml && (
        <div className="card border-emerald-200 p-5 sm:p-6">
          <p className="eyebrow mb-2 text-emerald-700">Why it works</p>
          <div className="lesson-prose !text-[15px]" dangerouslySetInnerHTML={{ __html: notesHtml }} />
        </div>
      )}
    </div>
  );
}

function groupBy<T>(xs: T[], key: (x: T) => string) {
  const out: Record<string, T[]> = {};
  for (const x of xs) (out[key(x)] ??= []).push(x);
  return out;
}

function LossCurve({ points }: { points: { step: number; value: number }[] }) {
  const xs = points.map((p) => p.step);
  const ys = points.map((p) => p.value).filter((v) => Number.isFinite(v));
  if (!ys.length) return null;
  const [x0, x1] = [Math.min(...xs), Math.max(...xs) || 1];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sx = (x: number) => (((x - x0) / (x1 - x0 || 1)) * 300).toFixed(1);
  const sy = (y: number) => (90 - ((y - y0) / (y1 - y0 || 1)) * 80).toFixed(1);
  const d = points.filter((p) => Number.isFinite(p.value)).map((p, i) => `${i ? "L" : "M"}${sx(p.step)},${sy(p.value)}`).join(" ");
  return (
    <div className="card p-4">
      <p className="eyebrow mb-2 text-[var(--ink-mute)]">
        Training loss · last {points[points.length - 1].value.toFixed(4)} at step {points[points.length - 1].step}
      </p>
      <svg viewBox="0 0 300 100" className="h-32 w-full" preserveAspectRatio="none" role="img" aria-label="Training loss curve">
        <path d={d} fill="none" stroke="var(--blueprint)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
