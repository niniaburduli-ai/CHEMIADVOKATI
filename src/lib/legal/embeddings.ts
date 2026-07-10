/**
 * Cheap OpenRouter embeddings call used for semantic answer-cache matching
 * (see answer-cache.ts). text-embedding-3-small is ~150x cheaper per token
 * than the answer models, so paying for one embedding call is worth it if it
 * lets us skip a duplicate generation/web-search pipeline. Never throws — a
 * failed embed just means the caller treats it as a cache miss.
 */
const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings";

const EMBEDDING_MODEL = () =>
  process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL(), input: text }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const vector = json?.data?.[0]?.embedding;
    return Array.isArray(vector) ? vector : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Cosine similarity of two equal-length embedding vectors; 0 on any shape mismatch. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
