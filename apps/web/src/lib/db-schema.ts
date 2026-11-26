import { getPool } from "@/lib/db";

let schemaReady: Promise<void> | null = null;

export async function ensureDbSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = runMigrations().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function runMigrations() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        image TEXT,
        password_hash TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS oauth_accounts (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        UNIQUE (provider, provider_account_id)
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        state JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Sign-in moved to Clerk (2026-11-25): each row is linked to one Clerk user.
      ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

      -- Cloud labs (LABS-DESIGN §9.6). Boundaries are UTC.
      CREATE TABLE IF NOT EXISTS lab_token (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        token_sha256 TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS lab_ledger (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        route TEXT NOT NULL,
        model TEXT,
        tokens_in INT NOT NULL DEFAULT 0,
        tokens_out INT NOT NULL DEFAULT 0,
        cost_usd NUMERIC(12,8) NOT NULL DEFAULT 0,
        status INT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS lab_ledger_user_at ON lab_ledger (user_id, at);
      CREATE INDEX IF NOT EXISTS lab_ledger_at ON lab_ledger (at);
      CREATE TABLE IF NOT EXISTS lab_config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lab_report (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        capstone TEXT NOT NULL,
        capstone_hash TEXT NOT NULL,
        stages JSONB NOT NULL,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Signed-out learners: progress keyed by an anonymous browser device id.
      -- Serverless hosts (Vercel) have no durable disk, so this replaces .data/progress there.
      CREATE TABLE IF NOT EXISTS device_progress (
        device_id TEXT PRIMARY KEY,
        state JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}
