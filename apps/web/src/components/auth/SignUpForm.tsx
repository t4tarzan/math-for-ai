"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed");
        return;
      }
      router.push("/signin?registered=1");
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-700">
          {error}
        </p>
      )}
      <label className="block font-body text-sm">
        Name <span className="text-[var(--ink-mute)]">(optional)</span>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--rule-soft)] bg-[var(--bg-surface)] px-3 py-2 font-mono text-sm"
        />
      </label>
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
        Password <span className="text-[var(--ink-mute)]">(min 8 chars)</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--rule-soft)] bg-[var(--bg-surface)] px-3 py-2 font-mono text-sm"
        />
      </label>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center font-body text-sm text-[var(--ink-soft)]">
        Already have an account?{" "}
        <Link href="/signin" className="text-[var(--blueprint)] underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
