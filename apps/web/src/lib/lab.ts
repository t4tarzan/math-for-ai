import "server-only";
import { createHash, randomBytes } from "crypto";
import { getPool } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-schema";

/**
 * Cloud labs: lab tokens, the per-learner USD ledger and the caps (LABS-DESIGN §9.4–9.6).
 * Tokens are shown once and stored as SHA-256. One active token per learner; issuing replaces the old one.
 * Boundaries are UTC: the daily cap resets at 00:00 UTC, the monthly ceiling on the 1st.
 */
export interface LabConfig {
  daily_cap_usd: number;
  monthly_ceiling_usd: number;
  rate_per_min: number;
  default_model: string;
  embed_model: string;
  allow_list: string[];
}

const DEFAULTS: LabConfig = {
  daily_cap_usd: 0.25,
  monthly_ceiling_usd: 30,
  rate_per_min: 120, // one grading run makes ~32 calls in under a minute; 30/min failed it (2026-11-26). Cost is bounded by the USD caps.
  default_model: "mistralai/mistral-small-24b-instruct-2501", // non-reasoning (reasoning models return empty text)
  embed_model: "baai/bge-m3", // 1024 dimensions; recall@3 15/15 on the capstone set
  allow_list: [],
};

export async function labConfig(): Promise<LabConfig> {
  await ensureDbSchema();
  const rows = await getPool().query(`SELECT key, value FROM lab_config`);
  const cfg: Record<string, unknown> = { ...DEFAULTS };
  for (const r of rows.rows) cfg[r.key as string] = r.value;
  return cfg as unknown as LabConfig;
}

export async function setLabConfig(key: keyof LabConfig, value: unknown) {
  await ensureDbSchema();
  await getPool().query(
    `INSERT INTO lab_config (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)],
  );
}

/** Operators always have access; others need to be on the allow-list during the pilot. */
export function isLabAdmin(email: string | null | undefined) {
  const admins = (process.env.LAB_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && admins.includes(email.toLowerCase()));
}

export async function canUseLab(email: string | null | undefined) {
  if (!email) return false;
  if (isLabAdmin(email)) return true;
  const cfg = await labConfig();
  return cfg.allow_list.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function base62(bytes: Buffer) {
  const zero = BigInt(0);
  const base = BigInt(62);
  let n = BigInt("0x" + bytes.toString("hex"));
  let out = "";
  while (n > zero) {
    out = B62[Number(n % base)] + out;
    n /= base;
  }
  return out || "0";
}

/** Issue a new token (replaces and revokes any previous one). The plain value is returned once and never stored. */
export async function issueLabToken(userId: string) {
  await ensureDbSchema();
  const token = "m4ai_lab_" + base62(randomBytes(32));
  await getPool().query(
    `INSERT INTO lab_token (user_id, token_sha256, created_at, revoked_at) VALUES ($1, $2, NOW(), NULL)
     ON CONFLICT (user_id) DO UPDATE SET token_sha256 = EXCLUDED.token_sha256, created_at = NOW(), revoked_at = NULL`,
    [userId, sha256(token)],
  );
  return token;
}

export async function revokeLabToken(userId: string) {
  await ensureDbSchema();
  await getPool().query(`UPDATE lab_token SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}

export async function labTokenStatus(userId: string) {
  await ensureDbSchema();
  const r = await getPool().query(`SELECT created_at, revoked_at FROM lab_token WHERE user_id = $1`, [userId]);
  const row = r.rows[0];
  return row && !row.revoked_at ? { active: true, created_at: row.created_at as Date } : { active: false };
}

/** The learner behind a bearer token, or null if unknown or revoked. */
export async function userForToken(authorization: string | null) {
  const m = /^Bearer\s+(m4ai_lab_[0-9A-Za-z]{20,})$/.exec(authorization?.trim() ?? "");
  if (!m) return null;
  await ensureDbSchema();
  const r = await getPool().query(`SELECT user_id FROM lab_token WHERE token_sha256 = $1 AND revoked_at IS NULL`, [sha256(m[1])]);
  return r.rows[0] ? String(r.rows[0].user_id) : null;
}

function nextUtcMidnight(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

export type LimitResult = { ok: true; cfg: LabConfig } | { ok: false; status: 402 | 429; body: Record<string, unknown> };

/** Rate limit, the learner's daily cap and the global monthly ceiling, in that order. */
export async function checkLimits(userId: string): Promise<LimitResult> {
  const cfg = await labConfig();
  const pool = getPool();
  const rate = await pool.query(`SELECT COUNT(*)::int AS n FROM lab_ledger WHERE user_id = $1 AND at > NOW() - INTERVAL '60 seconds'`, [userId]);
  if (rate.rows[0].n >= cfg.rate_per_min) {
    return { ok: false, status: 429, body: { error: "rate_limited", retry_after_s: 60, limit_per_min: cfg.rate_per_min } };
  }
  const day = await pool.query(
    `SELECT COALESCE(SUM(cost_usd), 0)::float AS usd FROM lab_ledger WHERE user_id = $1 AND at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
    [userId],
  );
  if (day.rows[0].usd >= cfg.daily_cap_usd) {
    return { ok: false, status: 402, body: { error: "daily_cap", cap_usd: cfg.daily_cap_usd, resets_at: nextUtcMidnight() } };
  }
  const month = await pool.query(
    `SELECT COALESCE(SUM(cost_usd), 0)::float AS usd FROM lab_ledger WHERE at >= date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
  );
  if (month.rows[0].usd >= cfg.monthly_ceiling_usd) {
    return { ok: false, status: 402, body: { error: "monthly_ceiling", message: "The labs' monthly budget is used up. It resets on the 1st (UTC)." } };
  }
  return { ok: true, cfg };
}

export async function recordUsage(opts: {
  userId: string;
  route: string;
  model: string | null;
  usage: { prompt_tokens?: number; completion_tokens?: number; cost?: number } | null | undefined;
  status: number;
}) {
  await getPool().query(
    `INSERT INTO lab_ledger (user_id, route, model, tokens_in, tokens_out, cost_usd, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [opts.userId, opts.route, opts.model, opts.usage?.prompt_tokens ?? 0, opts.usage?.completion_tokens ?? 0, opts.usage?.cost ?? 0, opts.status],
  );
}

export async function spendSummary() {
  await ensureDbSchema();
  const pool = getPool();
  const [today, month, byUser] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(cost_usd),0)::float AS usd, COUNT(*)::int AS calls FROM lab_ledger WHERE at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`),
    pool.query(`SELECT COALESCE(SUM(cost_usd),0)::float AS usd, COUNT(*)::int AS calls FROM lab_ledger WHERE at >= date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`),
    pool.query(
      `SELECT u.email, COALESCE(SUM(l.cost_usd),0)::float AS usd, COUNT(*)::int AS calls FROM lab_ledger l JOIN users u ON u.id = l.user_id
       WHERE l.at >= date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' GROUP BY u.email ORDER BY usd DESC LIMIT 50`,
    ),
  ]);
  return { today: today.rows[0], month: month.rows[0], byUser: byUser.rows };
}

export function providerKey() {
  return process.env.LAB_OPENROUTER_API_KEY ?? "";
}
