/**
 * Query understanding for semantic-ish retrieval without embeddings.
 *
 * The lexical search alone fails when a layperson's wording doesn't overlap with
 * the legal text ("can my boss fire me on holiday?" vs. "შრომითი ხელშეკრულების
 * შეწყვეta"). We bridge that gap with one cheap LLM call that:
 *   - extracts/expands the legal KEYWORDS implied by the question (synonyms, the
 *     formal Georgian legal terms), and
 *   - writes a short HYPOTHETICAL answer (HyDE) — a 1–2 sentence passage in legal
 *     register. Matching that against the corpus surfaces the right articles even
 *     with zero word overlap with the original question.
 *
 * Degrades gracefully: any failure (no key, timeout, bad JSON) falls back to the
 * raw question, so retrieval never hard-depends on this step.
 */

import { callOpenRouter, FAST_MODEL, type ChatMessage } from "./openrouter";
import { APPROVED_SOURCES, SOURCE_IDS } from "./sources";

export type ExpandedQuery = {
  /** Always the user's original text. */
  original: string;
  /** Legal keywords / synonyms in Georgian (may be empty on fallback). */
  keywords: string[];
  /** Short hypothetical legal-register answer for HyDE (may be empty). */
  hypothetical: string;
  /** Source ids the question is about; empty = couldn't classify. */
  sourceIds: string[];
  /**
   * Whether practical/real-world context (procedure, timelines, where to go)
   * would meaningfully improve the answer. Decided by this same classifier
   * call so gating searchWebContext costs nothing extra — false for
   * questions that are purely about a specific legal fact/definition/number,
   * which the law text alone already answers fully. Defaults to true on any
   * parse failure so a classifier hiccup never silently downgrades quality.
   */
  needsWebContext: boolean;
  /** Real billed cost (USD) of this expansion call — 0 on total failure
   * (keyless, both attempts threw before a response came back). */
  costUsd: number;
};

// Catalog of laws the classifier chooses from.
const CATALOG = APPROVED_SOURCES.map((s) => `- ${s.id}: ${s.topic}`).join("\n");

const EXPAND_SYSTEM = [
  "შენ ხარ ქართული სამართლის საძიებო ასისტენტი. მომხმარებლის ყოველდღიური ენით დასმული",
  "შეკითხვა გადააქციე იურიდიულ საძიებო სიგნალებად და შეარჩიე შესაბამისი კანონ(ებ)ი.",
  "",
  "კანონების სია (id: აღწერა):",
  CATALOG,
  "",
  "დააბრუნე მხოლოდ JSON ობიექტი:",
  '{"sources": ["id", "..."], "keywords": ["...", "..."], "hypothetical": "...", "needsPracticalContext": true|false}',
  "- sources: მხოლოდ ზემოთ სიიდან არსებული id-ები, რომელთა შინაარსიც ეხმიანება შეკითხვას (შეიძლება ერთი ან რამდენიმე). თუ არცერთი არ ერგება — [].",
  "- keywords: 4–10 ქართული იურიდიული ტერმინი/სინონიმი, რომელიც კანონის ტექსტში სავარაუდოდ გვხვდება.",
  "- hypothetical: 1–2 წინადადება იურიდიული რეგისტრით, თითქოს კანონი პასუხობს შეკითხვას.",
  "- needsPracticalContext: true, თუ პასუხს რეალურად გააუმჯობესებდა პრაქტიკული კონტექსტი (რა ხდება პრაქტიკაში, ვადები, პროცედურა, რომელ ორგანოს მიმართო); false, თუ შეკითხვა ეხება მხოლოდ კონკრეტულ სამართლებრივ ფაქტს, განსაზღვრებას ან რიცხვს, რასაც კანონის ტექსტი თავისთავად სრულად პასუხობს.",
  "სხვა ტექსტი არ დაამატო. მხოლოდ JSON.",
].join("\n");

/** Parse a model response that should be a JSON object; tolerate code fences. */
function parseExpansion(raw: string): {
  keywords: string[];
  hypothetical: string;
  sourceIds: string[];
  needsWebContext: boolean;
} {
  let s = raw.trim();
  // Strip ```json ... ``` fences if the model added them.
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Grab the first {...} block in case of stray prose.
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) s = s.slice(start, end + 1);

  const obj = JSON.parse(s) as unknown;
  if (!obj || typeof obj !== "object") throw new Error("not an object");

  const rec = obj as Record<string, unknown>;
  const keywords = Array.isArray(rec.keywords)
    ? rec.keywords
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const hypothetical =
    typeof rec.hypothetical === "string" ? rec.hypothetical.trim().slice(0, 600) : "";
  // Keep only ids that actually exist in the catalog (anti-hallucination).
  const sourceIds = Array.isArray(rec.sources)
    ? Array.from(
        new Set(
          rec.sources
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim())
            .filter((x) => SOURCE_IDS.has(x))
        )
      )
    : [];
  // Default true (do the web search) on a missing/malformed field — a
  // classifier hiccup should fall back to the old always-search behavior,
  // not silently degrade answer quality.
  const needsWebContext =
    typeof rec.needsPracticalContext === "boolean" ? rec.needsPracticalContext : true;

  return { keywords, hypothetical, sourceIds, needsWebContext };
}

/**
 * Expand a raw question into legal keywords + a hypothetical answer. Never
 * throws: on any failure returns the original question with empty expansions.
 */
export async function expandQuery(question: string): Promise<ExpandedQuery> {
  const original = question.trim();
  const fallback: ExpandedQuery = {
    original,
    keywords: [],
    hypothetical: "",
    sourceIds: [],
    needsWebContext: true,
    costUsd: 0,
  };

  if (!process.env.OPENROUTER_API_KEY) return fallback;

  const messages: ChatMessage[] = [
    { role: "system", content: EXPAND_SYSTEM },
    { role: "user", content: original },
  ];

  // FAST_MODEL is a cheap model with a non-trivial intermittent upstream
  // error rate (observed: malformed/truncated JSON on an outright API error,
  // not a token-budget issue). One retry recovers most of those transient
  // failures; without it, a single flaky call silently degrades to
  // keyword-less search, which loses recall on any question whose everyday
  // phrasing doesn't lexically overlap the formal legal text.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { content: raw, costUsd } = await callOpenRouter(messages, {
        model: FAST_MODEL,
        // 0, not a small positive value: this call picks which laws/keywords get
        // searched, so any sampling variance here changes which articles get
        // retrieved — and therefore the legal basis shown — for the identical
        // question across two runs.
        temperature: 0,
        maxTokens: 260,
        json: true,
        timeoutMs: 12_000,
      });
      const { keywords, hypothetical, sourceIds, needsWebContext } = parseExpansion(raw);
      // If the model returned nothing usable, fall back rather than pass empties
      // — but the call still cost money, so keep its cost rather than dropping it.
      if (keywords.length === 0 && !hypothetical && sourceIds.length === 0) {
        return { ...fallback, costUsd };
      }
      return { original, keywords, hypothetical, sourceIds, needsWebContext, costUsd };
    } catch {
      if (attempt === 0) continue;
    }
  }
  return fallback;
}
