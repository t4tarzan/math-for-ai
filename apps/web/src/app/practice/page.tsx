import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { PracticeBadges } from "@/components/practice/PracticeBadges";
import { SolvedMark } from "@/components/practice/SolvedMark";
import { COLLECTIONS, PRACTICE, SOURCE } from "@/lib/source-lessons";

export const metadata = {
  title: "Practice problems — Math for AI",
  description: "Write the function, run real checks in your browser, get told exactly what is wrong.",
};

export default function PracticeIndex() {
  const groups = COLLECTIONS.map((c) => ({ ...c, items: PRACTICE.filter((p) => p.collections.includes(c.id)) })).filter((g) => g.items.length);
  const ungrouped = PRACTICE.filter((p) => !p.collections.some((c) => COLLECTIONS.some((x) => x.id === c)));
  const lessonTitle = (id: string | null) => (id ? SOURCE.lessons.find((l) => l.id === id)?.title : undefined);

  return (
    <div className="paper-ruled min-h-screen text-[var(--ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <p className="eyebrow text-[var(--blueprint)]">{PRACTICE.length} problems · checks run in your browser</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Practice</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--ink-soft)]">
          Write one real piece of AI code: a loss, an update rule, an attention step. Four layers of checks (examples, properties, edge
          cases and a reference) tell you which part is wrong and why. Each problem links to the lesson that builds it.
        </p>

        {[...groups, ...(ungrouped.length ? [{ id: "more", title: "More", summary: "", items: ungrouped }] : [])].map((g) => (
          <section key={g.id} className="mt-10">
            <h2 className="font-display text-2xl font-bold">{g.title}</h2>
            {g.summary && <p className="mt-1 text-sm text-[var(--ink-soft)]">{g.summary}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((p) => (
                <Link key={p.id} href={`/practice/${p.id}`} className="card card-lift flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <PracticeBadges kind={p.kind} difficulty={p.difficulty} minutes={p.minutes} />
                    <SolvedMark id={p.id} />
                  </div>
                  <p className="mt-2 font-semibold leading-snug">{p.title}</p>
                  <p className="mt-1 flex-1 text-sm text-[var(--ink-soft)]">{p.summary}</p>
                  {lessonTitle(p.lessonId) && <p className="mt-3 truncate text-xs text-[var(--ink-mute)]">From: {lessonTitle(p.lessonId)}</p>}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
