import Link from "next/link";
import catalog from "@/content/lessons/catalog.json";
import { LessonsCatalog } from "@/components/marketing/LessonsCatalog";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/Reveal";
import { DEFAULT_LESSON_ID } from "@/lib/lessons";
import type { LessonCatalogEntry } from "@/lib/lesson-types";

export const metadata = {
  title: "Lessons — Math for AI",
  description: "Full curriculum roadmap — 503 lessons across 20 phases",
};

export default function LessonsPage() {
  const byPhase = new Map<number, LessonCatalogEntry[]>();
  for (const lesson of catalog.lessons) {
    const list = byPhase.get(lesson.phaseId) ?? [];
    list.push(lesson);
    byPhase.set(lesson.phaseId, list);
  }

  const phases = [...byPhase.entries()].sort(([a], [b]) => a - b) as [number, LessonCatalogEntry[]][];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <SiteHeader>
        <Link href={`/demo/${DEFAULT_LESSON_ID}`}>
          <Button size="sm">Start Phase 0</Button>
        </Link>
      </SiteHeader>

      <main className="mx-auto max-w-4xl px-6 pb-16">
        <Reveal>
          <h1 className="font-body text-3xl font-semibold">Lesson catalog</h1>
        </Reveal>
        <Reveal stagger={80}>
          <p className="mt-2 font-body text-[var(--ink-soft)]">
            Full roadmap compiled from{" "}
            <a
              href="https://github.com/rohitg00/ai-engineering-from-scratch"
              className="link-underline text-[var(--blueprint)] underline"
              target="_blank"
              rel="noreferrer"
            >
              ai-engineering-from-scratch
            </a>
            . Start at Phase 0 (setup & tooling), progress through math and ML, finish with Phase 19 capstones.
            Interactive lessons include code gates; previews show narrative until the harness ships.
          </p>
        </Reveal>

        <LessonsCatalog
          phases={phases}
          lessonCount={catalog.lessonCount ?? catalog.lessons.length}
          interactiveCount={catalog.interactiveCount ?? catalog.lessons.filter((l) => l.interactive).length}
        />
      </main>
    </div>
  );
}
