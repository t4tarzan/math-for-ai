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

/* ---------- practice problems (practice/<id> in the source repo) ---------- */
export interface PracticeProblem {
  id: string;
  title: string;
  summary: string;
  kind: "implement" | "research" | "train" | "lab" | string;
  difficulty: "easy" | "medium" | "hard" | string;
  tags: string[];
  minutes: number;
  entry: string[];
  collections: string[];
  timeLimitS: number;
  lessonId: string | null;
  paper: { title: string; authors: string; year: number; url: string } | null;
  budget: { steps?: number } | null;
  target: { metric: string; value: number } | null;
  problem: string;
  starter: string;
  tests: string;
  fixtures: string;
  support: string;
  hints: string[];
  notes: string;
  githubUrl: string;
}

type PracticeIndexItem = { id: string; title: string; summary: string; kind: string; difficulty: string; tags: string[]; minutes: number; lessonId: string | null; collections: string[] };
const SRC = manifest as unknown as { practice?: PracticeIndexItem[]; collections?: { id: string; title: string; summary: string }[] };
export const PRACTICE: PracticeIndexItem[] = SRC.practice ?? [];
export const COLLECTIONS = SRC.collections ?? [];

export async function loadPractice(id: string): Promise<PracticeProblem | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  try {
    const raw = await readFile(path.join(process.cwd(), "src/content/source/practice", `${id}.json`), "utf8");
    return JSON.parse(raw) as PracticeProblem;
  } catch {
    return null;
  }
}

export function practiceForLesson(lessonId: string) {
  return PRACTICE.filter((p) => p.lessonId === lessonId);
}

/* ---------- projects (projects/<id> in the source repo; built locally, stage by stage) ---------- */
export interface ProjectStage {
  n: number;
  id: string;
  title: string;
  summary: string;
  hours: number | null;
  difficulty: string | null;
  language: string | null;
  concepts: string[];
  doc: string;
}
export interface Project {
  id: string;
  title: string;
  level: number;
  levelName: string | null;
  tagline: string;
  summary: string;
  youWillBuild: string;
  hours: number | null;
  languages: string[];
  skills: string[];
  prerequisites: { title: string; lessonId: string | null }[];
  media: string[];
  demo: { command: string[]; cwd?: string } | null;
  stages: ProjectStage[];
  githubUrl: string;
  manifestHash: string;
}
export type ProjectIndexItem = {
  id: string;
  title: string;
  level: number;
  levelName: string | null;
  tagline: string;
  hours: number | null;
  languages: string[];
  stages: number;
  lessonIds: string[];
};
export const PROJECTS: ProjectIndexItem[] = (manifest as unknown as { projects?: ProjectIndexItem[] }).projects ?? [];
export const LEVEL_NAMES: Record<number, string> = { 1: "Starter", 2: "Builder", 3: "Engineer", 4: "Systems", 5: "Frontier" };

export async function loadProject(id: string): Promise<Project | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  try {
    const raw = await readFile(path.join(process.cwd(), "src/content/source/projects", `${id}.json`), "utf8");
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export function projectsForLesson(lessonId: string) {
  return PROJECTS.filter((p) => p.lessonIds.includes(lessonId));
}
