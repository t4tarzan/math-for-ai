"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function GitHubSignInButton() {
  if (!process.env.NEXT_PUBLIC_GITHUB_ENABLED) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          void signIn("github", { callbackUrl: "/lessons" });
        }}
      >
        Continue with GitHub
      </Button>
      <p className="text-center font-mono text-[10px] uppercase tracking-widest text-[var(--ink-mute)]">
        or email
      </p>
    </>
  );
}
