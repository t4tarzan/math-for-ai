"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  return (
    <Show
      when="signed-in"
      fallback={
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
      }
    >
      <UserButton />
    </Show>
  );
}
