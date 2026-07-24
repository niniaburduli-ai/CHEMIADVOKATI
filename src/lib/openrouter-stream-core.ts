/** @module openrouter-stream-core
 *
 * Low-level SSE streaming client for OpenRouter's chat-completions endpoint.
 * Used by both the generic `ai-call.ts` helpers and the legal-specific
 * wrappers in `legal/openrouter.ts` — this is the ONLY place that talks HTTP
 * for streaming calls.
 *
 * Deliberately built on Node's core `https` module instead of `fetch` (which
 * the rest of this codebase uses for non-streaming OpenRouter calls). The
 * non-streaming path avoids upstream SSE specifically because holding/
 * aborting a long-lived stream socket on fetch's shared undici keep-alive
 * pool can poison that pool and stall unrelated requests. Using a completely
 * separate HTTP client (`https.request`) with a dedicated, non-keep-alive
 * `Agent` sidesteps that risk by construction: streaming sockets here never
 * share a pool with anything, and are closed (not returned to a pool) as
 * soon as each request ends.
 */

import https from "node:https";
import type { IncomingMessage } from "node:http";
import { extractCostUsd } from "./openrouter-usage";

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

/** Every streaming call gets its own socket, never reused/pooled. */
const streamAgent = new https.Agent({ keepAlive: false });

export type StreamChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StreamOptions = {
  model: string;
  /** Omit to let OpenRouter/the model use its own default (matches the
   * non-streaming `callOpenRouterChat`, which also never sends this field). */
  temperature?: number;
  maxTokens: number;
  frequencyPenalty?: number;
  /** Extra passthrough fields for the request body (e.g. `plugins`, `web_search_options`). */
  extraBody?: Record<string, unknown>;
  /** Abort if no data arrives for this long (ms). Resets on every chunk. Default 45s. */
  idleTimeoutMs?: number;
};

/** Thrown when the upstream connection never opens/returns 200 — safe to
 * fall back to a plain error response since no body has been sent yet. */
export class OpenRouterConnectError extends Error {}

/**
 * Open a streaming OpenRouter request and resolve once the upstream has
 * responded with HTTP 200 and the SSE body is ready to read. Rejects with
 * `OpenRouterConnectError` on any non-200 status or connection failure —
 * callers can safely return a normal JSON error response in that case,
 * since nothing has been streamed to their own client yet.
 */
export async function openOpenRouterStream(
  messages: StreamChatMessage[],
  opts: StreamOptions
): Promise<AsyncGenerator<string, number, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const body = JSON.stringify({
    model: opts.model,
    messages,
    max_tokens: opts.maxTokens,
    stream: true,
    usage: { include: true },
    ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    ...(opts.frequencyPenalty != null ? { frequency_penalty: opts.frequencyPenalty } : {}),
    ...(opts.extraBody ?? {}),
  });

  const res = await new Promise<IncomingMessage>((resolve, reject) => {
    const req = https.request(
      {
        hostname: OPENROUTER_HOST,
        path: OPENROUTER_PATH,
        method: "POST",
        agent: streamAgent,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Accept: "text/event-stream",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      resolve
    );
    req.on("error", (err) => reject(new OpenRouterConnectError(err.message)));
    req.end(body);
  });

  if (res.statusCode !== 200) {
    const detail = await readAll(res).catch(() => "");
    throw new OpenRouterConnectError(
      `OpenRouter stream error ${res.statusCode}: ${detail.slice(0, 300)}`
    );
  }

  return consumeSse(res, opts.idleTimeoutMs ?? 45_000);
}

async function readAll(res: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of res) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

/** Parse OpenRouter's `data: {...}\n\n` SSE frames into content deltas.
 * Returns the total billed cost (USD) as the generator's return value — it
 * arrives on the final usage-bearing frame before `[DONE]` (see
 * openrouter-usage.ts). 0 if the stream never carried a usage frame. */
async function* consumeSse(
  res: IncomingMessage,
  idleTimeoutMs: number
): AsyncGenerator<string, number, unknown> {
  res.setTimeout(idleTimeoutMs, () => res.destroy(new Error("OpenRouter stream idle timeout")));

  let buffer = "";
  let costUsd = 0;
  try {
    for await (const raw of res) {
      buffer += (raw as Buffer).toString("utf8");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          let json: unknown;
          try {
            json = JSON.parse(data);
          } catch {
            continue;
          }
          const delta = (
            json as { choices?: Array<{ delta?: { content?: string } }> }
          )?.choices?.[0]?.delta?.content;
          if (delta) yield delta;
          const cost = extractCostUsd(json);
          if (cost > 0) costUsd = cost;
        }
      }
    }
  } finally {
    res.destroy();
  }
  return costUsd;
}
