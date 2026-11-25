import { NextResponse } from "next/server";
import { createUserWithPassword } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? "";
  const name = body.name?.trim();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  try {
    const user = await createUserWithPassword({ email, password, name });
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Signup failed";
    const status = msg.includes("already exists") ? 409 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
