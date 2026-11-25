const KIND: Record<string, string> = {
  implement: "Implement",
  research: "Paper",
  train: "Train a model",
  lab: "Lab",
};
const DIFF: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  hard: "bg-rose-50 text-rose-700",
};

export function PracticeBadges({ kind, difficulty, minutes }: { kind: string; difficulty: string; minutes: number }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
      <span className={`rounded-full px-2 py-0.5 ${DIFF[difficulty] ?? "bg-[var(--bg-sunk)] text-[var(--ink-soft)]"}`}>{difficulty}</span>
      <span className="rounded-full bg-[var(--blueprint-tint)] px-2 py-0.5 text-[var(--blueprint)]">{KIND[kind] ?? kind}</span>
      <span className="text-[var(--ink-mute)]">~{minutes} min</span>
    </span>
  );
}
