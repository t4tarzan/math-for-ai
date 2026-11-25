"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, BookOpen, Boxes, FlaskConical } from "lucide-react";
import type { CSSProperties } from "react";
import type { Equation } from "@/content/equations";
import { LABS } from "@/components/home/labs";
import { Reveal } from "@/components/ui/Reveal";

const PART_VARS: Record<number, CSSProperties> = {
  1: { "--lab-accent": "var(--part1)", "--lab-tint": "var(--part1-tint)" } as CSSProperties,
  2: { "--lab-accent": "var(--part2)", "--lab-tint": "var(--part2-tint)" } as CSSProperties,
  3: { "--lab-accent": "var(--part3)", "--lab-tint": "var(--part3-tint)" } as CSSProperties,
};

export function EquationCard({
  eq,
  formulaHtml,
  lessonTitle,
}: {
  eq: Equation;
  formulaHtml: string;
  lessonTitle?: string;
}) {
  const lab = LABS[eq.slug];
  return (
    <Reveal>
      <article
        id={eq.slug}
        style={PART_VARS[eq.part]}
        className="card card-lift anchor-target overflow-hidden"
        aria-labelledby={`${eq.slug}-title`}
      >
        <div className="p-5 sm:p-8">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-md bg-[var(--lab-tint)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--lab-accent)]">
              Equation {String(eq.n).padStart(2, "0")}
            </span>
            <span className="text-xs text-[var(--ink-mute)]">{eq.useCase}</span>
          </header>
          <h3 id={`${eq.slug}-title`} className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            {eq.title}
          </h3>

          <div
            className="formula mt-5 rounded-xl border-l-4 border-[var(--lab-accent)] bg-[var(--bg-sunk)] px-4 py-5 text-center sm:px-6"
            dangerouslySetInnerHTML={{ __html: formulaHtml }}
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <p className="eyebrow text-[var(--ink-mute)]">Intuition</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink-soft)]">{eq.intuition}</p>
            </div>
            <div className="rounded-xl bg-[var(--lab-tint)] p-4">
              <p className="eyebrow font-semibold text-[var(--lab-accent)]">{eq.scenarioTitle}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{eq.scenario}</p>
            </div>
          </div>

          {lab && (
            <div className="mt-6 rounded-2xl border border-[var(--rule)] bg-[var(--bg-surface-hover)] p-4 sm:p-5">
              <p className="eyebrow mb-3 flex items-center gap-1.5 font-semibold text-[var(--lab-accent)]">
                <FlaskConical className="h-3.5 w-3.5" /> Try it · {lab.title}
              </p>
              {lab.el()}
            </div>
          )}
        </div>

        {/* Inside the course: where this is taught and which capstones lean on it */}
        <footer className="border-t border-[var(--rule)] bg-[var(--bg-sunk)] px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3 text-sm">
            {eq.lessonId && (
              <div className="min-w-0">
                <p className="eyebrow flex items-center gap-1.5 text-[var(--ink-mute)]">
                  <BookOpen className="h-3.5 w-3.5" /> Taught in
                </p>
                <Link href={`/demo/${eq.lessonId}`} className="link-underline mt-1 inline-block font-medium text-[var(--ink)]">
                  {lessonTitle ?? eq.lessonId}
                </Link>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="eyebrow flex items-center gap-1.5 text-[var(--ink-mute)]">
                <Boxes className="h-3.5 w-3.5" /> Capstones that use it
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {eq.capstones.map((c) => (
                  <Link key={c.id} href={`/demo/${c.id}`} className="pill hover:border-[var(--lab-accent)] hover:text-[var(--lab-accent)]">
                    {c.title}
                  </Link>
                ))}
              </div>
            </div>
            <Show
              when="signed-in"
              fallback={
                <Link href="/signup" className="inline-flex items-center gap-1 self-end text-sm font-semibold text-[var(--lab-accent)]">
                  Sign up to learn it and build them <ArrowRight className="h-4 w-4" />
                </Link>
              }
            >
              <Link
                href={`/demo/${eq.lessonId ?? eq.capstones[0].id}`}
                className="inline-flex items-center gap-1 self-end text-sm font-semibold text-[var(--lab-accent)]"
              >
                Open the lesson <ArrowRight className="h-4 w-4" />
              </Link>
            </Show>
          </div>
        </footer>
      </article>
    </Reveal>
  );
}
