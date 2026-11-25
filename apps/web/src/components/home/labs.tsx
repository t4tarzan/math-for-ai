"use client";

import { useMemo, useState, type ReactNode } from "react";

/* ---------- shared bits ---------- */

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  const { label, value, min, max, step, onChange, fmt } = props;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-xs text-[var(--ink-soft)]">
        <span>{label}</span>
        <span className="font-mono text-[var(--ink)]">{fmt ? fmt(value) : value}</span>
      </span>
      <input
        type="range"
        className="lab-range mt-1"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Result({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "good" | "warn" | "bad" }) {
  const toneCls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700"
        : tone === "bad"
          ? "bg-rose-50 text-rose-700"
          : "bg-[var(--bg-sunk)] text-[var(--ink-soft)]";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--rule)] bg-white px-3 py-2">
      <span className="text-xs text-[var(--ink-soft)]">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-lg font-semibold text-[var(--lab-accent)]">{value}</span>
        {note && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${toneCls}`}>{note}</span>}
      </span>
    </div>
  );
}

function Bars({ rows }: { rows: { label: ReactNode; p: number; hint?: string }[] }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex justify-between gap-2 font-mono text-[11px] text-[var(--ink-soft)]">
            <span className="truncate">
              {r.label} {r.hint && <span className="text-[var(--ink-mute)]">{r.hint}</span>}
            </span>
            <span className="text-[var(--ink)]">{(r.p * 100).toFixed(1)}%</span>
          </div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-[var(--bg-sunk)]">
            <div
              className="h-full rounded-full bg-[var(--lab-accent)] transition-[width] duration-300 ease-out"
              style={{ width: w100(Math.max(0.005, r.p)) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
/** CSS width from a 0..1 value, rounded so server and browser render the same string */
const w100 = (v: number) => `${(Math.max(0, Math.min(1, v)) * 100).toFixed(2)}%`;
const softmax = (zs: number[], t = 1) => {
  const m = Math.max(...zs.map((z) => z / t));
  const e = zs.map((z) => Math.exp(z / t - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
};

/* ---------- 1 · cosine ---------- */
function CosineLab() {
  const [a, setA] = useState(15);
  const [b, setB] = useState(35);
  const rad = (d: number) => (d * Math.PI) / 180;
  const score = Math.cos(rad(a - b));
  const vec = (deg: number, len: number) => [+(40 + len * Math.cos(rad(deg))).toFixed(2), +(70 - len * Math.sin(rad(deg))).toFixed(2)];
  const [ax, ay] = vec(a, 52);
  const [bx, by] = vec(b, 36);
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
      <div className="space-y-3">
        <Slider label="Product A direction" value={a} min={-180} max={180} step={1} onChange={setA} fmt={(v) => `${v}°`} />
        <Slider label="Product B direction" value={b} min={-180} max={180} step={1} onChange={setB} fmt={(v) => `${v}°`} />
        <div className="flex flex-wrap gap-2">
          {[
            ["Same taste", 20, 25],
            ["Unrelated", 0, 90],
            ["Opposite", 10, -170],
          ].map(([l, x, y]) => (
            <button
              key={l as string}
              type="button"
              className="pill hover:border-[var(--lab-accent)]"
              onClick={() => {
                setA(x as number);
                setB(y as number);
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <Result
          label={`Angle between them ${Math.abs(((a - b + 540) % 360) - 180)}°`}
          value={score.toFixed(3)}
          note={score > 0.8 ? "strong match" : score > 0.2 ? "weak match" : score > -0.2 ? "unrelated" : "opposite"}
          tone={score > 0.8 ? "good" : score > -0.2 ? "warn" : "bad"}
        />
      </div>
      <svg viewBox="0 0 120 120" className="w-full max-w-[150px] justify-self-center rounded-xl border border-[var(--rule)] bg-white" role="img" aria-label="The two vectors">
        <line x1="40" y1="8" x2="40" y2="112" stroke="var(--rule-strong)" strokeWidth="0.6" />
        <line x1="4" y1="70" x2="116" y2="70" stroke="var(--rule-strong)" strokeWidth="0.6" />
        <line x1="40" y1="70" x2={ax} y2={ay} stroke="var(--lab-accent)" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="40" y1="70" x2={bx} y2={by} stroke="#0f7a5c" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="40" cy="70" r="2.2" fill="var(--ink)" />
        <text x="6" y="14" fontSize="8" fill="var(--lab-accent)" fontFamily="monospace">A</text>
        <text x="16" y="14" fontSize="8" fill="#0f7a5c" fontFamily="monospace">B</text>
      </svg>
    </div>
  );
}

/* ---------- 2 · Bayes ---------- */
function BayesLab() {
  const [prior, setPrior] = useState(0.02);
  const [hit, setHit] = useState(0.85);
  const [fa, setFa] = useState(0.04);
  const post = (hit * prior) / (hit * prior + fa * (1 - prior));
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Slider label="Base fraud rate P(fraud)" value={prior} min={0.001} max={0.2} step={0.001} onChange={setPrior} fmt={(v) => pct(v)} />
        <Slider label="Signal when fraud P(flag | fraud)" value={hit} min={0.5} max={0.99} step={0.01} onChange={setHit} fmt={(v) => pct(v, 0)} />
        <Slider label="False alarm P(flag | honest)" value={fa} min={0.005} max={0.2} step={0.005} onChange={setFa} fmt={(v) => pct(v)} />
      </div>
      <Result
        label="Updated fraud risk P(fraud | flag)"
        value={pct(post)}
        note={post > 0.6 ? "hold for review" : post > 0.15 ? "step-up 2FA" : "let it through"}
        tone={post > 0.6 ? "bad" : post > 0.15 ? "warn" : "good"}
      />
    </div>
  );
}

/* ---------- 3 · sigmoid ---------- */
function SigmoidLab() {
  const [days, setDays] = useState(21);
  const [tickets, setTickets] = useState(2);
  // illustrative weights: inactivity and open tickets raise churn risk
  const z = 0.11 * days + 0.6 * tickets - 4;
  const p = 1 / (1 + Math.exp(-z));
  const pts = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const zz = -8 + (16 * i) / 60;
      out.push(`${(4 + (i / 60) * 152).toFixed(2)},${(56 - 48 / (1 + Math.exp(-zz))).toFixed(2)}`);
    }
    return out.join(" ");
  }, []);
  const px = +(4 + ((Math.max(-8, Math.min(8, z)) + 8) / 16) * 152).toFixed(2);
  const py = +(56 - 48 * p).toFixed(2);
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
      <div className="space-y-3">
        <Slider label="Days since last login" value={days} min={0} max={60} step={1} onChange={setDays} />
        <Slider label="Open support tickets" value={tickets} min={0} max={6} step={1} onChange={setTickets} />
        <Result
          label={`z = 0.11·days + 0.6·tickets − 4 = ${z.toFixed(2)}`}
          value={pct(p)}
          note={p > 0.6 ? "call this customer" : p > 0.3 ? "watch" : "healthy"}
          tone={p > 0.6 ? "bad" : p > 0.3 ? "warn" : "good"}
        />
      </div>
      <svg viewBox="0 0 160 64" className="w-full self-center rounded-xl border border-[var(--rule)] bg-white" role="img" aria-label="Sigmoid curve">
        <line x1="4" y1="32" x2="156" y2="32" stroke="var(--rule)" strokeDasharray="2 2" />
        <polyline points={pts} fill="none" stroke="var(--ink-mute)" strokeWidth="1.2" />
        <circle cx={px} cy={py} r="3.2" fill="var(--lab-accent)" className="transition-all duration-300" />
      </svg>
    </div>
  );
}

/* ---------- 4 · attention ---------- */
const TOKENS = ["The", "server", "crashed", "because", "it", "overheated"];
// tiny hand-made 3-d vectors so the dot products are easy to read
const Q: Record<string, number[]> = { it: [2.4, 0.4, 1.8], crashed: [0.6, 2.2, 0.4], overheated: [1.6, 1.8, 0.2] };
const K: number[][] = [
  [0.1, 0.0, 0.1],
  [1.3, 0.4, 0.8],
  [0.2, 1.2, 0.3],
  [0.1, 0.3, 0.0],
  [0.5, 0.1, 0.6],
  [0.6, 1.0, 0.2],
];
function AttentionLab() {
  const [q, setQ] = useState<"it" | "crashed" | "overheated">("it");
  const [scaled, setScaled] = useState(true);
  const scores = K.map((k) => k.reduce((s, x, i) => s + x * Q[q][i], 0) / (scaled ? Math.sqrt(3) : 1));
  const w = softmax(scores);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
        <span>Query token:</span>
        {(["it", "crashed", "overheated"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setQ(t)}
            className={`pill ${q === t ? "border-[var(--lab-accent)] text-[var(--lab-accent)]" : ""}`}
          >
            {t}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5">
          <input type="checkbox" checked={scaled} onChange={(e) => setScaled(e.target.checked)} /> divide by √d
        </label>
      </div>
      <Bars rows={TOKENS.map((t, i) => ({ label: t, p: w[i] }))} />
      <p className="text-[11px] text-[var(--ink-mute)]">
        Toy 3-dimensional keys and queries; real models use 64–128 dimensions per head, which is why the √d scaling matters.
      </p>
    </div>
  );
}

/* ---------- 5 · softmax temperature ---------- */
const NEXT = [
  { t: "active = 1", z: 4.2 },
  { t: "id = 7", z: 3.1 },
  { t: "deleted_at IS NULL", z: 2.3 },
  { t: "created_at > NOW()", z: 1.1 },
];
function TemperatureLab() {
  const [T, setT] = useState(0.7);
  const p = softmax(
    NEXT.map((n) => n.z),
    T,
  );
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between text-[11px] text-[var(--ink-mute)]">
        <span className="font-mono">Prompt: SELECT * FROM users WHERE …</span>
        <span>{T < 0.35 ? "near-deterministic" : T < 1.1 ? "balanced" : "creative"}</span>
      </div>
      <Slider label="Temperature T" value={T} min={0.1} max={2} step={0.05} onChange={setT} fmt={(v) => v.toFixed(2)} />
      <Bars rows={NEXT.map((n, i) => ({ label: n.t, hint: `z=${n.z}`, p: p[i] }))} />
    </div>
  );
}

/* ---------- 6 · KV cache ---------- */
function KvLab() {
  const [ctxK, setCtxK] = useState(32);
  const [gqa, setGqa] = useState(true);
  const [bits, setBits] = useState(16);
  const L = 32,
    dh = 128;
  const hkv = gqa ? 8 : 32;
  const perToken = 2 * L * hkv * dh * (bits / 8);
  const total = perToken * ctxK * 1024;
  const gib = total / 1024 ** 3;
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[var(--ink-mute)]">An 8B-class model: 32 layers, head size 128, weights ≈ 16 GB in 16-bit.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="Context length" value={ctxK} min={1} max={128} step={1} onChange={setCtxK} fmt={(v) => `${v}k tokens`} />
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <button type="button" className={`pill ${gqa ? "border-[var(--lab-accent)] text-[var(--lab-accent)]" : ""}`} onClick={() => setGqa(!gqa)}>
            {gqa ? "GQA: 8 KV heads" : "No GQA: 32 KV heads"}
          </button>
          {[16, 8].map((b) => (
            <button key={b} type="button" className={`pill ${bits === b ? "border-[var(--lab-accent)] text-[var(--lab-accent)]" : ""}`} onClick={() => setBits(b)}>
              {b}-bit cache
            </button>
          ))}
        </div>
      </div>
      <Result
        label={`${(perToken / 1024).toFixed(0)} KiB per token × ${ctxK}k tokens`}
        value={`${gib.toFixed(gib < 10 ? 2 : 1)} GiB`}
        note={gib > 16 ? "bigger than the model" : gib > 4 ? "plan for it" : "fits easily"}
        tone={gib > 16 ? "bad" : gib > 4 ? "warn" : "good"}
      />
    </div>
  );
}

/* ---------- 7 · Bellman ---------- */
function BellmanLab() {
  const [g, setG] = useState(0.9);
  const quick = 0.3; // small reward now
  const steps = 10; // full reward after 10 steps
  const patient = Math.pow(g, steps);
  const choose = patient > quick ? "finish the task" : "grab the quick win";
  return (
    <div className="space-y-3">
      <Slider label="Discount factor γ" value={g} min={0.5} max={0.999} step={0.001} onChange={setG} fmt={(v) => v.toFixed(3)} />
      <Bars
        rows={[
          { label: "Quick win now: +0.3 at t = 0", p: quick },
          { label: `Finish the task: +1 at t = ${steps}`, hint: `γ^${steps}`, p: patient },
        ]}
      />
      <Result label="The agent will" value={choose} tone={patient > quick ? "good" : "warn"} note={`switches at γ ≈ ${Math.pow(quick, 1 / steps).toFixed(3)}`} />
    </div>
  );
}

/* ---------- 8 · UCB1 ---------- */
const ARMS = [
  { name: "Prompt A", mean: 0.72, n: 40 },
  { name: "Prompt B", mean: 0.65, n: 8 },
  { name: "Prompt C", mean: 0.4, n: 2 },
];
function UcbLab() {
  const [c, setC] = useState(1.0);
  const N = ARMS.reduce((s, a) => s + a.n, 0);
  const scored = ARMS.map((a) => ({ ...a, bonus: c * Math.sqrt(Math.log(N) / a.n) }));
  const best = scored.reduce((b, a) => (a.mean + a.bonus > b.mean + b.bonus ? a : b));
  const max = Math.max(...scored.map((a) => a.mean + a.bonus));
  return (
    <div className="space-y-3">
      <Slider label="Exploration constant c" value={c} min={0} max={2} step={0.05} onChange={setC} fmt={(v) => v.toFixed(2)} />
      <div className="space-y-1.5">
        {scored.map((a) => (
          <div key={a.name}>
            <div className="flex justify-between font-mono text-[11px] text-[var(--ink-soft)]">
              <span>
                {a.name} <span className="text-[var(--ink-mute)]">win rate {a.mean} · tried {a.n}×</span>
              </span>
              <span className={a === best ? "font-semibold text-[var(--lab-accent)]" : "text-[var(--ink)]"}>{(a.mean + a.bonus).toFixed(2)}</span>
            </div>
            <div className="mt-0.5 flex h-2 overflow-hidden rounded-full bg-[var(--bg-sunk)]">
              <div className="h-full bg-[var(--ink-mute)] transition-[width] duration-300" style={{ width: w100(a.mean / max) }} />
              <div className="h-full bg-[var(--lab-accent)] opacity-60 transition-[width] duration-300" style={{ width: w100(a.bonus / max) }} />
            </div>
          </div>
        ))}
      </div>
      <Result label="Next try goes to" value={best.name} note={best.name === "Prompt A" ? "exploit" : "explore"} tone={best.name === "Prompt A" ? "good" : "warn"} />
    </div>
  );
}

/* ---------- 9 · p^N ---------- */
function ReliabilityLab() {
  const [p, setP] = useState(0.95);
  const [n, setN] = useState(15);
  const s = Math.pow(p, n);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="Per-step reliability p" value={p} min={0.8} max={0.999} step={0.001} onChange={setP} fmt={(v) => pct(v)} />
        <Slider label="Steps in the workflow N" value={n} min={1} max={50} step={1} onChange={setN} />
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-sunk)]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: w100(s), background: s > 0.9 ? "#0f7a5c" : s > 0.6 ? "#b4590c" : "#be123c" }}
        />
      </div>
      <Result
        label={`End-to-end success p^N`}
        value={pct(s)}
        note={s > 0.9 ? "production-ready" : s > 0.6 ? "add verifiers" : "needs harness guardrails"}
        tone={s > 0.9 ? "good" : s > 0.6 ? "warn" : "bad"}
      />
    </div>
  );
}

export const LABS: Record<string, { title: string; el: () => ReactNode }> = {
  "cosine-similarity": { title: "Two-vector angle matcher", el: () => <CosineLab /> },
  bayes: { title: "Checkout fraud updater", el: () => <BayesLab /> },
  sigmoid: { title: "Churn probability", el: () => <SigmoidLab /> },
  attention: { title: "Who does the token look at?", el: () => <AttentionLab /> },
  "softmax-temperature": { title: "Next-token reshaping", el: () => <TemperatureLab /> },
  "kv-cache": { title: "KV-cache calculator", el: () => <KvLab /> },
  bellman: { title: "Patient or greedy?", el: () => <BellmanLab /> },
  ucb1: { title: "Prompt bandit", el: () => <UcbLab /> },
  "reliability-decay": { title: "Agent loop decay", el: () => <ReliabilityLab /> },
};
