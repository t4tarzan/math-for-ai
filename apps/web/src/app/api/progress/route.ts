import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseProgressState } from "@/lib/progress-merge";
import type { ProgressState } from "@/lib/progress";
import { getUserProgress, saveUserProgress } from "@/lib/progress-server";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), ".data", "progress");

async function deviceFilePath(deviceId: string) {
  const safe = deviceId.replace(/[^a-zA-Z0-9-]/g, "");
  await mkdir(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, `${safe}.json`);
}

async function getDeviceProgress(deviceId: string): Promise<ProgressState | null> {
  try {
    const raw = await readFile(await deviceFilePath(deviceId), "utf8");
    return parseProgressState(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function saveDeviceProgress(deviceId: string, state: ProgressState): Promise<number> {
  const syncedAt = Date.now();
  const payload = { ...state, syncedAt, updatedAt: syncedAt };
  await writeFile(await deviceFilePath(deviceId), JSON.stringify(payload, null, 2), "utf8");
  return syncedAt;
}

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.id) {
    const state = await getUserProgress(session.user.id);
    return NextResponse.json({ ok: true, state, authenticated: true });
  }

  const deviceId = new URL(req.url).searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ ok: true, state: null, authenticated: false });
  }

  const state = await getDeviceProgress(deviceId);
  return NextResponse.json({ ok: true, state, authenticated: false });
}

export async function POST(req: Request) {
  let body: { deviceId?: string; state?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.state || typeof body.state !== "object") {
    return NextResponse.json({ ok: false, error: "state required" }, { status: 400 });
  }

  const parsed = parseProgressState(body.state);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Invalid progress state" }, { status: 400 });
  }

  const session = await auth();
  if (session?.user?.id) {
    try {
      const syncedAt = await saveUserProgress(session.user.id, parsed);
      return NextResponse.json({ ok: true, syncedAt, authenticated: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "write failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  const deviceId = body.deviceId;
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "Sign in or provide deviceId" }, { status: 401 });
  }

  try {
    const syncedAt = await saveDeviceProgress(deviceId, parsed);
    return NextResponse.json({ ok: true, syncedAt, authenticated: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "write failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
