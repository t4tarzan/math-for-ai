"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-mute)]">
        …
      </span>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/signin">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link href="/signup" className="hidden sm:block">
          <Button size="sm">Sign up</Button>
        </Link>
      </div>
    );
  }

  const label = session.user.name ?? session.user.email ?? "Account";

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-[140px] truncate font-mono text-[10px] uppercase tracking-widest text-[var(--ink-mute)] sm:inline"
        title={session.user.email ?? undefined}
      >
        {label}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void signOut({ callbackUrl: "/" });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
