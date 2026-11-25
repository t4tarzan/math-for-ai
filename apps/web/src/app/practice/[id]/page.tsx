import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, FileCode2 } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { PracticeRunner } from "@/components/practice/PracticeRunner";
import { PracticeBadges } from "@/components/practice/PracticeBadges";
import { PRACTICE, SOURCE, loadPractice } from "@/lib/source-lessons";
import { renderLessonMarkdown } from "@/lib/source-render";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return PRACTICE.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const p = PRACTICE.find((x) => x.id === id);
  return { title: p ? `${p.title} — practice — Math for AI` : "Practice — Math for AI", description: p?.summary };
}

export default async function PracticePage({ params }: PageProps) {
  const { id } = await params;
  const p = await loadPractice(id);
  if (!p) notFound();

  const render = (md: string) => renderLessonMarkdown(md, { upstreamUrl: p.githubUrl }).html;
  const lesson = p.lessonId ? SOURCE.lessons.find((l) => l.id === p.lessonId) : null;

  return (
    <div className="paper-ruled min-h-screen text-[var(--ink)]">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <Link href="/practice" className="inline-flex items-center gap-1 text-xs text-[var(--ink-mute)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-3.5 w-3.5" /> All practice problems
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* statement */}
          <section className="min-w-0">
            <div className="card p-5 sm:p-7">
              <PracticeBadges kind={p.kind} difficulty={p.difficulty} minutes={p.minutes} />
              <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight">{p.title}</h1>
              <p className="mt-2 text-[15px] text-[var(--ink-soft)]">{p.summary}</p>
              <p className="mt-3 text-sm text-[var(--ink-mute)]">
                You write:{" "}
                {p.entry.map((e, i) => (
                  <span key={e}>
                    {i > 0 && ", "}
                    <code className="rounded bg-[var(--code-bg)] px-1 font-mono text-[13px] text-[var(--ink)]">{e}</code>
                  </span>
                ))}
              </p>
              {p.paper && (
                <p className="mt-3 text-sm text-[var(--ink-soft)]">
                  Paper:{" "}
                  <a className="text-[var(--blueprint)] underline" href={p.paper.url} target="_blank" rel="noreferrer">
                    {p.paper.title}
                  </a>{" "}
                  ({p.paper.authors}, {p.paper.year})
                </p>
              )}
              {p.target && (
                <p className="mt-3 text-sm text-[var(--ink-soft)]">
                  Target: {p.target.metric} ≥ {p.target.value}
                  {p.budget?.steps ? ` within ${p.budget.steps.toLocaleString()} steps` : ""}
                </p>
              )}
              <div className="lesson-prose mt-6 border-t border-[var(--rule)] pt-6 !text-[15px]" dangerouslySetInnerHTML={{ __html: render(p.problem) }} />
              {p.support && (
                <details className="mt-6">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium">
                    <FileCode2 className="h-4 w-4 text-[var(--ink-mute)]" /> Provided code: support.py
                  </summary>
                  <div className="lesson-code mt-2">
                    <pre>
                      <code>{p.support}</code>
                    </pre>
                  </div>
                </details>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {lesson && (
                <Link href={`/learn/${lesson.id}`} className="pill hover:border-[var(--ink)] hover:text-[var(--ink)]">
                  <BookOpen className="h-3.5 w-3.5" /> Lesson: {lesson.title}
                </Link>
              )}
              <a href={p.githubUrl} target="_blank" rel="noreferrer" className="pill hover:border-[var(--ink)] hover:text-[var(--ink)]">
                <ExternalLink className="h-3.5 w-3.5" /> Source and offline runner
              </a>
            </div>
          </section>

          {/* editor + checks */}
          <section className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <PracticeRunner
              p={{ id: p.id, kind: p.kind, starter: p.starter, tests: p.tests, fixtures: p.fixtures, support: p.support, timeLimitS: p.timeLimitS, lessonId: p.lessonId }}
              hintsHtml={p.hints.map(render)}
              notesHtml={p.notes ? render(p.notes) : ""}
            />
          </section>
        </div>

        <p className="mt-10 text-xs text-[var(--ink-mute)]">
          Problem, checks and hints from ai-engineering-from-scratch (MIT), version {SOURCE.sha.slice(0, 7)}. Checks run in your browser with Pyodide and numpy.
        </p>
      </div>
    </div>
  );
}
