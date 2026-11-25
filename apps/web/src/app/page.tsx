import Link from "next/link";
import katex from "katex";
import { ArrowRight, BookOpen, CheckCircle2, Cloud, FlaskConical, Rocket } from "lucide-react";
import catalog from "@/content/lessons/catalog.json";
import { EQUATIONS, PARTS, type PartId } from "@/content/equations";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Reveal } from "@/components/ui/Reveal";
import { EquationCard } from "@/components/home/EquationCard";
import { SignInRail } from "@/components/home/SignInRail";
import { HomeTabs } from "@/components/home/HomeTabs";
import { CourseCatalogue, type PhaseBlock } from "@/components/home/CourseCatalogue";
import type { LessonCatalogEntry } from "@/lib/lesson-types";

// One-line summaries from the source curriculum's phase READMEs (ai-engineering-from-scratch, MIT).
const PHASE_TAGLINES: Record<number, string> = {
  0: "Get your environment ready for everything that follows.",
  1: "The intuition behind every AI algorithm, through code, not textbooks.",
  2: "Classical machine learning is still the backbone of most production AI.",
  3: "Neural networks from first principles. No frameworks until you build one yourself.",
  4: "From pixels to understanding across image, video, and 3D.",
  5: "Language is the interface to intelligence. Master every layer.",
  6: "The other half of human communication. Hear, understand, speak.",
  7: "The architecture that changed everything. Understand every layer.",
  8: "Create images, video, audio, 3D, and more.",
  9: "Agents that learn by doing. The foundation of RLHF.",
  10: "Build, train, and understand large language models.",
  11: "Put LLMs to work in production applications.",
  12: "Models that see, hear, read, and reason across modalities.",
  13: "The interfaces between AI and the real world.",
  14: "The core of modern AI engineering. Build agents from first principles.",
  15: "Agents that run without human intervention, safely.",
  16: "Coordination, emergence, and collective intelligence.",
  17: "Ship AI to the real world. Scale, monitor, optimize.",
  18: "Build AI that helps humanity. Not optional.",
  19: "Prove everything you learned. Build portfolio-grade systems.",
};

const FLOW = [
  { icon: BookOpen, title: "Read", text: "The lesson in plain words, with the maths shown and the code beside it." },
  { icon: CheckCircle2, title: "Check", text: "A quick quiz before and after, so you know it stuck." },
  { icon: FlaskConical, title: "Practice", text: "Write the function in your browser; real tests tell you what is wrong." },
  { icon: Cloud, title: "Build on a cloud", text: "Capstones run on a local AWS emulator: Lambda, S3, queues, vector search." },
  { icon: Rocket, title: "Ship", text: "Host what you built and keep it in your portfolio." },
];

function renderTex(tex: string) {
  return katex.renderToString(tex, { displayMode: true, throwOnError: false, output: "html" });
}

export default function HomePage() {
  const lessons = catalog.lessons as LessonCatalogEntry[];
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const phaseMap = new Map<number, LessonCatalogEntry[]>();
  for (const l of lessons) phaseMap.set(l.phaseId, [...(phaseMap.get(l.phaseId) ?? []), l]);
  const phases: PhaseBlock[] = [...phaseMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, ls]) => ({
      id,
      name: ls[0]?.phaseName ?? `Phase ${id}`,
      tagline: PHASE_TAGLINES[id] ?? "",
      lessons: [...ls].sort((a, b) => a.lessonNumber - b.lessonNumber),
    }));
  const capstoneCount = phaseMap.get(19)?.length ?? 0;

  const mathPanel = (
    <div className="space-y-14">
      {([1, 2, 3] as PartId[]).map((part) => (
        <section key={part} id={`part-${part}`} className="anchor-target">
          <Reveal>
            <div className={`border-l-4 pl-4 ${part === 1 ? "border-[var(--part1)]" : part === 2 ? "border-[var(--part2)]" : "border-[var(--part3)]"}`}>
              <p
                className={`eyebrow font-semibold ${part === 1 ? "text-[var(--part1)]" : part === 2 ? "text-[var(--part2)]" : "text-[var(--part3)]"}`}
              >
                {PARTS[part].label}
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">{PARTS[part].title}</h2>
              <p className="mt-1 max-w-2xl text-[15px] text-[var(--ink-soft)]">{PARTS[part].blurb}</p>
            </div>
          </Reveal>
          <div className="mt-6 space-y-6">
            {EQUATIONS.filter((e) => e.part === part).map((eq) => (
              <EquationCard
                key={eq.slug}
                eq={eq}
                formulaHtml={renderTex(eq.tex)}
                lessonTitle={eq.lessonId ? byId.get(eq.lessonId)?.title : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      <Reveal>
        <section className="card overflow-hidden">
          <div className="p-5 sm:p-8">
            <h2 className="font-display text-2xl font-bold">Quick reference: from SQL rows to agent harnesses</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="eyebrow text-[var(--ink-mute)]">
                  <tr className="border-b border-[var(--rule)]">
                    <th className="py-2 pr-3 font-normal">Layer</th>
                    <th className="py-2 pr-3 font-normal">Equations</th>
                    <th className="py-2 pr-3 font-normal">The question it answers</th>
                    <th className="py-2 font-normal">What you tune</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--ink-soft)]">
                  {[
                    ["text-[var(--part1)]", "Database & classic ML", "Cosine, Bayes, sigmoid", "Which row matches, is it fraud, will they churn?", "features, priors, thresholds"],
                    ["text-[var(--part2)]", "LLM inference", "Attention, softmax T, KV cache", "How do tokens attend, sample and fit in memory?", "temperature, context length, KV heads"],
                    ["text-[var(--part3)]", "Agent harness", "Bellman, UCB1, pᴺ", "How does a multi-step loop explore and survive?", "verifiers, retries, discount γ"],
                  ].map(([cls, a, b, c, d]) => (
                    <tr key={a} className="border-b border-[var(--rule)] last:border-0">
                      <td className={`py-3 pr-3 font-semibold ${cls}`}>{a}</td>
                      <td className="py-3 pr-3">{b}</td>
                      <td className="py-3 pr-3">{c}</td>
                      <td className="py-3 font-mono text-xs">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section>
          <h2 className="font-display text-3xl font-bold tracking-tight">After you sign in</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-[var(--ink-soft)]">
            Every equation above has its lessons inside the course, and the capstones put them to work. Each lesson runs the same loop:
          </p>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {FLOW.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="card card-lift p-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--ink-mute)]">{i + 1}</span>
                  <Icon className="h-4 w-4 text-[var(--blueprint)]" />
                </div>
                <p className="mt-2 font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-soft)]">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <SiteHeader />

      <main className="mx-auto grid max-w-6xl gap-x-8 gap-y-8 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Hero */}
        <section className="min-w-0 lg:col-start-1">
          <Reveal>
            <p className="eyebrow text-[var(--blueprint)]">Applied engineering mathematics · {phases.length} phases</p>
          </Reveal>
          <Reveal stagger={80}>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              The math behind every AI system, <span className="text-[var(--blueprint)]">learned by building it.</span>
            </h1>
          </Reveal>
          <Reveal stagger={160}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
              You don&apos;t need to derive backpropagation on a chalkboard to ship great AI. But knowing the{" "}
              <strong className="text-[var(--ink)]">nine core equations</strong> behind vectors, transformers and agent loops turns
              black-box magic into predictable engineering. Learn them, then use them in real capstones.
            </p>
          </Reveal>
          <Reveal stagger={220}>
            <div className="mt-6 flex flex-wrap gap-2">
              {([1, 2, 3] as PartId[]).map((p) => (
                <a key={p} href={`#part-${p}`} className="pill hover:border-[var(--ink)] hover:text-[var(--ink)]">
                  <span className={`h-2 w-2 rounded-full ${p === 1 ? "bg-[var(--part1)]" : p === 2 ? "bg-[var(--part2)]" : "bg-[var(--part3)]"}`} />
                  {PARTS[p].title}
                </a>
              ))}
            </div>
          </Reveal>
          <Reveal stagger={280}>
            <dl className="mt-7 grid max-w-xl grid-cols-3 gap-3">
              {[
                [lessons.length, "lessons"],
                [phases.length, "phases"],
                [capstoneCount, "capstones"],
              ].map(([v, l]) => (
                <div key={l} className="card px-4 py-3">
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-3xl font-bold">{v}</dd>
                  <dd className="text-xs text-[var(--ink-mute)]">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        {/* Right rail: sticky on desktop, a normal block after the hero on phones */}
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-20">
            <SignInRail />
          </div>
        </div>

        {/* Figure + tabs */}
        <div className="min-w-0 lg:col-start-1">
          <Reveal>
            <figure>
              <iframe
                src="/figures/foundry.html"
                title="The learning foundry: a lesson card travels from reading to quiz, practice, a cloud lab and shipping"
                className="block aspect-[3/2] w-full rounded-2xl sm:aspect-[9/5.2]"
                loading="lazy"
              />
              <figcaption className="mt-2 px-1 text-xs leading-relaxed text-[var(--ink-mute)]">
                How a lesson moves through the course: read it, pass the quiz, prove it in practice, build it on the cloud lab, ship it.
              </figcaption>
            </figure>
          </Reveal>

          <div className="mt-10">
            <HomeTabs math={mathPanel} catalogue={<CourseCatalogue phases={phases} />} />
          </div>

          <Reveal className="mt-14">
            <section className="card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
              <div>
                <h2 className="font-display text-2xl font-bold">Start with Phase 0, or jump to the math</h2>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">Free to start. Sign in with Google to keep your progress.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/signup" className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white hover:bg-black">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/lessons" className="inline-flex h-11 items-center rounded-full border border-[var(--rule-strong)] bg-white px-5 text-sm font-semibold hover:border-[var(--ink)]">
                  Browse lessons
                </Link>
              </div>
            </section>
          </Reveal>
        </div>
      </main>

      <footer className="border-t border-[var(--rule)] py-8 text-center text-xs text-[var(--ink-mute)]">
        <p>
          Math for AI · a White Noise Academy course · lessons from{" "}
          <a className="underline hover:text-[var(--ink)]" href="https://github.com/rohitg00/ai-engineering-from-scratch" target="_blank" rel="noreferrer">
            ai-engineering-from-scratch
          </a>{" "}
          (MIT)
        </p>
      </footer>
    </div>
  );
}
