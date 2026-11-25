import Link from "next/link";
import { ArrowRight, CheckCircle2, Code2, Database, Rocket } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/Reveal";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <SiteHeader>
        <Link href="/demo">
          <Button size="sm">Try demo</Button>
        </Link>
      </SiteHeader>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <section className="py-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink-mute)]">
              Read it · Build it · Deploy it · Own it
            </p>
          </Reveal>
          <Reveal stagger={80}>
            <h1 className="mt-4 max-w-3xl font-body text-4xl font-semibold leading-tight sm:text-5xl">
              Learn AI engineering in one flow — from linear algebra to live SaaS.
            </h1>
          </Reveal>
          <Reveal stagger={160}>
            <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-[var(--ink-soft)]">
              No tab switching. No vibe coding. No disconnected textbooks. One workspace where you read,
              code, pass tests, deploy with a real database, and ship capstone products you own.
            </p>
          </Reveal>
          <Reveal stagger={240}>
            <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/demo">
            <Button>
              Start free demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
            <Link href="/lessons">
              <Button variant="secondary">Browse catalog</Button>
            </Link>
            </div>
          </Reveal>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Code2, title: "In-flow editor", desc: "Scrimba-style shell — code is the lesson." },
            { icon: CheckCircle2, title: "Mastery gates", desc: "Boot.dev-style tests before you advance." },
            { icon: Database, title: "Real deploy", desc: "Postgres, APIs, URLs — not toy sandboxes." },
            { icon: Rocket, title: "SaaS capstones", desc: "17+ production templates in your portfolio." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} stagger={i * 70}>
              <div className="card-lift rounded-md border border-[var(--rule-soft)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-hard)]">
                <Icon className="h-5 w-5 text-[var(--blueprint)]" />
                <h2 className="mt-3 font-body font-semibold">{title}</h2>
                <p className="mt-1 font-body text-sm text-[var(--ink-soft)]">{desc}</p>
              </div>
            </Reveal>
          ))}
        </section>

        <Reveal className="mt-16">
          <section className="rounded-md border border-[var(--rule-soft)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-hard)]">
            <h2 className="font-body text-2xl font-semibold">Join the waitlist</h2>
            <p className="mt-2 max-w-xl font-body text-[var(--ink-soft)]">
              Pro tier (full 503-lesson path) and Deploy tier (cloud workspaces + capstone rubrics) open
              soon.
            </p>
            <WaitlistForm className="mt-6 max-w-md" />
          </section>
        </Reveal>

        <Reveal className="mt-10">
          <section className="rounded-md border border-[var(--blueprint)] bg-[var(--blueprint-tint)] p-8">
            <h2 className="font-body text-2xl font-semibold">Vertical slice live</h2>
            <p className="mt-2 max-w-xl font-body text-[var(--ink-soft)]">
              Lesson 01 — Linear Algebra Intuition: motto → problem → interactive figure → implement{" "}
              <code className="font-mono text-sm">dot_product</code> in Pyodide → ship artifact.
            </p>
            <Link href="/demo" className="mt-6 inline-block">
              <Button variant="secondary">Open lesson demo (~8 min)</Button>
            </Link>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
