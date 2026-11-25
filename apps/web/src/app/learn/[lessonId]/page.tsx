import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Code2, ExternalLink, Hammer, ListChecks } from "lucide-react";
import catalog from "@/content/lessons/catalog.json";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { LessonToc } from "@/components/learn/LessonToc";
import { MermaidDiagrams } from "@/components/learn/MermaidDiagrams";
import { Quiz } from "@/components/learn/Quiz";
import { CodeFiles } from "@/components/learn/CodeFiles";
import { MarkVisited } from "@/components/learn/MarkVisited";
import { SOURCE, loadSourceLesson, neighbours, phaseLessonIds, phaseOf } from "@/lib/source-lessons";
import { renderLessonMarkdown } from "@/lib/source-render";

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

export async function generateStaticParams() {
  return SOURCE.lessons.map((l) => ({ lessonId: l.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { lessonId } = await params;
  const l = SOURCE.lessons.find((x) => x.id === lessonId);
  return {
    title: l ? `${l.title} — Math for AI` : "Lesson — Math for AI",
    description: l ? `Phase ${l.phaseId} · ${phaseOf(l.phaseId)?.name ?? ""}: ${l.title}` : undefined,
  };
}

export default async function LearnPage({ params }: PageProps) {
  const { lessonId } = await params;
  const lesson = await loadSourceLesson(lessonId);
  if (!lesson) notFound();

  const { html, toc } = renderLessonMarkdown(lesson.markdown, { upstreamUrl: lesson.upstreamUrl });
  const { prev, next } = neighbours(lesson.id);
  const phase = phaseOf(lesson.phaseId);
  const ids = phaseLessonIds(lesson.phaseId);
  const position = ids.indexOf(lesson.id) + 1;
  const hasPlayer = Boolean((catalog.lessons as { id: string; hasPlayer?: boolean }[]).find((l) => l.id === lesson.id)?.hasPlayer);
  const githubDir = lesson.githubUrl.replace(/\/docs\/en\.md$/, "/code");
  const pre = lesson.quiz?.pre ?? [];
  const post = lesson.quiz?.post ?? [];
  const metaChips = [
    lesson.meta.type && { icon: Hammer, text: lesson.meta.type },
    { icon: Clock, text: `${lesson.minutes} min` },
    (lesson.meta.languages || lesson.meta.language) && { icon: Code2, text: lesson.meta.languages || lesson.meta.language },
    post.length + pre.length > 0 && { icon: ListChecks, text: `${pre.length + post.length} quiz questions` },
  ].filter(Boolean) as { icon: typeof Clock; text: string }[];

  const fullToc = [
    ...(pre.length ? [{ id: "warm-up", text: "Warm-up", depth: 2 as const }] : []),
    ...toc,
    ...(lesson.code.length ? [{ id: "code", text: "The code", depth: 2 as const }] : []),
    ...(post.length ? [{ id: "check", text: "Check yourself", depth: 2 as const }] : []),
  ];

  return (
    <div className="paper-ruled min-h-screen text-[var(--ink)]">
      <SiteHeader />
      <MarkVisited lessonId={lesson.id} />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* stage rail: sticky on desktop only (no sticky sidebars on phones) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
            <Link href={`/#catalogue`} className="mb-4 inline-flex items-center gap-1 text-xs text-[var(--ink-mute)] hover:text-[var(--ink)]">
              <ArrowLeft className="h-3.5 w-3.5" /> All lessons
            </Link>
            <LessonToc items={fullToc} />
          </div>
        </aside>

        <main className="min-w-0 max-w-[780px]">
          {/* lesson header */}
          <header className="card p-5 sm:p-8">
            <p className="eyebrow text-[var(--blueprint)]">
              Phase {String(lesson.phaseId).padStart(2, "0")} · {phase?.name} · lesson {position} of {ids.length}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight sm:text-[2.6rem]">{lesson.title}</h1>
            {lesson.motto && <p className="mt-3 font-display text-lg italic leading-snug text-[var(--ink-soft)]">{lesson.motto}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              {metaChips.map(({ icon: Icon, text }) => (
                <span key={text} className="pill">
                  <Icon className="h-3.5 w-3.5 text-[var(--ink-mute)]" /> {text}
                </span>
              ))}
            </div>
            {lesson.meta.prerequisites && (
              <p className="mt-4 text-sm text-[var(--ink-mute)]">
                <span className="font-medium text-[var(--ink-soft)]">Before this:</span> {lesson.meta.prerequisites}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              {post.length > 0 && (
                <a href="#check" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white hover:bg-black">
                  <ListChecks className="h-4 w-4" /> Check yourself
                </a>
              )}
              {hasPlayer && (
                <Link href={`/demo/${lesson.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--rule-strong)] bg-white px-4 text-sm font-semibold hover:border-[var(--ink)]">
                  <Hammer className="h-4 w-4" /> Build it step by step
                </Link>
              )}
              <a href={lesson.upstreamUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
                <ExternalLink className="h-4 w-4" /> Interactive figures
              </a>
            </div>
          </header>

          {/* mobile contents: a chip row, not a sticky sidebar */}
          {fullToc.length > 2 && (
            <details className="card mt-4 p-4 lg:hidden">
              <summary className="cursor-pointer text-sm font-medium">Contents</summary>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {fullToc
                  .filter((t) => t.depth === 2)
                  .map((t) => (
                    <a key={t.id} href={`#${t.id}`} className="pill">
                      {t.text}
                    </a>
                  ))}
              </div>
            </details>
          )}

          {pre.length > 0 && (
            <section id="warm-up" className="card anchor-target mt-6 p-5 sm:p-8">
              <p className="eyebrow text-[var(--ink-mute)]">Warm-up · before you read</p>
              <h2 className="mt-1 font-display text-2xl font-bold">What do you already know?</h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">No pressure: this just primes what to look for.</p>
              <div className="mt-5">
                <Quiz lessonId={lesson.id} stage="pre" items={pre} phaseId={lesson.phaseId} phaseLessonIds={ids} />
              </div>
            </section>
          )}

          <article id="lesson-body" className="card lesson-prose mt-6 p-5 sm:p-10" dangerouslySetInnerHTML={{ __html: html }} />
          <MermaidDiagrams rootId="lesson-body" />

          {lesson.code.length > 0 && (
            <section id="code" className="anchor-target mt-6">
              <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-bold">
                <Code2 className="h-5 w-5 text-[var(--blueprint)]" /> The code
              </h2>
              <CodeFiles files={lesson.code} githubDir={githubDir} />
            </section>
          )}

          {post.length > 0 && (
            <section id="check" className="card anchor-target mt-6 border-[var(--blueprint)] p-5 sm:p-8">
              <p className="eyebrow text-[var(--blueprint)]">Check yourself</p>
              <h2 className="mt-1 font-display text-2xl font-bold">Did it stick?</h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">Get 70% or more to complete the lesson and earn XP.</p>
              <div className="mt-5">
                <Quiz lessonId={lesson.id} stage="post" items={post} phaseId={lesson.phaseId} phaseLessonIds={ids} />
              </div>
            </section>
          )}

          <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Lesson navigation">
            {prev ? (
              <Link href={`/learn/${prev.id}`} className="card card-lift p-4">
                <span className="eyebrow flex items-center gap-1 text-[var(--ink-mute)]">
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </span>
                <span className="mt-1 block font-medium">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/learn/${next.id}`} className="card card-lift p-4 text-right">
                <span className="eyebrow flex items-center justify-end gap-1 text-[var(--ink-mute)]">
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 block font-medium">{next.title}</span>
              </Link>
            )}
          </nav>

          <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-[var(--ink-mute)]">
            <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Lesson text, quizzes and code from{" "}
              <a className="underline hover:text-[var(--ink)]" href={lesson.githubUrl} target="_blank" rel="noreferrer">
                ai-engineering-from-scratch
              </a>{" "}
              by Rohit Ghumare and contributors (MIT licence), version {SOURCE.sha.slice(0, 7)}.
            </span>
          </p>
        </main>
      </div>
    </div>
  );
}
