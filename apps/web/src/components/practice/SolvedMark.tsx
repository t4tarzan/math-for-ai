"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { getPracticePasses } from "@/lib/progress";

export function SolvedMark({ id }: { id: string }) {
  const [solved, setSolved] = useState(false);
  useEffect(() => {
    setSolved(Boolean(getPracticePasses()[id]));
  }, [id]);
  if (!solved) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      <Check className="h-3 w-3" /> Solved
    </span>
  );
}
