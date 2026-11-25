import { getPool } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-schema";
import { mergeProgressStates, parseProgressState } from "@/lib/progress-merge";
import type { ProgressState } from "@/lib/progress";

export async function getUserProgress(userId: string): Promise<ProgressState | null> {
  await ensureDbSchema();
  const result = await getPool().query(
    `SELECT state FROM user_progress WHERE user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row?.state) return null;
  return parseProgressState(row.state);
}

export async function saveUserProgress(userId: string, incoming: ProgressState): Promise<number> {
  await ensureDbSchema();
  const existing = await getUserProgress(userId);
  const merged = existing ? mergeProgressStates(incoming, existing) : incoming;
  merged.updatedAt = Date.now();
  const syncedAt = merged.updatedAt;

  await getPool().query(
    `INSERT INTO user_progress (user_id, state, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [userId, JSON.stringify(merged)],
  );

  return syncedAt;
}
