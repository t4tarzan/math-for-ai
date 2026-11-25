import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <Link href="/" className="self-start font-display text-2xl text-[var(--blueprint)]">
          Math for AI
        </Link>
        <p className="mt-6 self-start font-body text-sm text-[var(--ink-soft)]">
          Free to start. Your progress saves to the cloud once you sign up.
        </p>
        <div className="mt-6">
          <SignUp routing="path" path="/signup" signInUrl="/signin" fallbackRedirectUrl="/lessons" />
        </div>
      </div>
    </div>
  );
}
