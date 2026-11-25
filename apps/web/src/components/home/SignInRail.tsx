"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Show, SignIn, useUser } from "@clerk/nextjs";
import { ArrowRight, Flame, Sparkles, Trophy } from "lucide-react";
import { getProgressSummary } from "@/lib/progress";
import { levelFromXp } from "@/lib/gamification";
import { DEFAULT_LESSON_ID } from "@/lib/lessons";

function Welcome() {
  const { user } = useUser();
  const [s, setS] = useState({ xp: 0, streakDays: 0, badges: [] as string[], completed: 0 });
  useEffect(() => {
    const read = () => setS(getProgressSummary());
    read();
    window.addEventListener("m4ai:progress", read);
    return () => window.removeEventListener("m4ai:progress", read);
  }, []);
  return (
    <div>
      <p className="eyebrow text-[var(--ink-mute)]">Signed in</p>
      <h2 className="mt-1 font-display text-2xl font-bold">Welcome back{user?.firstName ? `, ${user.firstName}` : ""}</h2>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          { icon: Trophy, v: `Lv ${levelFromXp(s.xp).level}`, l: "level" },
          { icon: Sparkles, v: s.xp, l: "XP" },
          { icon: Flame, v: `${s.streakDays}d`, l: "streak" },
        ].map(({ icon: Icon, v, l }) => (
          <div key={l} className="rounded-xl border border-[var(--rule)] bg-[var(--bg-surface-hover)] py-3">
            <Icon className="mx-auto h-4 w-4 text-[var(--blueprint)]" />
            <p className="mt-1 font-mono text-sm font-semibold">{v}</p>
            <p className="text-[11px] text-[var(--ink-mute)]">{l}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-[var(--ink-soft)]">{s.completed} lessons completed. Your progress syncs across devices.</p>
      <Link
        href="/lessons"
        className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--blueprint)] text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
      >
        Continue learning <ArrowRight className="h-4 w-4" />
      </Link>
      <Link href={`/demo/${DEFAULT_LESSON_ID}`} className="mt-2 block text-center text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
        or start at Phase 0
      </Link>
    </div>
  );
}

/** MatchFoundry-style right rail: sign in (Google first) or, once in, your progress. */
export function SignInRail() {
  return (
    <aside className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--part1)] via-[var(--part2)] to-[var(--part3)]" />
      <Show
        when="signed-in"
        fallback={
          <div>
            <p className="eyebrow text-[var(--ink-mute)]">Free to start</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Start learning</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Sign in with Google to save XP, streaks and lesson progress on every device. The lessons and the
              catalogue are open to browse first.
            </p>
            <div className="mt-4 flex justify-center [&_.cl-card]:shadow-none [&_.cl-rootBox]:w-full [&_.cl-cardBox]:w-full [&_.cl-cardBox]:shadow-none [&_.cl-cardBox]:border [&_.cl-cardBox]:border-[var(--rule)]">
              <SignIn routing="hash" signUpUrl="/signup" fallbackRedirectUrl="/lessons" />
            </div>
          </div>
        }
      >
        <Welcome />
      </Show>
      <div className="mt-6 border-t border-[var(--rule)] pt-4 text-xs leading-relaxed text-[var(--ink-mute)]">
        Lessons come from the open-source{" "}
        <a className="underline hover:text-[var(--ink)]" href="https://github.com/rohitg00/ai-engineering-from-scratch" target="_blank" rel="noreferrer">
          ai-engineering-from-scratch
        </a>{" "}
        curriculum (MIT). Capstones are built and hosted on a local AWS emulator.
      </div>
    </aside>
  );
}
