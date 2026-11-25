"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { getQuizScores, recordQuiz } from "@/lib/progress";

export interface QuizItem {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

/** Questions from the source lesson's quiz.json. "pre" warms you up; passing "post" (>= 70%) completes the lesson. */
export function Quiz({
  lessonId,
  stage,
  items,
  phaseId,
  phaseLessonIds,
}: {
  lessonId: string;
  stage: "pre" | "post";
  items: QuizItem[];
  phaseId: number;
  phaseLessonIds: string[];
}) {
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null));
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; xpAwarded: number } | null>(null);
  const [best, setBest] = useState<{ correct: number; total: number } | null>(null);

  useEffect(() => {
    const s = getQuizScores(lessonId)?.[stage];
    if (s) setBest({ correct: s.correct, total: s.total });
  }, [lessonId, stage]);

  const answered = picked.every((p) => p !== null);
  const score = picked.reduce<number>((s, p, i) => s + (p === items[i].correct ? 1 : 0), 0);

  const check = () => {
    setChecked(true);
    const r = recordQuiz(lessonId, stage, score, items.length, { phaseId, phaseLessonIds: { [phaseId]: phaseLessonIds } });
    setResult(r);
    setBest((b) => (!b || score > b.correct ? { correct: score, total: items.length } : b));
  };
  const reset = () => {
    setPicked(items.map(() => null));
    setChecked(false);
    setResult(null);
  };

  return (
    <div>
      <ol className="space-y-5">
        {items.map((it, qi) => (
          <li key={qi}>
            <p className="font-medium text-[var(--ink)]">
              <span className="mr-2 font-mono text-xs text-[var(--ink-mute)]">{qi + 1}.</span>
              {it.q}
            </p>
            <div className="mt-2 grid gap-1.5" role="radiogroup" aria-label={`Question ${qi + 1}`}>
              {it.options.map((o, oi) => {
                const sel = picked[qi] === oi;
                const isRight = oi === it.correct;
                const state = !checked ? (sel ? "sel" : "") : isRight ? "right" : sel ? "wrong" : "";
                return (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    disabled={checked}
                    onClick={() => setPicked((p) => p.map((v, i) => (i === qi ? oi : v)))}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      state === "sel"
                        ? "border-[var(--blueprint)] bg-[var(--blueprint-tint)] text-[var(--ink)]"
                        : state === "right"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : state === "wrong"
                            ? "border-rose-400 bg-rose-50 text-rose-900"
                            : "border-[var(--rule)] bg-white text-[var(--ink-soft)] hover:border-[var(--rule-strong)]"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {state === "right" ? <Check className="h-4 w-4" /> : state === "wrong" ? <X className="h-4 w-4" /> : <span className="inline-block h-4 w-4 rounded-full border border-current opacity-50" />}
                    </span>
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
            {checked && it.explanation && <p className="mt-2 rounded-lg bg-[var(--bg-sunk)] px-3 py-2 text-sm text-[var(--ink-soft)]">{it.explanation}</p>}
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!checked ? (
          <button
            type="button"
            disabled={!answered}
            onClick={check}
            className="h-10 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Check answers
          </button>
        ) : (
          <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--rule-strong)] bg-white px-4 text-sm font-medium">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        )}
        {checked && (
          <span className="text-sm text-[var(--ink-soft)]">
            {score} of {items.length} correct
            {stage === "post" && result?.passed && " · lesson complete"}
            {result?.xpAwarded ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">+{result.xpAwarded} XP</span> : null}
            {stage === "post" && !result?.passed && " · 70% completes the lesson"}
          </span>
        )}
        {!checked && best && (
          <span className="text-xs text-[var(--ink-mute)]">
            Best so far: {best.correct}/{best.total}
          </span>
        )}
      </div>
    </div>
  );
}
