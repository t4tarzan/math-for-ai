"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export function AuthButton() {
  return (
    <Show
      when="signed-in"
      fallback={
        <div className="flex items-center gap-1 whitespace-nowrap sm:gap-2">
          <Link href="/signin" className="rounded-full px-2.5 py-1.5 text-sm text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)]">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-black"
          >
            Start free
          </Link>
        </div>
      }
    >
      <UserButton />
    </Show>
  );
}
