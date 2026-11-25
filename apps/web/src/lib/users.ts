import { compare, hash } from "bcryptjs";
import { getPool } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-schema";

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: string;
}

export async function findUserByEmail(email: string): Promise<(DbUser & { password_hash: string | null }) | null> {
  await ensureDbSchema();
  const result = await getPool().query(
    `SELECT id, email, name, image, plan, password_hash FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email.trim()],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    image: row.image ? String(row.image) : null,
    plan: String(row.plan ?? "free"),
    password_hash: row.password_hash ? String(row.password_hash) : null,
  };
}

export async function createUserWithPassword(opts: {
  email: string;
  password: string;
  name?: string;
}): Promise<DbUser> {
  await ensureDbSchema();
  const email = opts.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("An account with this email already exists");
  }
  const password_hash = await hash(opts.password, 12);
  const result = await getPool().query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, image, plan`,
    [email, opts.name?.trim() || null, password_hash],
  );
  const row = result.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    image: row.image ? String(row.image) : null,
    plan: String(row.plan ?? "free"),
  };
}

export async function verifyUserPassword(
  email: string,
  password: string,
): Promise<DbUser | null> {
  const user = await findUserByEmail(email);
  if (!user?.password_hash) return null;
  const ok = await compare(password, user.password_hash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    plan: user.plan,
  };
}

export async function findOrCreateOAuthUser(opts: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  providerAccountId: string;
}): Promise<DbUser> {
  await ensureDbSchema();
  const email = opts.email.trim().toLowerCase();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const linked = await client.query(
      `SELECT u.id, u.email, u.name, u.image, u.plan
       FROM oauth_accounts o
       JOIN users u ON u.id = o.user_id
       WHERE o.provider = $1 AND o.provider_account_id = $2
       LIMIT 1`,
      [opts.provider, opts.providerAccountId],
    );
    if (linked.rows[0]) {
      await client.query("COMMIT");
      const row = linked.rows[0];
      return {
        id: String(row.id),
        email: String(row.email),
        name: row.name ? String(row.name) : null,
        image: row.image ? String(row.image) : null,
        plan: String(row.plan ?? "free"),
      };
    }

    let userId: string;
    const byEmail = await client.query(
      `SELECT id, email, name, image, plan FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    );
    if (byEmail.rows[0]) {
      userId = String(byEmail.rows[0].id);
      await client.query(
        `UPDATE users SET name = COALESCE(name, $2), image = COALESCE(image, $3) WHERE id = $1`,
        [userId, opts.name ?? null, opts.image ?? null],
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO users (email, name, image) VALUES ($1, $2, $3) RETURNING id`,
        [email, opts.name ?? null, opts.image ?? null],
      );
      userId = String(inserted.rows[0].id);
    }

    await client.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_account_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, provider_account_id) DO NOTHING`,
      [userId, opts.provider, opts.providerAccountId],
    );
    await client.query("COMMIT");

    const user = await findUserByEmail(email);
    if (!user) throw new Error("Failed to create OAuth user");
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      plan: user.plan,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
