import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="font-display text-2xl text-[var(--blueprint)]">
          Math for AI
        </Link>
        <h1 className="mt-8 font-body text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 font-body text-sm text-[var(--ink-soft)]">
          Sync XP, streaks, and lesson progress across devices.
        </p>
        <div className="mt-8 space-y-6 rounded-md border border-[var(--rule-soft)] bg-[var(--bg-surface)] p-6">
          <GitHubSignInButton />
          <Suspense fallback={<p className="font-body text-sm text-[var(--ink-mute)]">Loading…</p>}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
