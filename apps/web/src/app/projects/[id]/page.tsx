import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, ExternalLink, Layers, Terminal } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { ProjectTracker } from "@/components/projects/ProjectTracker";
import { MermaidDiagrams } from "@/components/learn/MermaidDiagrams";
import { LEVEL_NAMES, PROJECTS, SOURCE, loadProject } from "@/lib/source-lessons";
import { renderLessonMarkdown } from "@/lib/source-render";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return PROJECTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const p = PROJECTS.find((x) => x.id === id);
  return { title: p ? `${p.title} — project — Math for AI` : "Project — Math for AI", description: p?.tagline };
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const p = await loadProject(id);
  if (!p) notFound();

  const render = (md: string) => renderLessonMarkdown(md, { upstreamUrl: p.githubUrl }).html;
  const ws = `learning-artifacts/${p.id}`;
  const cmds = [
    "git clone https://github.com/rohitg00/ai-engineering-from-scratch",
    "cd ai-engineering-from-scratch",
    `python3 scripts/project_test.py ${p.id} --init ${ws}`,
    `python3 scripts/project_test.py ${p.id} --stage 1 --path ${ws}`,
    `python3 scripts/project_test.py ${p.id} --all --strict --path ${ws} --report completion.json`,
  ];

  return (
    <div className="paper-ruled min-h-screen text-[var(--ink)]">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs text-[var(--ink-mute)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-3.5 w-3.5" /> The project ladder
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="min-w-0 space-y-6">
            <header className="card p-5 sm:p-8">
              <p className="eyebrow text-[var(--blueprint)]">
                Level {p.level} · {p.levelName ?? LEVEL_NAMES[p.level]} · {p.languages.join(", ")}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight sm:text-[2.4rem]">{p.title}</h1>
              <p className="mt-3 text-lg text-[var(--ink-soft)]">{p.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="pill">
                  <Layers className="h-3.5 w-3.5" /> {p.stages.length} stages
                </span>
                {p.hours && (
                  <span className="pill">
                    <Clock className="h-3.5 w-3.5" /> ~{p.hours} h
                  </span>
                )}
              </div>
              {p.youWillBuild && (
                <p className="mt-5 rounded-xl bg-[var(--blueprint-tint)] px-4 py-3 text-sm text-[var(--ink)]">
                  <span className="font-semibold">You will build:</span> {p.youWillBuild}
                </p>
              )}
              {p.skills.length > 0 && (
                <ul className="mt-5 grid gap-1.5 text-sm text-[var(--ink-soft)] sm:grid-cols-2">
                  {p.skills.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="text-[var(--blueprint)]">→</span> {s}
                    </li>
                  ))}
                </ul>
              )}
              {p.media.find((m) => m.endsWith("output.gif") || m.endsWith("run.gif")) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.media.find((m) => m.endsWith("output.gif")) ?? p.media.find((m) => m.endsWith("run.gif"))}
                  alt={`${p.title} running`}
                  loading="lazy"
                  className="mt-6 w-full rounded-xl border border-[var(--rule)] bg-white"
                />
              )}
            </header>

            <section className="card p-5 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <Terminal className="h-5 w-5 text-[var(--blueprint)]" /> Work on it
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Projects run on your own machine. The runner creates your workspace, then tests one stage at a time.
              </p>
              <div className="lesson-code mt-4">
                <div className="lesson-code-head">terminal</div>
                <pre>
                  <code>{cmds.join("\n")}</code>
                </pre>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-mute)]">
                Needs Python 3.12+{p.languages.includes("TypeScript") ? ", Node 22.18+" : ""}
                {p.languages.includes("Go") ? ", Go 1.23+" : ""}
                {p.languages.includes("Rust") ? ", rustc (edition 2021)" : ""}. Import the final completion.json on the right.
              </p>
            </section>

            {p.stages.map((s) => (
              <details key={s.id} id={`stage-${s.n}`} className="card group anchor-target" open={s.n === 1}>
                <summary className="flex cursor-pointer list-none items-start gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-2xl font-semibold leading-none text-[var(--blueprint)] opacity-60">{String(s.n).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{s.title}</span>
                    <span className="block text-sm text-[var(--ink-soft)]">{s.summary}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.hours && <span className="text-[11px] text-[var(--ink-mute)]">~{s.hours} h</span>}
                      {s.concepts.slice(0, 4).map((c) => (
                        <span key={c} className="rounded-full bg-[var(--bg-sunk)] px-2 py-0.5 text-[11px] text-[var(--ink-soft)]">
                          {c}
                        </span>
                      ))}
                    </span>
                  </span>
                </summary>
                <div id={`stage-doc-${s.n}`} className="lesson-prose border-t border-[var(--rule)] p-5 !text-[15px] sm:p-8" dangerouslySetInnerHTML={{ __html: render(s.doc) }} />
                <MermaidDiagrams rootId={`stage-doc-${s.n}`} />
              </details>
            ))}
          </main>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <ProjectTracker projectId={p.id} manifestHash={p.manifestHash} stages={p.stages.map((s) => ({ n: s.n, id: s.id, title: s.title }))} />
            {p.prerequisites.length > 0 && (
              <div className="card p-5">
                <p className="font-semibold">Before you start</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {p.prerequisites.map((x) => (
                    <li key={x.title}>
                      {x.lessonId ? (
                        <Link href={`/learn/${x.lessonId}`} className="inline-flex items-start gap-1.5 text-[var(--blueprint)] hover:underline">
                          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {x.title}
                        </Link>
                      ) : (
                        <span className="text-[var(--ink-soft)]">{x.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a href={p.githubUrl} target="_blank" rel="noreferrer" className="pill">
              <ExternalLink className="h-3.5 w-3.5" /> Project source on GitHub
            </a>
          </aside>
        </div>
        <p className="mt-10 text-xs text-[var(--ink-mute)]">
          Project, stage guides and tests from ai-engineering-from-scratch (MIT), version {SOURCE.sha.slice(0, 7)}.
        </p>
      </div>
    </div>
  );
}
