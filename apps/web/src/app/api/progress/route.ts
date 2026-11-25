import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseProgressState } from "@/lib/progress-merge";
import type { ProgressState } from "@/lib/progress";
import { getUserProgress, saveUserProgress } from "@/lib/progress-server";
import { getPool } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-schema";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), ".data", "progress");

async function deviceFilePath(deviceId: string) {
  const safe = deviceId.replace(/[^a-zA-Z0-9-]/g, "");
  await mkdir(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, `${safe}.json`);
}

// With a configured database (production), anonymous device progress lives in Postgres;
// the .data/progress file store is only the no-database local fallback.
const useDb = Boolean(process.env.DATABASE_URL);

function validDeviceId(deviceId: string): string | null {
  const safe = deviceId.replace(/[^a-zA-Z0-9-]/g, "");
  return safe.length >= 8 && safe.length <= 64 ? safe : null;
}

async function getDeviceProgress(deviceId: string): Promise<ProgressState | null> {
  const id = validDeviceId(deviceId);
  if (!id) return null;
  try {
    if (useDb) {
      await ensureDbSchema();
      const r = await getPool().query(`SELECT state FROM device_progress WHERE device_id = $1`, [id]);
      return r.rows[0] ? parseProgressState(r.rows[0].state) : null;
    }
    const raw = await readFile(await deviceFilePath(id), "utf8");
    return parseProgressState(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function saveDeviceProgress(deviceId: string, state: ProgressState): Promise<number> {
  const id = validDeviceId(deviceId);
  if (!id) throw new Error("Invalid deviceId");
  const syncedAt = Date.now();
  const payload = { ...state, syncedAt, updatedAt: syncedAt };
  if (useDb) {
    await ensureDbSchema();
    await getPool().query(
      `INSERT INTO device_progress (device_id, state, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (device_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
      [id, JSON.stringify(payload)],
    );
    return syncedAt;
  }
  await writeFile(await deviceFilePath(id), JSON.stringify(payload, null, 2), "utf8");
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
