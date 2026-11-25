"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/lessons";
  const registered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {registered && (
        <p className="rounded-md border border-[var(--blueprint)] bg-[var(--blueprint-tint)] px-3 py-2 font-body text-sm text-[var(--blueprint)]">
          Account created — sign in to sync progress across devices.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-700">
          {error}
        </p>
      )}
      <label className="block font-body text-sm">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--rule-soft)] bg-[var(--bg-surface)] px-3 py-2 font-mono text-sm"
        />
      </label>
      <label className="block font-body text-sm">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--rule-soft)] bg-[var(--bg-surface)] px-3 py-2 font-mono text-sm"
        />
      </label>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center font-body text-sm text-[var(--ink-soft)]">
        No account?{" "}
        <Link href="/signup" className="text-[var(--blueprint)] underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
