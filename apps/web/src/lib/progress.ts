import {
  computeLessonXp,
  evaluateBadges,
  todayKey,
  updateStreak,
  XP_PHASE_BONUS,
} from "@/lib/gamification";
import { mergeProgressStates } from "@/lib/progress-merge";

const STORAGE_KEY = "m4ai:progress:v2";
const LEGACY_KEY = "m4ai:progress:v1";

export interface LessonProgress {
  completedAt: number | null;
  lastStepId: string | null;
  visitedAt: number;
  code?: string;
  workspaceFiles?: Record<string, string>;
  attempts: number;
  firstPassAt: number | null;
  xpEarned: number;
  /** best quiz score per stage, from the source curriculum's quiz.json */
  quiz?: { pre?: QuizScore; post?: QuizScore };
  /** practice problems passed for this lesson: problem id -> first pass time */
  practice?: Record<string, number>;
}

export interface QuizScore {
  correct: number;
  total: number;
  at: number;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
  xp: number;
  streakDays: number;
  lastActiveDate: string | null;
  badges: string[];
  questsCompleted?: string[];
  /** staged projects (source projects/): stages ticked off, completion, imported runner report */
  projects?: Record<string, ProjectProgress>;
  updatedAt: number;
}

export interface ProjectProgress {
  stages: number[];
  completedAt: number | null;
  /** completed from the project runner's completion.json (vs. ticked by hand) */
  verifiedReport?: boolean;
}

function emptyLesson(): LessonProgress {
  return {
    completedAt: null,
    lastStepId: null,
    visitedAt: Date.now(),
    attempts: 0,
    firstPassAt: null,
    xpEarned: 0,
  };
}

function empty(): ProgressState {
  return {
    lessons: {},
    xp: 0,
    streakDays: 0,
    lastActiveDate: null,
    badges: [],
    updatedAt: 0,
  };
}

function migrateLegacy(raw: unknown): ProgressState {
  const state = empty();
  if (!raw || typeof raw !== "object") return state;
  const legacy = raw as { lessons?: Record<string, { completedAt?: number | null; lastStepId?: string | null; visitedAt?: number }> };
  for (const [id, lp] of Object.entries(legacy.lessons ?? {})) {
    state.lessons[id] = {
      ...emptyLesson(),
      completedAt: lp.completedAt ?? null,
      lastStepId: lp.lastStepId ?? null,
      visitedAt: lp.visitedAt ?? Date.now(),
    };
    if (lp.completedAt) state.xp += 25;
  }
  return state;
}

export function readProgress(): ProgressState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProgressState;
      if (parsed?.lessons) {
        return {
          ...empty(),
          ...parsed,
          badges: parsed.badges ?? [],
          questsCompleted: parsed.questsCompleted ?? [],
          streakDays: parsed.streakDays ?? 0,
        };
      }
    }
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const migrated = migrateLegacy(JSON.parse(legacyRaw));
      writeProgress(migrated);
      return migrated;
    }
    return empty();
  } catch {
    return empty();
  }
}

export function writeProgress(state: ProgressState, opts?: { skipSync?: boolean }) {
  if (typeof window === "undefined") return;
  state.updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!opts?.skipSync) {
      import("@/lib/progress-sync").then((m) => m.scheduleProgressSync());
    }
    window.dispatchEvent(new Event("m4ai:progress"));
  } catch {
    /* quota */
  }
}

function touchLesson(state: ProgressState, lessonId: string): LessonProgress {
  if (!state.lessons[lessonId]) {
    state.lessons[lessonId] = emptyLesson();
  }
  return state.lessons[lessonId];
}

export function markStep(lessonId: string, stepId: string) {
  const state = readProgress();
  const lesson = touchLesson(state, lessonId);
  lesson.lastStepId = stepId;
  lesson.visitedAt = Date.now();
  const withStreak = updateStreak(state);
  writeProgress(withStreak);
}

export function saveLessonCode(lessonId: string, code: string) {
  const state = readProgress();
  const lesson = touchLesson(state, lessonId);
  lesson.code = code;
  writeProgress(state);
}

export function getLessonCode(lessonId: string): string | undefined {
  return readProgress().lessons[lessonId]?.code;
}

export function getWorkspaceFiles(lessonId: string): Record<string, string> | undefined {
  return readProgress().lessons[lessonId]?.workspaceFiles;
}

export function saveWorkspaceFiles(lessonId: string, files: Record<string, string>) {
  const state = readProgress();
  const lesson = touchLesson(state, lessonId);
  lesson.workspaceFiles = files;
  const primary = Object.keys(files).find((k) => k.endsWith(".py")) ?? Object.keys(files)[0];
  if (primary) lesson.code = files[primary];
  writeProgress(state);
}

export function recordTestAttempt(lessonId: string): number {
  const state = readProgress();
  const lesson = touchLesson(state, lessonId);
  lesson.attempts += 1;
  writeProgress(state);
  return lesson.attempts;
}

export function recordTestPass(
  lessonId: string,
  opts: { xpReward?: number; rubric?: string; hasDeploy?: boolean },
): { xp: number; firstTry: boolean; totalXp: number } {
  const state = readProgress();
  const lesson = touchLesson(state, lessonId);
  const firstTry = lesson.attempts === 1 && !lesson.firstPassAt;
  if (!lesson.firstPassAt) lesson.firstPassAt = Date.now();

  const xp =
    lesson.xpEarned > 0
      ? 0
      : computeLessonXp({
          base: opts.xpReward,
          firstTry,
          hasDeploy: opts.hasDeploy ?? false,
          rubric: opts.rubric,
        });

  if (xp > 0) {
    lesson.xpEarned = xp;
    state.xp += xp;
  }

  writeProgress(state);
  return { xp, firstTry, totalXp: state.xp };
}

export function markLessonComplete(
  lessonId: string,
  opts?: { phaseId?: number; phaseLessonIds?: Record<number, string[]> },
) {
  const state = readProgress();
  const lesson = touchLesson(state, lessonId);
  if (!lesson.completedAt) lesson.completedAt = Date.now();

  if (opts?.phaseLessonIds && opts.phaseId !== undefined) {
    const ids = opts.phaseLessonIds[opts.phaseId] ?? [];
    const allDone = ids.every(
      (id) => id === lessonId || Boolean(state.lessons[id]?.completedAt),
    );
    if (allDone && ids.length > 0) {
      state.xp += XP_PHASE_BONUS;
    }
    state.badges = evaluateBadges(state, opts.phaseLessonIds);
  }

  const withStreak = updateStreak(state);
  writeProgress(withStreak);
}

export function isLessonComplete(lessonId: string): boolean {
  return Boolean(readProgress().lessons[lessonId]?.completedAt);
}

export function getResumeStepIndex(lessonId: string, steps: { id: string }[]): number {
  if (isLessonComplete(lessonId)) return 0;
  const lastStepId = readProgress().lessons[lessonId]?.lastStepId;
  if (!lastStepId) return 0;
  const idx = steps.findIndex((s) => s.id === lastStepId);
  return idx >= 0 ? idx : 0;
}

export function getCompletedCount(): number {
  return Object.values(readProgress().lessons).filter((l) => l.completedAt).length;
}

export function getProgressSummary() {
  const state = readProgress();
  return {
    xp: state.xp,
    streakDays: state.streakDays,
    badges: state.badges,
    completed: getCompletedCount(),
  };
}

/** Merge remote server state into local — keeps best progress from either side. */
export function mergeRemoteProgress(remote: ProgressState) {
  if (typeof window === "undefined") return;
  const local = readProgress();
  const merged = mergeProgressStates(local, remote);
  writeProgress(merged, { skipSync: true });
}

/** XP for passing a lesson's check-yourself quiz (>= 70%), once per lesson. */
export const XP_QUIZ_PASS = 15;

/**
 * Record a quiz attempt. Keeps the best score per stage. Passing the post-lesson quiz
 * for the first time awards XP and marks the lesson complete.
 */
export function recordQuiz(
  lessonId: string,
  stage: "pre" | "post",
  correct: number,
  total: number,
  opts?: { phaseId?: number; phaseLessonIds?: Record<number, string[]> },
): { passed: boolean; xpAwarded: number } {
  const state = readProgress();
  const lesson = touchLesson(state, lessonId);
  const prev = lesson.quiz?.[stage];
  const quiz = { ...(lesson.quiz ?? {}) };
  if (!prev || correct > prev.correct) quiz[stage] = { correct, total, at: Date.now() };
  lesson.quiz = quiz;
  lesson.visitedAt = Date.now();
  const passed = stage === "post" && total > 0 && correct / total >= 0.7;
  let xpAwarded = 0;
  if (passed && !lesson.completedAt) {
    xpAwarded = XP_QUIZ_PASS;
    state.xp += xpAwarded;
    lesson.xpEarned += xpAwarded;
  }
  writeProgress(state);
  if (passed) markLessonComplete(lessonId, opts);
  return { passed, xpAwarded };
}

export function getQuizScores(lessonId: string) {
  return readProgress().lessons[lessonId]?.quiz;
}

/** XP for passing every check of a practice problem, once per problem. */
export const XP_PRACTICE_PASS = 20;

export function recordPracticePass(lessonId: string, practiceId: string): { xpAwarded: number; first: boolean } {
  const state = readProgress();
  const lesson = touchLesson(state, lessonId);
  const done = { ...(lesson.practice ?? {}) };
  if (done[practiceId]) return { xpAwarded: 0, first: false };
  done[practiceId] = Date.now();
  lesson.practice = done;
  lesson.visitedAt = Date.now();
  state.xp += XP_PRACTICE_PASS;
  lesson.xpEarned += XP_PRACTICE_PASS;
  writeProgress(updateStreak(state));
  return { xpAwarded: XP_PRACTICE_PASS, first: true };
}

export function getPracticePasses(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of Object.values(readProgress().lessons)) Object.assign(out, l.practice ?? {});
  return out;
}

/** XP for each project stage ticked off, and a bonus when the whole project is done. */
export const XP_PROJECT_STAGE = 10;
export const XP_PROJECT_DONE = 50;

export function getProjectProgress(projectId: string): ProjectProgress {
  return readProgress().projects?.[projectId] ?? { stages: [], completedAt: null };
}

/** Tick or untick a stage. XP only for the first tick of a stage and the first completion. */
export function setProjectStage(projectId: string, stage: number, done: boolean, totalStages: number) {
  const state = readProgress();
  const projects = { ...(state.projects ?? {}) };
  const cur = projects[projectId] ?? { stages: [], completedAt: null };
  const had = cur.stages.includes(stage);
  const stages = done ? [...new Set([...cur.stages, stage])].sort((a, b) => a - b) : cur.stages.filter((s) => s !== stage);
  let xp = 0;
  if (done && !had) xp += XP_PROJECT_STAGE;
  let completedAt = cur.completedAt;
  if (!completedAt && stages.length >= totalStages) {
    completedAt = Date.now();
    xp += XP_PROJECT_DONE;
  }
  projects[projectId] = { ...cur, stages, completedAt };
  state.projects = projects;
  state.xp += xp;
  writeProgress(updateStreak(state));
  return { xp, progress: projects[projectId] };
}

/** Mark every stage done from a runner report (completion.json) that the page has already checked. */
export function importProjectReport(projectId: string, totalStages: number) {
  const state = readProgress();
  const projects = { ...(state.projects ?? {}) };
  const cur = projects[projectId] ?? { stages: [], completedAt: null };
  const all = Array.from({ length: totalStages }, (_, i) => i + 1);
  const newStages = all.filter((n) => !cur.stages.includes(n)).length;
  let xp = newStages * XP_PROJECT_STAGE;
  const completedAt = cur.completedAt ?? Date.now();
  if (!cur.completedAt) xp += XP_PROJECT_DONE;
  projects[projectId] = { stages: all, completedAt, verifiedReport: true };
  state.projects = projects;
  state.xp += xp;
  writeProgress(updateStreak(state));
  return { xp };
}

/**
 * Cloud labs: stages passed in an imported, self-checked grader report. Stored with the projects (key `lab:<id>`)
 * so it merges across devices the same way; +10 XP per stage passed the first time, +50 when every stage has passed.
 */
export function importLabStages(labId: string, passed: number[], totalStages: number) {
  const key = `lab:${labId}`;
  const state = readProgress();
  const projects = { ...(state.projects ?? {}) };
  const cur = projects[key] ?? { stages: [], completedAt: null };
  const fresh = passed.filter((n) => !cur.stages.includes(n));
  const stages = [...new Set([...cur.stages, ...passed])].sort((a, b) => a - b);
  let xp = fresh.length * XP_PROJECT_STAGE;
  let completedAt = cur.completedAt;
  if (!completedAt && stages.length >= totalStages) {
    completedAt = Date.now();
    xp += XP_PROJECT_DONE;
  }
  projects[key] = { stages, completedAt, verifiedReport: true };
  state.projects = projects;
  state.xp += xp;
  writeProgress(updateStreak(state));
  return { xp, fresh, progress: projects[key] };
}
