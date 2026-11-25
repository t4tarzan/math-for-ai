"use client";

import { useEffect } from "react";
import { markStep } from "@/lib/progress";

/** Remember that the learner opened this lesson (feeds "continue where you left off"). */
export function MarkVisited({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    markStep(lessonId, "read");
  }, [lessonId]);
  return null;
}
