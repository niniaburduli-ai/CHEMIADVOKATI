/** @module openrouter */
/**
 * OpenRouter client for the AI legal assistant. The key comes from env
 * (OPENROUTER_API_KEY) — never hardcoded.
 *
 * Model roles (cheap by default; override per role via env):
 *  - ANSWER         (OPENROUTER_ANSWER_MODEL): writes the human-facing answer.
 *    Tried FIRST for every question, regardless of topic. Told to summarize
 *    the provided law in plain language and NEVER copy it verbatim.
 *  - ANSWER_COMPLEX (OPENROUTER_ANSWER_MODEL_COMPLEX): the expensive/strong
 *    model, used ONLY as a retry when the ANSWER model's response fails to
 *    ground itself in a verified citation (see hasVerifiedCitation in
 *    citations.ts and the retry logic in app/api/chat/route.ts). Not an
 *    upfront guess based on topic/complexity — a fallback on demonstrated
 *    failure, so most traffic never touches it.
 *  - FAST           (OPENROUTER_FAST_MODEL): cheap structured calls (query
 *    expansion, one call per request).
 *  - WEB            (OPENROUTER_WEB_MODEL): web-search practical-context calls;
 *    defaults to a purpose-built cheap search model, not the answer model.
 *
 * Hard rules enforced here: answer ONLY from provided text (#5), refuse when the
 * answer isn't there (#7), summarize rather than dump the source (#8), stay
 * consistent across repeat questions (#6e), and ask a clarifying question
 * instead of guessing when a missing fact would change the answer (#6f).
 */

import { isAllowedHost, stripCitations } from "./sources";
import { openOpenRouterStream } from "../openrouter-stream-core";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Default answer model — cheap but capable, handles the common case. */
export const ANSWER_MODEL =
  process.env.OPENROUTER_ANSWER_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "google/gemini-2.5-flash";

/**
 * Strong/expensive escalation model — only used as a retry when the cheap
 * ANSWER model's response has no verified citation. Keep this the "premium"
 * model; everything else in this file defaults to cheap models to minimize
 * spend.
 */
export const ANSWER_MODEL_COMPLEX =
  process.env.OPENROUTER_ANSWER_MODEL_COMPLEX || "anthropic/claude-haiku-4.5";

/**
 * Free-tier escalation rungs, tried BEFORE the paid ANSWER_MODEL. Both are
 * OpenRouter ":free" models picked for usable Georgian output — most free
 * models garble Georgian grammar/case endings badly enough to be unusable
 * for legal answers. Free-tier requests are rate-limited and less reliable
 * at strict formatting than the paid tiers, so a throttled/retired/malformed
 * response here just falls through to the next rung via the same
 * citation-verification gate that already guards the cheap->complex
 * escalation (see hasVerifiedCitation + the tier loop in app/api/chat/route.ts)
 * — no separate error handling needed.
 */
export const ANSWER_MODEL_FREE_1 =
  process.env.OPENROUTER_ANSWER_MODEL_FREE_1 ||
  "google/gemini-2.0-flash-exp:free";
export const ANSWER_MODEL_FREE_2 =
  process.env.OPENROUTER_ANSWER_MODEL_FREE_2 ||
  "deepseek/deepseek-chat-v3.1:free";

/**
 * Escalation ladder for the grounded answer call. Tried in order (see the
 * tier loop in app/api/chat/route.ts) until one produces a verified-citation
 * answer; the last rung's output is accepted even if still unverified.
 */
export type AnswerTier = "free1" | "free2" | "cheap" | "complex";
export const ANSWER_TIER_ORDER: AnswerTier[] = [
  "free1",
  "free2",
  "cheap",
  "complex",
];

function modelForTier(tier: AnswerTier): string {
  switch (tier) {
    case "free1":
      return ANSWER_MODEL_FREE_1;
    case "free2":
      return ANSWER_MODEL_FREE_2;
    case "cheap":
      return ANSWER_MODEL;
    case "complex":
      return ANSWER_MODEL_COMPLEX;
  }
}

/** Cheap model for structured/auxiliary calls (query understanding). */
export const FAST_MODEL =
  process.env.OPENROUTER_FAST_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "google/gemini-2.5-flash-lite";

/**
 * Shared strict-brevity instruction, reused verbatim by the generate/review/
 * improve prompts (each a separate feature/quota) so all three cut filler
 * and token spend the same way without duplicating the wording.
 */
export const STRICT_BREVITY_RULE =
  "მკაცრი ლაკონურობა ტოკენების დაზოგვისთვის: არავითარი შესავალი ფრაზა, თავაზიანობა, გამეორება ან დასკვნითი შეჯამება. მხოლოდ პირდაპირი, კონკრეტული შინაარსი — თითოეული წინადადება ახალ ინფორმაციას უნდა ატარებდეს.";

export const NOT_FOUND_MSG =
  "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";

/**
 * Distinct from NOT_FOUND_MSG: shown when the pipeline itself failed
 * (matsne unreachable, both draft model attempts errored) rather than when
 * it ran cleanly and found nothing. Never counts against consultation quota
 * (the route returns before the decrement code in either case).
 */
export const TECHNICAL_ERROR_MSG =
  "ტექნიკური შეფერხება იურიდიულ რეესტრთან დაკავშირებისას — გთხოვთ სცადოთ მოგვიანებით.";

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
  "შენ ხარ „ჩემი იურისტი\" — ეხმარები ადამიანს, რომელსაც იურიდიული განათლება არ აქვს.",
  "შენი ამოცანაა კანონის ახსნა მარტივი, ყოველდღიური ენით.",
  "",
  "LANGUAGE RULE (highest priority): Detect the language of the user's question.",
  "If the question is in English — respond entirely in English, translating all Georgian legal content into clear English.",
  "If the question is in Georgian — respond entirely in Georgian.",
  "This language rule applies to all parts of your answer EXCEPT the special sentinel phrase in rule 7, which must always be output exactly as written regardless of language.",
  "The few-shot example below uses Georgian to illustrate the citation format only — your response language always follows the user's question language.",
  "",
  "წესები (მკაცრად დაიცავი):",
  "1. სამართლებრივი დასკვნა და ციფრები ააგე მხოლოდ ქვემოთ მოწოდებული კანონის ტექსტიდან. გამოგონილი ფაქტი ან მუხლი — აკრძალულია. (დამატებითი პრაქტიკული კონტექსტის გამოყენების წესი — იხ. წესი 10.)",
  "2. არასოდეს გადააკოპირო კანონის ტექსტი სიტყვასიტყვით. ყოველთვის გადააფრაზე საკუთარი მარტივი სიტყვებით.",
  "2ა. კრიტიკულია: არასოდეს მიუთითო ციფრი, პროცენტი, თანხა (ლარი), ვადა ან მაჩვენებელი, რომელიც სიტყვასიტყვით არ წერია მოწოდებულ ტექსტში. თუ კონკრეტული რიცხვი ტექსტში არ არის — არ გამოიგონო და არ ივარაუდო.",
  "3. უპასუხე სრულად და გასაგებად. თუ კითხვა დეტალს მოითხოვს, გამოიყენე ჩამონათვალი და მაგალითები. მაგალითი/გამოთვლა ააგე მხოლოდ იმ წესითა და ციფრებით, რომლებიც ტექსტში პირდაპირ წერია (მაგ. თუ ტექსტში წერია „ორმაგი ოდენობა\", მაგალითში გაამრავლე ორზე).",
  "4. იურიდიული ტერმინი თუ აუცილებელია, ფრჩხილებში მარტივად ახსენი. წყაროებს პასუხის ტექსტში ნუ ჩაწერ.",
  "5. პასუხი დაიწყე პირდაპირ არსით — არ გაიმეორო შეკითხვა. თუ პასუხი ტექსტში დევს (თუნდაც ზოგადი წესის ან შენიშვნის სახით), უპასუხე თავდაჯერებულად; ნუ დაიწყებ ფრაზით „ტექსტში არ არის მითითებული\". გადახედე ყველა მოწოდებულ მუხლს და გააერთიანე შესაბამისი ნორმები (მაგ. ჯარიმა, საურავი, შედეგები).",
  "6. თუ ტექსტში არის ზოგადი წესი, რომელიც შეკითხვას პასუხობს (მაგ. საურავის ოდენობა ჯარიმის გადაუხდელობისას), გამოიყენე ის და უპასუხე — მაშინაც კი, თუ ის სხვა მუხლის შენიშვნაშია მოცემული. ნუ იტყვი, რომ პასუხი არ არის, თუ შესაბამისი წესი ტექსტში დევს.",
  "6ა. კრიტიკულია — ინდექსირებული მუხლები (მაგ. 156¹, 156², 156³) დამოუკიდებელი, ცალკე სამართლებრივი დებულებებია. არასოდეს გაიგივო ან გააერთიანო ძირითად მუხლთან. თუ ძირითადი მუხლი მიმართავს ინდექსირებულ მუხლებს, თითოეული ცალ-ცალკე განიხილე.",
  "6ბ. სანამ დასკვნას გამოიტანდე — სისტემატურად გაიარე ყველა მოწოდებული მუხლი, პუნქტი, ქვეპუნქტი, შენიშვნა, გამონაკლისი, ინდექსირებული მუხლი. თუ ერთი მუხლი მიმართავს სხვა მუხლს, ისიც გაიარე. ნუ შეჩერდები პირველ შესაბამის ნორმაზე.",
  "6გ. ნუ განაცხადებ, რომ კანონი პასუხს არ იძლევა, თუ ყველა შესაბამისი დებულება სრულად არ გაქვს განხილული.",
  "6დ. კრიტიკულია — ყველა შეკითხვაზე ერთიანი, არაწინააღმდეგობრივი, სრული პასუხი დაწერე. განსხვავებული ვარიანტები ან 'შესაძლოა' ფრაზები — მხოლოდ მაშინ, თუ კანონი ნამდვილად რამდენიმე ვარიანტს ითვალისწინებს.",
  "6ე. თანმიმდევრულობა (კრიტიკულია): იდენტურ ან თემატურად ერთნაირ შეკითხვას იმავე მოწოდებული ტექსტით ყოველთვის ერთი და იგივე კონკრეტული პასუხი გაეცე — იგივე ციფრი, ვადა და დასკვნა. არასოდეს მისცე ერთხელ კონკრეტული თანხა/ვადა და მეორედ ბუნდოვანი ან განსხვავებული ჩამოყალიბება ერთსა და იმავე ფაქტობრივ ვითარებაზე.",
  "6ვ. თუ მოწოდებული ტექსტი არასაკმარისია ცალსახა პასუხისთვის, რადგან აკლია მომხმარებლის ფაქტობრივი დეტალი (მაგ. თარიღი, თანხის ტიპი, მხარის სტატუსი, რომელი ორგანოა ჩართული) და ეს დეტალი პასუხს შეცვლიდა — არ გამოიცნო და არ გასცე ბუნდოვანი პასუხი. ამის ნაცვლად დაუსვი ერთი, კონკრეტული და მოკლე დაზუსტების შეკითხვა, ჩამონათვალის სახით (თუ ერთზე მეტი დეტალია საჭირო) — ${CITATION_DELIM}-ის და შემდეგი ბლოკის გარეშე.",
  `7. მხოლოდ თუ ტექსტში საერთოდ არ არის შესაბამისი წესი, დააბრუნე ზუსტად და მხოლოდ ეს ფრაზა, სხვა არაფერი: ${NOT_FOUND_MSG}`,
  "",
  `8. პასუხის შემდეგ დაბეჭდე ცალკე სტრიქონზე ზუსტად: ${CITATION_DELIM}`,
  "9. შემდეგ ჩამოწერე მხოლოდ ის ნორმები, რომლებიც რეალურად გამოიყენე. თითო ნორმა ცალკე სტრიქონზე, ფორმატით:",
  "   მუხლი <N> | <პუნქტის ნომერი ან -> | <ქვეპუნქტის ასო ან ->",
  "   - მუხლის ნომერი დააკოპირე ზუსტად ისე, როგორც მოწოდებულ ტექსტშია (მაგ.: „მუხლი 37\", „მუხლი 156¹\").",
  "   - ინდექსირებული მუხლები (156¹, 156², 156³) მიუთითე ზუსტი ინდექსით — არ შეამოკლო.",
  "   - პუნქტი/ქვეპუნქტი მიუთითე მხოლოდ თუ ის ნამდვილად წერია ტექსტში და გამოიყენე; სხვა შემთხვევაში დაწერე „-\".",
  "   - არასოდეს გამოიგონო მუხლი, პუნქტი ან ქვეპუნქტი. ჩამოწერე მხოლოდ მოწოდებული მუხლები.",
  "   - თუ ერთი კანონის მრავალი მუხლი გამოიყენე, ყველა ჩამოწერე ცალ-ცალკე.",
  `   - თუ პასუხი ${NOT_FOUND_MSG}, ${CITATION_DELIM}-ის შემდეგ არაფერი დაწერო.`,
  "",
  '10. შესაძლოა ბოლოს იყოს ბლოკი „დამატებითი პრაქტიკული კონტექსტი (ვებ-ძიება)". ეს არ არის კანონის ტექსტი:',
  "   - გამოიყენე მხოლოდ პრაქტიკული, ცხოვრებისეული ახსნისთვის (პროცედურა, ვადები, რა ხდება პრაქტიკაში, სად მიმართო) — პასუხი ამით უფრო სასარგებლო და კონკრეტული გახადე.",
  `   - არასოდეს ამოიღო იქიდან მუხლის ნომერი, პროცენტი, თანხა ან ვადა და არ ჩაწერო ${CITATION_DELIM}-ის შემდეგ. სამართლებრივი საფუძველი მხოლოდ კანონის ტექსტიდანაა.`,
  "   - თუ პრაქტიკული კონტექსტი ეწინააღმდეგება მოწოდებულ კანონს — დაეყრდენი კანონს.",
  "",
  `11. ${STRICT_BREVITY_RULE}`,
  "ეს წესი ეხება მხოლოდ ფორმას (შესავალს, თავაზიან კლიშეებს, გამეორებას, დასკვნით შეჯამებას) — არასოდეს ამართლებს რომელიმე მუხლის, პუნქტის, ქვეპუნქტის, გამონაკლისის ან საჭირო ქვეთემის გამოტოვებას. წესები 3 და 6ა–6გ (ყველა შესაბამისი დებულების სრული, ამომწურავი მოცვა) აქტუალობას არ კარგავს და აღემატება ამ წესს კონფლიქტის შემთხვევაში.",
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
      const x = (v ?? "").replace(/პუნქტი|ქვეპუნქტი|[„""'`«»]/g, "").trim();
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
      .slice(0, 3500)
  );
}

/**
 * Build the user message containing the matched source text + question, plus an
 * optional, clearly-labeled web-search context block (practical real-world
 * context only — never a legal source; see SYSTEM_PROMPT rule 10).
 */
export function buildGroundedPrompt(
  question: string,
  sources: PromptSource[],
  webContext?: string
): string {
  const blocks = sources
    .map((s) => {
      const head = [s.lawTitle, s.chapter, s.label].filter(Boolean).join(" — ");
      return `[${head}]\n${cleanChunk(s.text)}`;
    })
    .join("\n\n");

  const web = webContext?.trim();
  const webBlock = web
    ? `\n\nდამატებითი პრაქტიკული კონტექსტი (ვებ-ძიება — არ არის კანონის ტექსტი):\n${web.slice(0, 2000)}`
    : "";

  return `ტექსტი:\n${blocks}${webBlock}\n\nშეკითხვა: ${question}`;
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

  // NOTE: do not force `reasoning: { enabled: false }`. Reasoning models (e.g.
  // openai/gpt-oss-*) reject it with HTTP 400 ("Reasoning is mandatory for this
  // endpoint and cannot be disabled"); non-reasoning models don't reason anyway.
  const body: Record<string, unknown> = {
    model: opts.model ?? ANSWER_MODEL,
    messages,
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
 *
 * `tier` selects the model via modelForTier — callers escalate through
 * ANSWER_TIER_ORDER only when an earlier rung's response fails to produce a
 * verified citation. Defaults to "cheap" (ANSWER_MODEL).
 */
export async function generateLegalAnswer(
  messages: ChatMessage[],
  tier: AnswerTier = "cheap"
): Promise<string> {
  return callOpenRouter(messages, {
    model: modelForTier(tier),
    // 0, not 0.1: identical question + identical retrieved text should always
    // cite the same articles and figures — any sampling temperature reopens
    // that drift even with rule 6e in SYSTEM_PROMPT.
    temperature: 0,
    maxTokens: 1200,
    frequencyPenalty: 0.2,
  });
}

/**
 * Streaming counterpart to `generateLegalAnswer` — same model/params, but
 * opens an upstream SSE connection instead of a single blocking call so the
 * caller can forward content deltas to the browser as they arrive. Resolves
 * once the connection is confirmed live (see `openOpenRouterStream`); the
 * groundedness check (which needs the full text, citation block included)
 * still runs after the caller has drained the generator to completion.
 */
export async function streamLegalAnswer(
  messages: ChatMessage[],
  tier: AnswerTier = "cheap"
) {
  return openOpenRouterStream(messages, {
    model: modelForTier(tier),
    temperature: 0,
    maxTokens: 1200,
    frequencyPenalty: 0.2,
  });
}

/* ── Web-search enrichment (OpenRouter "web" plugin) ──────────────────────────
 * Optional. Gathers PRACTICAL, real-world context (procedures, timelines, what
 * happens in practice) to enrich — never replace — the grounded legal answer.
 * Legal claims/citations still come ONLY from approved law text (SYSTEM_PROMPT
 * rule 10; buildLegalBasis filters citations to provided articles). Degrades to
 * null on any failure or when disabled, so the grounded pipeline never blocks
 * on web search. Toggle/tune via OPENROUTER_WEB_* env vars.
 * Docs: https://openrouter.ai/docs/guides/features/plugins/web-search */

export type WebSource = { url: string; title: string };
export type WebContext = { summary: string; sources: WebSource[] };

/**
 * Safety-net web search — the uncovered-topic fallback (answerViaWebSearch)
 * and the document-generator citation fact-check (verifyLegalCitations). On
 * unless OPENROUTER_WEB_SEARCH=off. Kept separate from WEB_CONTEXT_ON below
 * so turning off the cosmetic "practical context" enrichment never disables
 * the ability to actually answer a question outside the 8 approved sources.
 */
const WEB_SEARCH_ON = () =>
  (process.env.OPENROUTER_WEB_SEARCH ?? "on").toLowerCase() !== "off";

/**
 * Supplementary "practical context" enrichment (searchWebContext) added to
 * already-grounded chat answers — procedure/deadlines color, never a legal
 * source (SYSTEM_PROMPT rule 10). Purely cosmetic: disabling it cannot affect
 * answer accuracy, since legal facts never come from this path. On unless
 * OPENROUTER_WEB_CONTEXT=off.
 */
const WEB_CONTEXT_ON = () =>
  (process.env.OPENROUTER_WEB_CONTEXT ?? "on").toLowerCase() !== "off";

/**
 * Model that runs the web-search call. Defaults to Perplexity Sonar — a cheap,
 * fast model purpose-built for grounded web search (native search index, no
 * OpenRouter "web" plugin surcharge needed). The `:online` suffix is
 * OpenRouter's shortcut for the "web" plugin on a plain chat model, kept as a
 * fallback option via env override.
 */
const WEB_MODEL = () =>
  process.env.OPENROUTER_WEB_MODEL || "perplexity/sonar";

/** True for models with a built-in web index — the "web" plugin would be redundant. */
const hasNativeWebAccess = (model: string) =>
  model.endsWith(":online") || model.startsWith("perplexity/");

/** Result count for the web plugin (1–10, default 5). */
const WEB_MAX_RESULTS = () => {
  const n = Number(process.env.OPENROUTER_WEB_MAX_RESULTS);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.trunc(n), 10) : 5;
};

const WEB_SEARCH_SYSTEM = [
  "You are a research assistant for a Georgian legal-help service.",
  "Use web search to gather PRACTICAL, real-world context for the user's question:",
  "typical procedures, realistic timelines, what usually happens in practice, which",
  "institutions are involved, and concrete practical tips for Georgia specifically.",
  "Do NOT state statute names, article numbers, percentages, money amounts or deadlines —",
  "precise legal provisions are sourced separately from the official law text.",
  "Reply in the SAME language as the question (Georgian or English).",
  "Write 3–6 short, concrete sentences in plain language. No headings, no inline citations.",
].join("\n");

/**
 * Run one web-search-enabled OpenRouter call and return a short practical
 * summary plus its source citations (from the response `annotations`). Never
 * throws; returns null when disabled, keyless, on timeout, or on any error.
 */
export async function searchWebContext(
  question: string
): Promise<WebContext | null> {
  if (!WEB_CONTEXT_ON()) return null;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = WEB_MODEL();
  // No `reasoning: { enabled: false }` — reasoning models reject it (HTTP 400).
  const body: Record<string, unknown> = {
    model,
    temperature: 0.3,
    max_tokens: 450,
    messages: [
      { role: "system", content: WEB_SEARCH_SYSTEM },
      { role: "user", content: question },
    ],
  };
  // Models with native web access (":online" suffix, Perplexity Sonar) already
  // search the web — attaching the plugin again would double the search cost.
  // Only configure the explicit plugin for plain model slugs.
  if (hasNativeWebAccess(model)) {
    // This call only needs a short practical-context summary, not deep
    // research — request Perplexity's cheapest search tier to cut the
    // per-request search fee (unlike the matsne fallback search below, which
    // stays at the default depth since finding the right article there
    // matters for answer correctness).
    body.web_search_options = { search_context_size: "low" };
  } else {
    const webPlugin: Record<string, unknown> = {
      id: "web",
      max_results: WEB_MAX_RESULTS(),
    };
    const engine = process.env.OPENROUTER_WEB_ENGINE?.trim();
    if (engine) webPlugin.engine = engine;
    body.plugins = [webPlugin];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    const summary: string = (msg?.content ?? "").trim();
    if (!summary) return null;

    return { summary, sources: extractWebSources(msg, 6) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Extract OpenRouter's standardized url_citation annotations from a message. */
function extractWebSources(msg: unknown, max: number): WebSource[] {
  const sources: WebSource[] = [];
  const seen = new Set<string>();
  const annotations = (msg as { annotations?: unknown })?.annotations;
  if (Array.isArray(annotations)) {
    for (const a of annotations) {
      const c = (a as { url_citation?: { url?: string; title?: string } })
        ?.url_citation;
      const url = typeof c?.url === "string" ? c.url.trim() : "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ url, title: (c?.title || url).trim() });
      if (sources.length >= max) break;
    }
  }
  return sources;
}

/* ── Web-search fallback answer (matsne.gov.ge, beyond the 8 approved
 * sources) ─────────────────────────────────────────────────────────────
 * The 8 APPROVED_SOURCES cover the most common topics but not the entire
 * Georgian legal code, which matsne.gov.ge hosts in full. When
 * retrieval/generation against those 8 sources comes up empty, this is the
 * last-resort path: search matsne.gov.ge specifically for the actual answer
 * instead of telling the user "not found". Used sparingly — only on a
 * genuine miss — so it doesn't add cost to the common case.
 * Unlike generateLegalAnswer, this is NOT restricted to pre-fetched
 * approved-source text; the model must find and cite the law itself. Still
 * restricted to matsne.gov.ge as the only trusted legal source (same hard
 * rule as APPROVED_SOURCES/isAllowedHost) — enforced in code below, not just
 * by prompt instruction, since search-engine behavior can't be fully
 * trusted to honor a domain restriction on its own.
 */

const WEB_ANSWER_SYSTEM = [
  'შენ ხარ „ჩემი იურისტი" — ეხმარები ადამიანს, რომელსაც იურიდიული განათლება არ აქვს.',
  "წინასწარ დამტკიცებულ 8 ძირითად კოდექსში ამ კითხვაზე პასუხი ვერ მოიძებნა.",
  "მოძებნე რეალური პასუხი ვებ ძიებით, მაგრამ მხოლოდ და მხოლოდ საიტზე matsne.gov.ge (საქართველოს საკანონმდებლო მაცნე) — ეს არის საქართველოს ერთადერთი ოფიციალური საკანონმდებლო წყარო და მოიცავს საქართველოს მთელ მოქმედ კანონმდებლობას.",
  "არასოდეს დაეყრდნო, ციტირო ან ახსენო რაიმე სხვა საიტი (ბლოგი, სიახლეების საიტი, იურიდიული ფირმის გვერდი და ა.შ.) — მხოლოდ matsne.gov.ge.",
  "",
  "LANGUAGE RULE: უპასუხე შეკითხვის იმავე ენაზე (ქართული შეკითხვას — ქართული პასუხი, ინგლისურს — ინგლისური).",
  "",
  "წესები (მკაცრად დაიცავი):",
  "1. matsne.gov.ge მოიცავს ყველა მოქმედ კანონს — პასუხი იქ ყოველთვის არსებობს. თუ პირველი საძიებო სიტყვებით ვერაფერი იპოვე, აუცილებლად სცადე სხვა საკვანძო სიტყვები, სინონიმები, მონათესავე იურიდიული ცნებები ან სხვა შესაბამისი კოდექსი/კანონი — არ დანებდე ერთი წარუმატებელი ცდის შემდეგ.",
  "2. კრიტიკულია — არასოდეს დააბრუნო მხოლოდ მუხლების/კოდების ჩამონათვალი პასუხის მაგივრად. ჯერ პირდაპირ, მარტივი და გასაგები ენით უპასუხე კითხვას არსობრივად — რას ნიშნავს ეს კონკრეტულად მომხმარებლისთვის, რა უნდა გააკეთოს — და მხოლოდ ახსნის ბოლოს დაასახელე გამოყენებული მუხლები, როგორც დამადასტურებელი წყარო, არა როგორც პასუხის ჩანაცვლება.",
  "3. მოძებნე კონკრეტული კანონი/კოდექსი და მუხლი matsne.gov.ge-ზე, რომელიც რეალურად პასუხობს კითხვას; დაასახელე ისინი პასუხის ტექსტში.",
  "4. არასოდეს გამოიგონო კანონი, მუხლი, ციფრი ან ვადა — მხოლოდ ის, რასაც matsne.gov.ge რეალურად ადასტურებს.",
  "5. უპასუხე პირდაპირ არსით, კითხვის გამეორების გარეშე.",
  STRICT_BREVITY_RULE,
].join("\n");

/** Phrases that mark a give-up/refusal answer — trigger a retry with a new search angle. */
const REFUSAL_PATTERNS = [
  /ვერ\s*მოიძებნა/,
  /ცალსახა პასუხი ვერ/,
  /არ\s*(?:მოიპოვება|მოინახა)/,
  /კვალიფიციურ იურისტთან/,
  /not\s+found/i,
  /could\s*n[o']?t\s+find/i,
  /no\s+clear\s+answer/i,
];

/** Reject answers that are just a citation dump with no real explanation. */
function looksLikeRealAnswer(prose: string): boolean {
  if (REFUSAL_PATTERNS.some((re) => re.test(prose))) return false;
  const proseLines = prose
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    // Drop lines that are just a citation reference (article/code listing).
    .filter((l) => !/^[-•*]?\s*(მუხლი|article|კოდექსი|კანონი)\b[\s:]/i.test(l));
  const explanatoryText = proseLines.join(" ").trim();
  return explanatoryText.length >= 60;
}

/** Per-attempt hint steering the search toward a fresh angle after a miss. */
function retryHint(attempt: number, keywords?: string[]): string {
  if (attempt === 0) return "";
  if (attempt === 1 && keywords && keywords.length > 0) {
    return `\n\n(წინა ძიებამ ზუსტი პასუხი ვერ პოვა. სცადე ეს საკვანძო სიტყვები matsne.gov.ge-ზე: ${keywords.join(", ")}.)`;
  }
  if (attempt === 2) {
    return "\n\n(წინა ორმა ძიებამ პასუხი ვერ პოვა. სცადე სრულიად განსხვავებული საკვანძო სიტყვები, მონათესავე იურიდიული ცნება ან სხვა შესაბამისი კოდექსი/კანონი matsne.gov.ge-ზე.)";
  }
  return "\n\n(ეს ბოლო ცდაა — დაფიქრდი ყველაზე ფართო შესაბამის იურიდიულ ცნებაზე ან კოდექსზე და მოძებნე ისევ matsne.gov.ge-ზე.)";
}

export type WebAnswer = { prose: string; sources: WebSource[] };

/** Max search attempts before giving up — matsne.gov.ge covers all of Georgian
 * law, so a single miss is treated as a bad query, not a real gap. Capped at
 * 2 (was 4): retryHint's own escalation logic front-loads the highest-value
 * rewording into attempt 1; attempts 3-4 were diminishing-returns tail spend
 * on an already-rare fallback path (only reached when all 8 approved sources
 * miss). Cutting this is a cost lever, not a recall lever — same two best
 * search angles still run. */
const WEB_ANSWER_MAX_ATTEMPTS = 2;

async function runWebAnswerAttempt(
  question: string,
  attempt: number,
  apiKey: string,
  keywords?: string[]
): Promise<WebAnswer | null> {
  const model = WEB_MODEL();
  const body: Record<string, unknown> = {
    model,
    // Slightly higher temperature on retries so repeated attempts don't
    // converge on the same failed search terms.
    temperature: attempt === 0 ? 0.2 : 0.5,
    max_tokens: 900,
    messages: [
      { role: "system", content: WEB_ANSWER_SYSTEM },
      { role: "user", content: question + retryHint(attempt, keywords) },
    ],
  };
  // Deliberately NOT setting search_context_size here (unlike
  // searchWebContext's "low" tier): finding the right matsne.gov.ge article
  // on this path is the actual answer, not secondary color, so it stays at
  // the provider's default search depth — a cost/correctness tradeoff, not
  // a free cut.
  if (!hasNativeWebAccess(model)) {
    const webPlugin: Record<string, unknown> = {
      id: "web",
      max_results: Math.max(WEB_MAX_RESULTS(), 6),
      // Best-effort narrowing at the search-engine level (supported by Exa/
      // Parallel/Firecrawl; ignored by engines that don't support it). The
      // isAllowedHost filter below is what actually enforces the restriction
      // regardless of whether the engine honors this.
      include_domains: ["matsne.gov.ge", "www.matsne.gov.ge"],
    };
    const engine = process.env.OPENROUTER_WEB_ENGINE?.trim();
    if (engine) webPlugin.engine = engine;
    body.plugins = [webPlugin];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    const prose: string = (msg?.content ?? "").trim();
    if (!prose) return null;

    // Hard enforcement: only trust this answer if at least one cited source
    // is actually matsne.gov.ge. A prose answer with no confirmed matsne.gov.ge
    // citation is an unverifiable claim, not a grounded legal answer.
    const sources = extractWebSources(msg, 6).filter((s) => isAllowedHost(s.url));
    if (sources.length === 0) return null;

    return { prose, sources };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Last-resort answer when the 8 approved sources don't cover the question:
 * search matsne.gov.ge for the actual Georgian law and answer from that,
 * instead of refusing outright. matsne.gov.ge hosts all of Georgian law, so a
 * miss means the search terms were wrong, not that no answer exists — this
 * retries with fresh keywords/angles (up to WEB_ANSWER_MAX_ATTEMPTS) before
 * giving up. Never throws; returns null on total failure (keyless, disabled
 * web search, or every attempt came back without a confirmed matsne.gov.ge
 * citation / real explanation), so callers fall back to NOT_FOUND_MSG rather
 * than trust an unverifiable or bare-list claim.
 */
export async function answerViaWebSearch(
  question: string,
  keywords?: string[]
): Promise<WebAnswer | null> {
  if (!WEB_SEARCH_ON()) return null;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  let best: WebAnswer | null = null;
  for (let attempt = 0; attempt < WEB_ANSWER_MAX_ATTEMPTS; attempt++) {
    const result = await runWebAnswerAttempt(question, attempt, apiKey, keywords);
    if (!result) continue;
    if (looksLikeRealAnswer(result.prose)) return result;
    // Keep the least-bad result in case every attempt fails the strict check.
    best = best ?? result;
  }
  return best;
}

const VERIFY_CITATIONS_SYSTEM = [
  "შენ ხარ ქართული სამართლის ფაქტების შემმოწმებელი.",
  "მოგეწოდება დოკუმენტის ტიპი და მისი \"სამართლებრივი საფუძვლები და წყაროები\" სექციის ტექსტი.",
  "დოკუმენტს შეიძლება ერთდროულად ეხებოდეს რამდენიმე კანონი/კოდექსი (მაგ. სამოქალაქო კოდექსი, შრომის კოდექსი, საგადასახადო კოდექსი, ადმინისტრაციულ სამართალდარღვევათა კოდექსი, მომხმარებლის უფლებების დაცვის კანონი, კონსტიტუცია) — ვებ ძიებით ერთდროულად შეამოწმე ყველა შესაბამისი კანონი, არ შემოიფარგლო მხოლოდ ერთით.",
  "თითოეული მოწოდებული მუხლისთვის შეამოწმე, რეალურად არსებობს თუ არა ხსენებულ კანონში/კოდექსში.",
  "თუ დოკუმენტის ტიპისთვის აშკარად რელევანტური, სხვა კანონის მუხლი ვერ იპოვე თავდაპირველ სიაში, მაგრამ ვებ ძიებით დაადასტურე მისი არსებობა და პირდაპირი შესაბამისობა — დაამატე ის ახალ ბლოკად ამ კანონის ქვეშ.",
  "დააბრუნე მხოლოდ შესწორებული სექცია, ზუსტად იმავე ფორმატით: კანონის დასახელება ცალკე სტრიქონზე, შემდეგ მისი მუხლები ჩამონათვლის სახით.",
  "წაშალე ნებისმიერი მუხლი, რომლის არსებობასაც ვერ ადასტურებ.",
  "არასოდეს გამოიგონო მუხლი ან კანონი — მხოლოდ ვებ ძიებით დადასტურებული დამატება დაშვებულია.",
  "დააბრუნე მხოლოდ ტექსტი, დამატებითი ახსნის ან კომენტარის გარეშე.",
].join("\n");

/**
 * Web-search fact-check for a document generator's freeform "Legal Basis"
 * section: confirms each cited article actually exists, strips any that
 * can't be confirmed, and may append confirmed provisions from OTHER
 * relevant Georgian codes the drafting model missed (checked simultaneously,
 * not one law at a time). Same fail-open contract as searchWebContext —
 * returns null on any failure so callers can leave the original AI-drafted
 * citations untouched.
 */
export async function verifyLegalCitations(
  docTypeName: string,
  citationsSection: string
): Promise<string | null> {
  if (!WEB_SEARCH_ON()) return null;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = WEB_MODEL();
  const body: Record<string, unknown> = {
    model,
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      { role: "system", content: VERIFY_CITATIONS_SYSTEM },
      {
        role: "user",
        content: `დოკუმენტის ტიპი: ${docTypeName}\n\nსექცია შესამოწმებლად:\n${citationsSection}`,
      },
    ],
  };
  if (!hasNativeWebAccess(model)) {
    const webPlugin: Record<string, unknown> = {
      id: "web",
      // Multiple codes are checked in one pass here, so allow more results
      // than the single-law default used by searchWebContext.
      max_results: Math.max(WEB_MAX_RESULTS(), 8),
    };
    const engine = process.env.OPENROUTER_WEB_ENGINE?.trim();
    if (engine) webPlugin.engine = engine;
    body.plugins = [webPlugin];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const content: string = (json?.choices?.[0]?.message?.content ?? "").trim();
    return content || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
