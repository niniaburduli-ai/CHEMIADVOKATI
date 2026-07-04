/** @module openrouter */
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
 * answer isn't there (#7), summarize rather than dump the source (#8), stay
 * consistent across repeat questions (#6e), and ask a clarifying question
 * instead of guessing when a missing fact would change the answer (#6f).
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
 */
export async function generateLegalAnswer(
  messages: ChatMessage[]
): Promise<string> {
  return callOpenRouter(messages, {
    model: ANSWER_MODEL,
    // 0, not 0.1: identical question + identical retrieved text should always
    // cite the same articles and figures — any sampling temperature reopens
    // that drift even with rule 6e in SYSTEM_PROMPT.
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

/** Web search on unless OPENROUTER_WEB_SEARCH=off. */
const WEB_SEARCH_ON = () =>
  (process.env.OPENROUTER_WEB_SEARCH ?? "on").toLowerCase() !== "off";

/**
 * Model that runs the web-search call. The `:online` suffix is OpenRouter's
 * shortcut for the "web" plugin, so the default already has web search baked in.
 */
const WEB_MODEL = () =>
  process.env.OPENROUTER_WEB_MODEL || "openai/gpt-5.2:online";

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
  if (!WEB_SEARCH_ON()) return null;
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
  // `:online` already enables the web plugin — adding it again would attach a
  // second web plugin (double search + double charge). Only configure the
  // explicit plugin for plain model slugs, where it also lets us tune results.
  if (!model.endsWith(":online")) {
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

    const sources: WebSource[] = [];
    const seen = new Set<string>();
    const annotations = msg?.annotations;
    if (Array.isArray(annotations)) {
      for (const a of annotations) {
        const c = (a as { url_citation?: { url?: string; title?: string } })
          ?.url_citation;
        const url = typeof c?.url === "string" ? c.url.trim() : "";
        if (!url || seen.has(url)) continue;
        seen.add(url);
        sources.push({ url, title: (c?.title || url).trim() });
        if (sources.length >= 6) break;
      }
    }
    return { summary, sources };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const VERIFY_CITATIONS_SYSTEM = [
  "შენ ხარ ქართული სამართლის ფაქტების შემმოწმებელი.",
  "მოგეწოდება დოკუმენტის ტიპი და მისი \"სამართლებრივი საფუძვლები და წყაროები\" სექციის ტექსტი.",
  "ვებ ძიების გამოყენებით შეამოწმე თითოეული მასში მითითებული კანონი/კოდექსი და მუხლი — რეალურად არსებობს თუ არა.",
  "დააბრუნე მხოლოდ შესწორებული სექცია, ზუსტად იმავე ფორმატით: კანონის დასახელება ცალკე სტრიქონზე, შემდეგ მისი მუხლები ჩამონათვლის სახით.",
  "წაშალე ნებისმიერი მუხლი, რომლის არსებობასაც ვერ ადასტურებ.",
  "არასოდეს დაამატო ახალი მუხლი, რომელიც თავდაპირველ სიაში არ იყო.",
  "დააბრუნე მხოლოდ ტექსტი, დამატებითი ახსნის ან კომენტარის გარეშე.",
].join("\n");

/**
 * Web-search fact-check for a document generator's freeform "Legal Basis"
 * section: confirms each cited article actually exists, strips any that
 * can't be confirmed, never adds new ones. Same fail-open contract as
 * searchWebContext — returns null on any failure so callers can leave the
 * original AI-drafted citations untouched.
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
    max_tokens: 600,
    messages: [
      { role: "system", content: VERIFY_CITATIONS_SYSTEM },
      {
        role: "user",
        content: `დოკუმენტის ტიპი: ${docTypeName}\n\nსექცია შესამოწმებლად:\n${citationsSection}`,
      },
    ],
  };
  if (!model.endsWith(":online")) {
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
