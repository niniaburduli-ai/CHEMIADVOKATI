import { openOpenRouterStream } from "./openrouter-stream-core";
import { extractCostUsd } from "./openrouter-usage";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = () =>
  process.env.OPENROUTER_ANSWER_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "google/gemini-2.5-flash";

/**
 * Streaming counterpart to `callOpenRouterChat` — opens the upstream
 * connection and resolves once it's confirmed live (HTTP 200), so callers
 * can still fall back to a clean error response if the connection itself
 * fails. Rejects with `OpenRouterConnectError` in that case; once resolved,
 * the generator yields content deltas as they arrive and returns the total
 * billed cost (USD) once the stream ends.
 */
export async function streamOpenRouterChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model?: string,
  maxTokens = 2500
) {
  return openOpenRouterStream(messages, {
    model: model ?? MODEL(),
    maxTokens,
  });
}

export async function callOpenRouterChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model?: string,
  maxTokens = 2500
): Promise<{ content: string; costUsd: number }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model ?? MODEL(),
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    costUsd: extractCostUsd(data),
  };
}
