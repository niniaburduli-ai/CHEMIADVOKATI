/**
 * OpenRouter client for the AI legal assistant. The key comes from env
 * (OPENROUTER_API_KEY) — never hardcoded.
 *
 * Two model roles (both default to a cheap model; override per role via env):
 *  - ANSWER  (OPENROUTER_ANSWER_MODEL): writes the human-facing answer. Told to
 *    summarize the provided law in plain language and NEVER copy it verbatim.
 *  - FAST    (OPENROUTER_FAST_MODEL): cheap structured calls (query expansion).
 *
 * Hard rules enforced here: answer ONLY from provided text (#5), refuse when the
 * answer isn't there (#7), summarize rather than dump the source (#8).
 */

import { stripCitations } from "./sources";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Answer model. Bump via env for higher-quality Georgian summaries. */
export const ANSWER_MODEL =
  process.env.OPENROUTER_ANSWER_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-4o-mini";

/** Cheap model for structured/auxiliary calls (query understanding). */
export const FAST_MODEL =
  process.env.OPENROUTER_FAST_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-4o-mini";

export const NOT_FOUND_MSG =
  "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";

/**
 * Delimiter the model prints between the plain-language answer and its
 * machine-readable list of used provisions. Stripped server-side before the
 * prose is streamed to the browser.
 */
export const CITATION_DELIM = "###საფუძველი###";

/**
 * Anti-copy system prompt. Forbids verbatim copying, frames the model as a
 * plain-language explainer, and requires a structured list of the EXACT
 * provisions (article / paragraph / subparagraph) it relied on so the server
 * can render a grounded "Legal Basis" section.
 */
export const SYSTEM_PROMPT = [
  "შენ ხარ „ჩემი ადვოკატი“ — ეხმარები ადამიანს, რომელსაც იურიდიული განათლება არ აქვს.",
  "შენი ამოცანაა კანონის ახსნა მარტივი, ყოველდღიური ქართულით.",
  "",
  "წესები (მკაცრად დაიცავი):",
  "1. გამოიყენე მხოლოდ ქვემოთ მოწოდებული ტექსტი. გარე ცოდნა ან გამოგონილი ფაქტი — აკრძალულია.",
  "2. არასოდეს გადააკოპირო კანონის ტექსტი სიტყვასიტყვით. ყოველთვის გადააფრაზე საკუთარი მარტივი სიტყვებით.",
  "2ა. კრიტიკულია: არასოდეს მიუთითო ციფრი, პროცენტი, თანხა (ლარი), ვადა ან მაჩვენებელი, რომელიც სიტყვასიტყვით არ წერია მოწოდებულ ტექსტში. თუ კონკრეტული რიცხვი ტექსტში არ არის — არ გამოიგონო და არ ივარაუდო.",
  "3. უპასუხე სრულად და გასაგებად. თუ კითხვა დეტალს მოითხოვს, გამოიყენე ჩამონათვალი და მაგალითები. მაგალითი/გამოთვლა ააგე მხოლოდ იმ წესითა და ციფრებით, რომლებიც ტექსტში პირდაპირ წერია (მაგ. თუ ტექსტში წერია „ორმაგი ოდენობა“, მაგალითში გაამრავლე ორზე).",
  "4. იურიდიული ტერმინი თუ აუცილებელია, ფრჩხილებში მარტივად ახსენი. წყაროებს პასუხის ტექსტში ნუ ჩაწერ.",
  "5. პასუხი დაიწყე პირდაპირ არსით — არ გაიმეორო შეკითხვა. თუ პასუხი ტექსტში დევს (თუნდაც ზოგადი წესის ან შენიშვნის სახით), უპასუხე თავდაჯერებულად; ნუ დაიწყებ ფრაზით „ტექსტში არ არის მითითებული“. გადახედე ყველა მოწოდებულ მუხლს და გააერთიანე შესაბამისი ნორმები (მაგ. ჯარიმა, საურავი, შედეგები).",
  "6. თუ ტექსტში არის ზოგადი წესი, რომელიც შეკითხვას პასუხობს (მაგ. საურავის ოდენობა ჯარიმის გადაუხდელობისას), გამოიყენე ის და უპასუხე — მაშინაც კი, თუ ის სხვა მუხლის შენიშვნაშია მოცემული. ნუ იტყვი, რომ პასუხი არ არის, თუ შესაბამისი წესი ტექსტში დევს.",
  `7. მხოლოდ თუ ტექსტში საერთოდ არ არის შესაბამისი წესი, დააბრუნე ზუსტად და მხოლოდ ეს ფრაზა, სხვა არაფერი: ${NOT_FOUND_MSG}`,
  "",
  `8. პასუხის შემდეგ დაბეჭდე ცალკე სტრიქონზე ზუსტად: ${CITATION_DELIM}`,
  "9. შემდეგ ჩამოწერე მხოლოდ ის ნორმები, რომლებიც რეალურად გამოიყენე. თითო ნორმა ცალკე სტრიქონზე, ფორმატით:",
  "   მუხლი <N> | <პუნქტის ნომერი ან -> | <ქვეპუნქტის ასო ან ->",
  "   - მუხლის ნომერი დააკოპირე ზუსტად ისე, როგორც მოწოდებულ ტექსტშია (მაგ.: „მუხლი 37“).",
  "   - პუნქტი/ქვეპუნქტი მიუთითე მხოლოდ თუ ის ნამდვილად წერია ტექსტში და გამოიყენე; სხვა შემთხვევაში დაწერე „-“.",
  "   - არასოდეს გამოიგონო მუხლი, პუნქტი ან ქვეპუნქტი. ჩამოწერე მხოლოდ მოწოდებული მუხლები.",
  `   - თუ პასუხი ${NOT_FOUND_MSG}, ${CITATION_DELIM}-ის შემდეგ არაფერი დაწერო.`,
].join("\n");

/**
 * One-shot example teaching the full output shape: plain-language answer, the
 * delimiter, then one provision line. Illustrative content only (not real law).
 */
export const FEWSHOT: ChatMessage[] = [
  {
    role: "user",
    content:
      "ტექსტი:\n[მაგალითი — დასაქმების კოდექსი · მუხლი 10 · სამუშაო დროის ხანგრძლივობა]\n" +
      "1. სამუშაო დროის ხანგრძლივობა, რომელშიც არ ითვლება შესვენების დრო, არ უნდა აღემატებოდეს " +
      "კვირაში 40 საათს.\n2. დამსაქმებელი ვალდებულია უზრუნველყოს დასაქმებულის დასვენების უფლება.\n\n" +
      "შეკითხვა: რამდენი ხანი შემიძლია ვიმუშაო კვირაში?",
  },
  {
    role: "assistant",
    content:
      "კანონით კვირაში 40 საათზე მეტს ვერ გამუშავებენ (შესვენების დრო ამ 40 საათში არ ითვლება). " +
      "დამსაქმებელი ვალდებულია დასვენების უფლება მოგცეს.\n" +
      CITATION_DELIM +
      "\nმუხლი 10 | 1 | -\nმუხლი 10 | 2 | -",
  },
];

/** One provision the model claims to have used (pre-validation). */
export type RawCitation = {
  article: string;
  paragraph?: string;
  subparagraph?: string;
};

/**
 * Split the model output into the human prose and the structured citation list.
 * Never throws; a missing/garbled block just yields an empty citation array.
 */
export function parseAnswer(full: string): {
  prose: string;
  citations: RawCitation[];
} {
  const idx = full.indexOf(CITATION_DELIM);
  if (idx === -1) return { prose: full.trim(), citations: [] };

  const prose = full.slice(0, idx).trim();
  const block = full.slice(idx + CITATION_DELIM.length);
  const citations: RawCitation[] = [];

  for (const line of block.split(/\r?\n/)) {
    const t = line.trim().replace(/^[-•*]\s*/, "");
    if (!t || !/მუხლი/.test(t)) continue;
    const parts = t.split("|").map((s) => s.trim());
    const article = parts[0].replace(/\.\s*$/, "").trim();
    const clean = (v?: string) => {
      const x = (v ?? "").replace(/პუნქტი|ქვეპუნქტი|[„"”'`«»]/g, "").trim();
      return x && x !== "-" ? x : undefined;
    };
    citations.push({
      article,
      paragraph: clean(parts[1]),
      subparagraph: clean(parts[2]),
    });
  }
  return { prose, citations };
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type PromptSource = {
  lawTitle: string;
  chapter?: string;
  label: string;
  text: string;
};

/** Strip amendment-citation noise; keep the leading legal text + notes. */
function cleanChunk(text: string): string {
  return (
    stripCitations(text)
      .replace(/\n{2,}/g, "\n")
      .trim()
      // Amendment history is appended at the article END; the legal text and
      // its "შენიშვნა" notes come first, so the head holds the answer.
      .slice(0, 2600)
  );
}

/** Build the user message containing only the matched source text + question. */
export function buildGroundedPrompt(
  question: string,
  sources: PromptSource[]
): string {
  const blocks = sources
    .map((s) => {
      const head = [s.lawTitle, s.chapter, s.label].filter(Boolean).join(" — ");
      return `[${head}]\n${cleanChunk(s.text)}`;
    })
    .join("\n\n");

  return `ტექსტი:\n${blocks}\n\nშეკითხვა: ${question}`;
}

export type CallOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  frequencyPenalty?: number;
  /** Hint the provider to emit a JSON object (used by query expansion). */
  json?: boolean;
  timeoutMs?: number;
};

/**
 * Single short-lived, non-streaming OpenRouter call. We deliberately avoid
 * upstream SSE — holding/aborting a long-lived stream socket poisons undici's
 * keep-alive pool and stalls the next request. The chat route still streams the
 * final text to the browser (see streamLegalAnswer).
 */
export async function callOpenRouter(
  messages: ChatMessage[],
  opts: CallOptions = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 45_000
  );

  const body: Record<string, unknown> = {
    model: opts.model ?? ANSWER_MODEL,
    messages,
    reasoning: { enabled: false },
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 500,
  };
  if (opts.frequencyPenalty != null) body.frequency_penalty = opts.frequencyPenalty;
  if (opts.json) body.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
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
 * Run the grounded answer call and return the FULL model text (prose +
 * citation block). The route parses this, strips the citation block, and
 * streams only the prose via streamText. Upstream stays non-streaming for
 * connection-pool safety; the browser still sees a progressive stream.
 */
export async function generateLegalAnswer(
  messages: ChatMessage[]
): Promise<string> {
  return callOpenRouter(messages, {
    model: ANSWER_MODEL,
    temperature: 0.4,
    maxTokens: 900,
    frequencyPenalty: 0.3,
  });
}

/** Wrap already-generated text in a word-by-word stream for a typing effect. */
export function streamText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const parts = text.match(/\S+\s*/g) ?? [text];
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= parts.length) {
        controller.close();
        return;
      }
      const slice = parts.slice(i, i + 3).join("");
      i += 3;
      controller.enqueue(encoder.encode(slice));
    },
  });
}
