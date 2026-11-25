"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock, Layers } from "lucide-react";
import { readProgress } from "@/lib/progress";

type Item = {
  id: string;
  title: string;
  level: number;
  tagline: string;
  hours: number | null;
  languages: string[];
  stages: number;
};

const LANG_DOT: Record<string, string> = { Python: "#3572A5", TypeScript: "#3178c6", Go: "#00ADD8", Rust: "#b7410e" };

/** Levels 1-5 as rungs, filterable by language; shows the learner's own stage progress on each card. */
export function ProjectsLadder({ projects, levelNames }: { projects: Item[]; levelNames: Record<number, string> }) {
  const [lang, setLang] = useState<string>("All");
  const [prog, setProg] = useState<Record<string, { stages: number[]; completedAt: number | null }>>({});
  useEffect(() => {
    const read = () => setProg(readProgress().projects ?? {});
    read();
    window.addEventListener("m4ai:progress", read);
    return () => window.removeEventListener("m4ai:progress", read);
  }, []);
  const langs = useMemo(() => ["All", ...[...new Set(projects.flatMap((p) => p.languages))].sort()], [projects]);
  const shown = projects.filter((p) => lang === "All" || p.languages.includes(lang));
  const levels = [...new Set(shown.map((p) => p.level))].sort((a, b) => a - b);

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-1.5" role="group" aria-label="Filter by language">
        {langs.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${lang === l ? "bg-[var(--ink)] text-white" : "border border-[var(--rule-strong)] bg-white text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {levels.map((lv) => (
        <section key={lv} className="mt-10">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-semibold text-[var(--blueprint)] opacity-60">L{lv}</span>
            <h2 className="font-display text-2xl font-bold">{levelNames[lv] ?? `Level ${lv}`}</h2>
            <span className="text-xs text-[var(--ink-mute)]">{shown.filter((p) => p.level === lv).length} projects</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown
              .filter((p) => p.level === lv)
              .map((p) => {
                const pr = prog[p.id];
                const done = pr?.stages.length ?? 0;
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="card card-lift flex flex-col p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.languages.map((l) => (
                        <span key={l} className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-soft)]">
                          <span className="h-2 w-2 rounded-full" style={{ background: LANG_DOT[l] ?? "var(--ink-mute)" }} />
                          {l}
                        </span>
                      ))}
                      {pr?.completedAt && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> Done
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-semibold leading-snug">{p.title}</p>
                    <p className="mt-1 flex-1 text-sm text-[var(--ink-soft)]">{p.tagline}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-[var(--ink-mute)]">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" /> {done ? `${done}/${p.stages}` : p.stages} stages
                      </span>
                      {p.hours && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> ~{p.hours} h
                        </span>
                      )}
                    </div>
                    {done > 0 && !pr?.completedAt && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunk)]">
                        <div className="h-full bg-[var(--blueprint)]" style={{ width: `${((done / p.stages) * 100).toFixed(1)}%` }} />
                      </div>
                    )}
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
