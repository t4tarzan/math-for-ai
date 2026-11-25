import { auth, currentUser } from "@clerk/nextjs/server";
import { getPool } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-schema";

/**
 * The signed-in learner's id in our own `users` table (UUID), or null when signed out.
 * Clerk owns sign-in; our table owns progress. The first request after a Clerk sign-in
 * creates the row (or links an existing row with the same verified email).
 */
export async function getAppUserId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await ensureDbSchema();
  const pool = getPool();
  const found = await pool.query(`SELECT id FROM users WHERE clerk_id = $1`, [clerkId]);
  if (found.rows[0]) return String(found.rows[0].id);

  const user = await currentUser();
  const primary = user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  const email = primary?.emailAddress?.toLowerCase();
  const verified = primary?.verification?.status === "verified";
  if (!email) return null;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

  // Link only when Clerk has verified the address, so nobody can claim another person's row.
  const r = await pool.query(
    verified
      ? `INSERT INTO users (email, name, image, clerk_id) VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
           WHERE users.clerk_id IS NULL
         RETURNING id`
      : `INSERT INTO users (email, name, image, clerk_id) VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
    [email, name, user?.imageUrl ?? null, clerkId],
  );
  if (r.rows[0]) return String(r.rows[0].id);
  // Email already linked to a different Clerk account: do not merge.
  return null;
}
