import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getAppUserId } from "@/lib/current-user";
import { canUseLab, issueLabToken, labTokenStatus, revokeLabToken } from "@/lib/lab";

export const dynamic = "force-dynamic";

async function who() {
  const userId = await getAppUserId();
  if (!userId) return null;
  const u = await currentUser();
  const email = u?.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? null;
  return { userId, email, allowed: await canUseLab(email) };
}

/** Status: is there an active token, and may this learner use the lab? (never returns the token) */
export async function GET() {
  const w = await who();
  if (!w) return NextResponse.json({ signedIn: false }, { status: 401 });
  return NextResponse.json({ signedIn: true, allowed: w.allowed, token: await labTokenStatus(w.userId) });
}

/** Issue a token: replaces and revokes the previous one; the value is returned once. */
export async function POST() {
  const w = await who();
  if (!w) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  if (!w.allowed) return NextResponse.json({ error: "not_on_allow_list" }, { status: 403 });
  return NextResponse.json({ token: await issueLabToken(w.userId) }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE() {
  const w = await who();
  if (!w) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  await revokeLabToken(w.userId);
  return NextResponse.json({ revoked: true });
}
