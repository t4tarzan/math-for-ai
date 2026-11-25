import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pingDatabase, provisionLearnerWorkspace } from "@/lib/db";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST() {
  const ping = await pingDatabase();
  if (!ping.ok) {
    return NextResponse.json(
      {
        ok: false,
        stage: "database",
        error: ping.error,
        hint: "Start Postgres with `npm run infra:up` from the Math for AI project root.",
      },
      { status: 503 },
    );
  }

  const session = await auth();
  const jar = await cookies();
  let learnerId = session?.user?.id ?? jar.get("m4ai_learner")?.value;
  if (!learnerId) {
    learnerId = randomUUID();
  }

  const provision = await provisionLearnerWorkspace(learnerId);
  if (!provision.ok) {
    return NextResponse.json(
      { ok: false, stage: "migrate", error: provision.error },
      { status: 500 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:7790";

  const response = NextResponse.json({
    ok: true,
    stage: "live",
    url: `${baseUrl}/api/health/db`,
    database: {
      latencyMs: ping.latencyMs,
      version: ping.version,
      table: provision.table,
      rows: provision.rowCount,
    },
    learnerId,
  });

  if (!session?.user?.id && !jar.get("m4ai_learner")?.value) {
    response.cookies.set("m4ai_learner", learnerId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return response;
}
