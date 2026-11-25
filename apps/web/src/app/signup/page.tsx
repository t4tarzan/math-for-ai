import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="font-display text-2xl text-[var(--blueprint)]">
          Math for AI
        </Link>
        <h1 className="mt-8 font-body text-2xl font-semibold">Create account</h1>
        <p className="mt-2 font-body text-sm text-[var(--ink-soft)]">
          Free to start — your progress saves to the cloud when you sign in.
        </p>
        <div className="mt-8 rounded-md border border-[var(--rule-soft)] bg-[var(--bg-surface)] p-6">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
