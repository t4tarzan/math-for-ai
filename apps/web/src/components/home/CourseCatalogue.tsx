"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { LessonCatalogEntry } from "@/lib/lesson-types";

export interface PhaseBlock {
  id: number;
  name: string;
  tagline: string;
  lessons: LessonCatalogEntry[];
}

/** The whole course, open before sign-in: 20 phases, every lesson, searchable. */
export function CourseCatalogue({ phases }: { phases: PhaseBlock[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      phases
        .map((p) => ({
          ...p,
          lessons: query ? p.lessons.filter((l) => l.title.toLowerCase().includes(query) || l.id.includes(query)) : p.lessons,
        }))
        .filter((p) => !query || p.lessons.length > 0 || p.name.toLowerCase().includes(query)),
    [phases, query],
  );
  const total = phases.reduce((s, p) => s + p.lessons.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">The full course</h2>
          <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
            {total} lessons in {phases.length} phases, from setup and vectors to agent harnesses and capstones. Open any lesson to preview it.
          </p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-mute)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lessons (e.g. attention, RAG)"
            className="h-10 w-full rounded-full border border-[var(--rule-strong)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--blueprint)]"
            aria-label="Search lessons"
          />
        </label>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.map((p) => (
          <details key={p.id} className="card group" open={Boolean(query) || p.id <= 1}>
            <summary className="flex cursor-pointer list-none items-start gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <span className="font-mono text-2xl font-semibold leading-none text-[var(--blueprint)] opacity-60">
                {String(p.id).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-sm text-[var(--ink-soft)]">{p.tagline}</span>
              </span>
              <span className="shrink-0 text-xs text-[var(--ink-mute)]">{p.lessons.length} lessons</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ink-mute)] transition-transform group-open:rotate-180" />
            </summary>
            <ol className="grid gap-1 border-t border-[var(--rule)] p-3 sm:grid-cols-2 sm:p-4">
              {p.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={l.path}
                    className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--blueprint-tint)]"
                  >
                    <span className="w-6 shrink-0 font-mono text-[11px] text-[var(--ink-mute)]">{l.lessonNumber}</span>
                    <span className="min-w-0 flex-1 text-[var(--ink)]">{l.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        ))}
        {filtered.length === 0 && <p className="text-sm text-[var(--ink-mute)]">No lessons match “{q}”.</p>}
      </div>
    </div>
  );
}
