import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <Link href="/" className="self-start font-display text-2xl text-[var(--blueprint)]">
          Math for AI
        </Link>
        <p className="mt-6 self-start font-body text-sm text-[var(--ink-soft)]">
          Sign in to sync XP, streaks, and lesson progress across devices.
        </p>
        <div className="mt-6">
          <SignIn routing="path" path="/signin" signUpUrl="/signup" fallbackRedirectUrl="/lessons" />
        </div>
      </div>
    </div>
  );
}
