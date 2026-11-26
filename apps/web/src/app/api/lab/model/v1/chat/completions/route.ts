import { labProxy } from "@/lib/lab-proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  return labProxy(req, "chat");
}
