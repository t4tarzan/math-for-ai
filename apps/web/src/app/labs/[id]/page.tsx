import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Cloud, ExternalLink, Laptop, Play, Layers } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { LabToken } from "@/components/labs/LabToken";
import { LabReportImport } from "@/components/labs/LabReportImport";
import { LAB_IDS, loadLab } from "@/lib/labs";
import { renderLessonMarkdown } from "@/lib/source-render";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return LAB_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const lab = await loadLab(id);
  return {
    title: lab ? `${lab.title} — lab — Math for AI` : "Lab — Math for AI",
    description: "Build it on Floci, a free local AWS emulator, in GitHub Codespaces or on your own machine.",
  };
}

export default async function LabPage({ params }: PageProps) {
  const { id } = await params;
  const lab = await loadLab(id);
  if (!lab) notFound();
  const repoUrl = `https://github.com/${lab.repo}`;
  const render = (md: string) => renderLessonMarkdown(md, { upstreamUrl: `${repoUrl}/blob/main/guides` }).html;
  const local = [`git clone ${repoUrl}`, `cd ${lab.repo.split("/")[1]}`, "code .   # then: Reopen in Container", "make login", "make help"];

  return (
    <div className="paper-ruled min-h-screen text-[var(--ink)]">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs text-[var(--ink-mute)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-3.5 w-3.5" /> Projects
        </Link>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 space-y-6">
            <header className="card p-5 sm:p-8">
              <p className="eyebrow text-[var(--blueprint)]">Cloud lab · Floci edition · v{lab.version}</p>
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight sm:text-[2.4rem]">{lab.title}</h1>
              <p className="mt-3 text-lg text-[var(--ink-soft)]">
                A chatbot that answers only from {lab.documents.count} {lab.documents.publisher} pages, cites them, refuses what it cannot
                answer, keeps each user&apos;s history and logs every request. Built with real AWS tools on Floci, a free local emulator.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="pill"><Layers className="h-3.5 w-3.5" /> {lab.stages.length} stages</span>
                <span className="pill"><Cloud className="h-3.5 w-3.5" /> S3 · S3 Vectors · Lambda · API Gateway · Cognito · DynamoDB · Bedrock</span>
              </div>
              <p className="mt-4 text-xs text-[var(--ink-mute)]">
                Based on{" "}
                <a className="underline" href={lab.based_on.source} target="_blank" rel="noreferrer">{lab.based_on.title}</a> from
                ai-engineering-from-scratch ({lab.based_on.licence}). Documents: {lab.documents.publisher}, {lab.documents.licence}.
              </p>
            </header>

            {lab.guides.map((g, i) => (
              <section key={g.file} id={`stage-${i + 1}`} className="card p-5 sm:p-8">
                <article className="lesson-prose" dangerouslySetInnerHTML={{ __html: render(g.markdown) }} />
              </section>
            ))}
          </main>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <section className="card p-5">
              <h2 className="font-display text-lg font-bold">1 · Your lab token</h2>
              <div className="mt-3"><LabToken /></div>
            </section>
            <section className="card p-5">
              <h2 className="font-display text-lg font-bold">2 · Start the lab</h2>
              <a
                href={`https://github.com/codespaces/new?repo=${lab.repo}&ref=main`}
                target="_blank"
                rel="noreferrer"
                className="pill mt-3 bg-[var(--ink)] text-white"
              >
                <Play className="h-3.5 w-3.5" /> Open in GitHub Codespaces <ExternalLink className="h-3 w-3" />
              </a>
              <p className="mt-2 text-xs text-[var(--ink-mute)]">
                Runs on GitHub&apos;s machines under your own GitHub account (free monthly hours apply). Add your token as the
                Codespaces secret <code>M4AI_LAB_TOKEN</code>, or run <code>make login</code> inside.
              </p>
              <details className="mt-3 text-sm">
                <summary className="inline-flex cursor-pointer items-center gap-1 font-semibold"><Laptop className="h-3.5 w-3.5" /> Run on your own machine</summary>
                <p className="mt-2 text-xs text-[var(--ink-soft)]">Needs Docker and VS Code with the Dev Containers extension.</p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--ink)] p-3 text-xs text-white">{local.join("\n")}</pre>
              </details>
            </section>
            <section className="card p-5">
              <h2 className="font-display text-lg font-bold">3 · Check and import</h2>
              <p className="mt-1 text-xs text-[var(--ink-mute)]">
                Run <code>make check</code> in the lab, then import <code>lab-report.json</code>. +10 XP per stage, +50 for the capstone.
              </p>
              <div className="mt-3"><LabReportImport labId={lab.id} stages={lab.stages.map((s) => ({ n: s.n, title: s.title }))} /></div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
