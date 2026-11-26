"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, ShieldOff } from "lucide-react";

type Status = { signedIn: false } | { signedIn: true; allowed: boolean; token: { active: boolean; created_at?: string } };

/** Issue (shown once), replace or revoke the learner's lab token. The token itself is never fetched back. */
export function LabToken() {
  const [st, setSt] = useState<Status | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    fetch("/api/lab/token", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSt)
      .catch(() => setErr("Could not reach the site. Try again."));
  useEffect(() => {
    load();
  }, []);

  const issue = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/lab/token", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error === "not_on_allow_list" ? "The labs are in a pilot. Ask to be added." : "Could not create a token.");
    setFresh(j.token);
    setCopied(false);
    load();
  };
  const revoke = async () => {
    setBusy(true);
    await fetch("/api/lab/token", { method: "DELETE" });
    setBusy(false);
    setFresh(null);
    load();
  };

  if (!st) return <p className="text-sm text-[var(--ink-mute)]">Checking…</p>;
  if (!st.signedIn)
    return (
      <p className="text-sm text-[var(--ink-soft)]">
        <Link href="/signin" className="font-semibold text-[var(--blueprint)] underline">Sign in</Link> to get your lab token.
      </p>
    );
  if (!st.allowed)
    return <p className="text-sm text-[var(--ink-soft)]">The labs are in a small pilot for now. Your account is not on the list yet.</p>;

  return (
    <div className="space-y-3 text-sm">
      {fresh ? (
        <div className="rounded-xl border border-[var(--blueprint)]/30 bg-white p-3">
          <p className="font-semibold">Your new lab token. Copy it now: it is shown only once.</p>
          <div className="mt-2 flex items-center gap-2">
            <code data-testid="lab-token" className="min-w-0 flex-1 break-all rounded bg-[var(--paper)] px-2 py-1 font-mono text-xs">{fresh}</code>
            <button
              type="button"
              className="pill shrink-0"
              onClick={() => navigator.clipboard.writeText(fresh).then(() => setCopied(true))}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--ink-mute)]">
            In the lab: <code>make login</code> and paste it, or save it as the Codespaces secret <code>M4AI_LAB_TOKEN</code>.
          </p>
        </div>
      ) : (
        <p className="text-[var(--ink-soft)]">
          {st.token.active
            ? `You have an active token (created ${new Date(st.token.created_at ?? "").toLocaleDateString()}). Lost it? Make a new one: the old one stops working.`
            : "No token yet. It lets your lab call the course's model, within a daily budget."}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={issue} className="pill bg-[var(--ink)] text-white disabled:opacity-50">
          <KeyRound className="h-3.5 w-3.5" /> {st.token.active ? "Make a new token" : "Create my lab token"}
        </button>
        {st.token.active && (
          <button type="button" disabled={busy} onClick={revoke} className="pill disabled:opacity-50">
            <ShieldOff className="h-3.5 w-3.5" /> Revoke
          </button>
        )}
      </div>
      {err && <p className="text-[var(--danger,#b42318)]">{err}</p>}
    </div>
  );
}
