import "server-only";
import { checkLimits, providerKey, recordUsage, userForToken } from "@/lib/lab";

/**
 * The lab model proxy (LABS-DESIGN §9.4). Floci's Bedrock proxy backend and the capstone's Lambdas call it with a lab token.
 * It holds the provider key, maps any requested model to the lab's model, enforces the caps, and records USD cost from the
 * provider's own usage accounting (OpenRouter `usage.cost`).
 */
const UPSTREAM = "https://openrouter.ai/api/v1";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Kind = "chat" | "embeddings";

export async function labProxy(req: Request, kind: Kind) {
  const userId = await userForToken(req.headers.get("authorization"));
  if (!userId) return json(401, { error: "invalid_token", message: "Send your lab token as `Authorization: Bearer m4ai_lab_…`." });
  const key = providerKey();
  if (!key) return json(503, { error: "not_configured" });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const limits = await checkLimits(userId);
  if (!limits.ok) {
    await recordUsage({ userId, route: kind, model: null, usage: null, status: limits.status });
    return json(limits.status, limits.body);
  }
  const requested = typeof body.model === "string" ? body.model : null;
  const model = kind === "chat" ? limits.cfg.default_model : limits.cfg.embed_model;
  const stream = kind === "chat" && body.stream === true;
  const upstreamBody = { ...body, model, ...(kind === "chat" ? { usage: { include: true } } : {}) };

  const upstream = await fetch(`${UPSTREAM}/${kind === "chat" ? "chat/completions" : "embeddings"}`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(upstreamBody),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = (await upstream.text().catch(() => "")).slice(0, 300);
    await recordUsage({ userId, route: kind, model, usage: null, status: 502 });
    return json(502, { error: "upstream_error", status: upstream.status, detail });
  }

  if (!stream) {
    const out = (await upstream.json()) as Record<string, unknown> & { usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number } };
    await recordUsage({ userId, route: kind, model, usage: out.usage, status: 200 });
    if (requested && kind === "chat") out.model = requested; // the learner sees the model id they asked for
    return json(200, out);
  }

  // Streaming: pass every byte through; read the final `usage` chunk on the way and record it when the stream ends.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let tail = "";
  let usage: { prompt_tokens?: number; completion_tokens?: number; cost?: number } | undefined;
  const out = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        await recordUsage({ userId, route: "chat-stream", model, usage, status: 200 }).catch(() => {});
        controller.close();
        return;
      }
      tail += decoder.decode(value, { stream: true });
      const lines = tail.split("\n");
      tail = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
        try {
          const ev = JSON.parse(line.slice(6)) as { usage?: typeof usage };
          if (ev.usage) usage = ev.usage;
        } catch {
          /* keep streaming */
        }
      }
      controller.enqueue(value);
    },
    async cancel() {
      await reader.cancel().catch(() => {});
    },
  });
  return new Response(out, { status: 200, headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
}
