/**
 * OpenRouter streaming client. Key comes from env (OPENROUTER_API_KEY) — never
 * hardcoded. The model is told to summarize ONLY the provided source text and
 * to refuse if the answer isn't there (hard rules #5, #7, #8).
 */

export const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const SYSTEM_PROMPT =
  "შენ ხარ იურიდიული კონსულტანტი. უპასუხე მხოლოდ მოწოდებული ტექსტის მიხედვით, " +
  "ქართულად, მოკლედ და მარტივად. ყოველთვის მიუთითე, რომელი მუხლი და პუნქტი " +
  "გამოიყენე (მაგ.: „მუხლი 32, პუნქტი 1“). თუ ტექსტში პასუხი არ არის, დაწერე: " +
  "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type PromptSource = {
  lawTitle: string;
  chapter?: string;
  label: string;
  text: string;
};

/** Strip amendment-citation lines and boilerplate that only confuse the model. */
function cleanChunk(text: string): string {
  return text
    // "საქართველოს 2020 წლის ... ორგანული კანონი №7177 – ვებგვერდი, ..."
    .replace(/საქართველოს\s+\d{4}\s+წლის[^\n]*?(ვებგვერდ|გაზეთ)[^\n]*\n?/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, 450);
}

/** Build the user message containing only the matched source text + question. */
export function buildGroundedPrompt(question: string, sources: PromptSource[]): string {
  const blocks = sources
    .map((s) => {
      const head = [s.lawTitle, s.chapter, s.label].filter(Boolean).join(" — ");
      return `[${head}]\n${cleanChunk(s.text)}`;
    })
    .join("\n\n");

  return `ტექსტი:\n${blocks}\n\nშეკითხვა: ${question}`;
}

/**
 * Calls OpenRouter with streaming enabled and returns a ReadableStream of plain
 * UTF-8 text chunks (the assistant's answer tokens). SSE parsing stays on the
 * server so the API key never reaches the client.
 */
async function callOpenRouter(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  // Non-streaming request/response: a single short-lived connection that is
  // released cleanly. We deliberately avoid upstream SSE — holding/aborting a
  // long-lived stream socket poisons undici's keep-alive pool and stalls the
  // next request. We still stream the result to the client (see route).
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), 45_000);

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        reasoning: { enabled: false },
        temperature: 0.3,
        max_tokens: 500,
        frequency_penalty: 0.2,
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

/**
 * Returns the grounded answer as a ReadableStream of UTF-8 text, emitted in
 * small slices so the client renders it progressively (streaming UX) while the
 * upstream OpenRouter call stays a robust non-streaming request.
 */
export async function streamLegalAnswer(
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const answer = await callOpenRouter(messages);
  const encoder = new TextEncoder();
  // Slice on word boundaries for a natural typing effect.
  const parts = answer.match(/\S+\s*/g) ?? [answer];
  let i = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= parts.length) {
        controller.close();
        return;
      }
      // Emit a few words per pull to keep it snappy.
      const slice = parts.slice(i, i + 3).join("");
      i += 3;
      controller.enqueue(encoder.encode(slice));
    },
  });
}
