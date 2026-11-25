import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { ProjectsLadder } from "@/components/projects/ProjectsLadder";
import { LEVEL_NAMES, PROJECTS } from "@/lib/source-lessons";

export const metadata = {
  title: "Projects — Math for AI",
  description: "Build real AI tools stage by stage, with tests at every stage. The ladder before the capstones.",
};

export default function ProjectsPage() {
  const stages = PROJECTS.reduce((s, p) => s + p.stages, 0);
  return (
    <div className="paper-ruled min-h-screen text-[var(--ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <p className="eyebrow text-[var(--blueprint)]">
          {PROJECTS.length} projects · {stages} tested stages · levels 1–5
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">The project ladder</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--ink-soft)]">
          Between the lessons and the capstones: real tools you build on your own machine, one tested stage at a time. Start at{" "}
          {LEVEL_NAMES[1]}, climb to {LEVEL_NAMES[5]}. Each project lists the lessons it builds on, and each stage has its own guide and
          tests.
        </p>
        <ProjectsLadder projects={PROJECTS} levelNames={LEVEL_NAMES} />
        <p className="mt-12 text-sm text-[var(--ink-soft)]">
          Top of the ladder:{" "}
          <Link href="/#catalogue" className="font-medium text-[var(--blueprint)] underline">
            the Phase 19 capstones
          </Link>
          , which you will build and host on a local AWS emulator.
        </p>
      </main>
    </div>
  );
}
