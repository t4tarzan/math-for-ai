import type { LessonProgress, ProgressState, ProjectProgress } from "@/lib/progress";

function emptyLesson(): LessonProgress {
  return {
    completedAt: null,
    lastStepId: null,
    visitedAt: 0,
    attempts: 0,
    firstPassAt: null,
    xpEarned: 0,
  };
}

function emptyProgress(): ProgressState {
  return {
    lessons: {},
    xp: 0,
    streakDays: 0,
    lastActiveDate: null,
    badges: [],
    questsCompleted: [],
    updatedAt: 0,
  };
}

/** Merge two progress snapshots — keeps the best of each side. */
export function mergeProgressStates(local: ProgressState, remote: ProgressState): ProgressState {
  const merged: ProgressState = {
    ...emptyProgress(),
    xp: Math.max(local.xp ?? 0, remote.xp ?? 0),
    streakDays: Math.max(local.streakDays ?? 0, remote.streakDays ?? 0),
    badges: [...new Set([...(local.badges ?? []), ...(remote.badges ?? [])])],
    questsCompleted: [...new Set([...(local.questsCompleted ?? []), ...(remote.questsCompleted ?? [])])],
    projects: mergeProjects(local.projects, remote.projects),
    lessons: { ...local.lessons },
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
    lastActiveDate: local.lastActiveDate ?? remote.lastActiveDate ?? null,
  };

  for (const [id, remoteLesson] of Object.entries(remote.lessons ?? {})) {
    const localLesson = local.lessons[id] ?? emptyLesson();
    const pickLocal = localLesson.visitedAt >= (remoteLesson.visitedAt ?? 0);
    merged.lessons[id] = {
      ...localLesson,
      completedAt:
        localLesson.completedAt && remoteLesson.completedAt
          ? Math.min(localLesson.completedAt, remoteLesson.completedAt)
          : localLesson.completedAt ?? remoteLesson.completedAt ?? null,
      lastStepId: pickLocal ? localLesson.lastStepId : remoteLesson.lastStepId ?? localLesson.lastStepId,
      visitedAt: Math.max(localLesson.visitedAt, remoteLesson.visitedAt ?? 0),
      attempts: Math.max(localLesson.attempts, remoteLesson.attempts ?? 0),
      firstPassAt:
        localLesson.firstPassAt && remoteLesson.firstPassAt
          ? Math.min(localLesson.firstPassAt, remoteLesson.firstPassAt)
          : localLesson.firstPassAt ?? remoteLesson.firstPassAt ?? null,
      xpEarned: Math.max(localLesson.xpEarned, remoteLesson.xpEarned ?? 0),
      code: pickLocal ? localLesson.code : remoteLesson.code ?? localLesson.code,
      workspaceFiles: pickLocal
        ? localLesson.workspaceFiles
        : remoteLesson.workspaceFiles ?? localLesson.workspaceFiles,
      quiz: mergeQuiz(localLesson.quiz, remoteLesson.quiz),
      practice: mergePractice(localLesson.practice, remoteLesson.practice),
    };
  }

  return merged;
}

export function parseProgressState(raw: unknown): ProgressState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as ProgressState;
  if (!o.lessons || typeof o.lessons !== "object") return null;
  return {
    ...emptyProgress(),
    ...o,
    badges: o.badges ?? [],
    questsCompleted: o.questsCompleted ?? [],
  };
}

type QuizRecord = LessonProgress["quiz"];
function mergeQuiz(a: QuizRecord, b: QuizRecord): QuizRecord {
  if (!a) return b;
  if (!b) return a;
  const best = (x?: { correct: number }, y?: { correct: number }) =>
    !x ? y : !y ? x : y.correct > x.correct ? y : x;
  return { pre: best(a.pre, b.pre) as typeof a.pre, post: best(a.post, b.post) as typeof a.post };
}

function mergePractice(a?: Record<string, number>, b?: Record<string, number>) {
  if (!a) return b;
  if (!b) return a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = out[k] ? Math.min(out[k], v) : v;
  return out;
}

function mergeProjects(a?: Record<string, ProjectProgress>, b?: Record<string, ProjectProgress>) {
  if (!a) return b;
  if (!b) return a;
  const out: Record<string, ProjectProgress> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const x = out[k];
    if (!x) {
      out[k] = v;
      continue;
    }
    out[k] = {
      stages: [...new Set([...x.stages, ...v.stages])].sort((m, n) => m - n),
      completedAt: x.completedAt && v.completedAt ? Math.min(x.completedAt, v.completedAt) : (x.completedAt ?? v.completedAt),
      verifiedReport: Boolean(x.verifiedReport || v.verifiedReport),
    };
  }
  return out;
}
