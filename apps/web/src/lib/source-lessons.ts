import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import manifest from "@/content/source/manifest.json";

/** Lessons synced from ai-engineering-from-scratch (scripts/sync-source.mjs). Read on the server only. */
export interface SourceLesson {
  id: string;
  phaseId: number;
  phaseName: string;
  lessonNumber: number;
  title: string;
  sourcePath: string;
  upstreamUrl: string;
  githubUrl: string;
  minutes: number;
  motto: string;
  meta: Record<string, string>;
  markdown: string;
  quiz: { pre: QuizItemData[]; post: QuizItemData[] } | null;
  code: { name: string; lang: string; content: string }[];
}

export interface QuizItemData {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const SOURCE = manifest;

export async function loadSourceLesson(id: string): Promise<SourceLesson | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  try {
    const raw = await readFile(path.join(process.cwd(), "src/content/source/lessons", `${id}.json`), "utf8");
    return JSON.parse(raw) as SourceLesson;
  } catch {
    return null;
  }
}

/** The lesson before and after this one across the whole course, in teaching order. */
export function neighbours(id: string) {
  const all = SOURCE.lessons;
  const i = all.findIndex((l) => l.id === id);
  return { prev: i > 0 ? all[i - 1] : null, next: i >= 0 && i < all.length - 1 ? all[i + 1] : null };
}

export function phaseOf(phaseId: number) {
  return SOURCE.phases.find((p) => p.id === phaseId);
}

export function phaseLessonIds(phaseId: number) {
  return SOURCE.lessons.filter((l) => l.phaseId === phaseId).map((l) => l.id);
}
