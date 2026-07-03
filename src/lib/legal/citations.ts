/**
 * Builds the grounded "Legal Basis" (იურიდიული საფუძველი) structure that the
 * client renders. Law name, article and URL are taken from the matched chunks
 * (deterministic — the model cannot invent them); only paragraph/subparagraph
 * come from the model and are accepted only for articles we actually provided.
 */
import type { ScoredChunk } from "./search";
import { cleanLawName } from "./sources";
import type { RawCitation } from "./openrouter";

export type LegalBasisItem = {
  article: string;
  paragraph: string | null;
  subparagraph: string | null;
};

export type LegalBasisGroup = {
  lawName: string;
  url: string;
  items: LegalBasisItem[];
};

/** Normalise an article string for matching ("მუხლი 37." ~ "მუხლი37"). */
const norm = (a: string) =>
  a.replace(/\s+/g, "").replace(/[.\-–]/g, "").toLowerCase();

export function buildLegalBasis(
  matches: ScoredChunk[],
  citations: RawCitation[]
): LegalBasisGroup[] {
  // article -> canonical meta. Highest-scored match wins on number collisions.
  const index = new Map<
    string,
    { article: string; lawName: string; url: string }
  >();
  for (const m of matches) {
    const k = norm(m.article);
    if (!index.has(k)) {
      index.set(k, {
        article: m.article,
        lawName: cleanLawName(m.lawTitle),
        url: m.url,
      });
    }
  }

  // Keep only citations whose article was actually provided (anti-invention).
  const valid = citations.filter((c) => index.has(norm(c.article)));

  // Fallback: if the model gave no usable citations, show an article-level
  // basis from the matched chunks so a source link is always present.
  const effective: RawCitation[] =
    valid.length > 0 ? valid : matches.map((m) => ({ article: m.article }));

  const groups = new Map<string, LegalBasisGroup>();
  const seen = new Set<string>();
  for (const c of effective) {
    const meta = index.get(norm(c.article));
    if (!meta) continue;
    let g = groups.get(meta.url);
    if (!g) {
      g = { lawName: meta.lawName, url: meta.url, items: [] };
      groups.set(meta.url, g);
    }
    const item: LegalBasisItem = {
      article: meta.article,
      paragraph: c.paragraph ?? null,
      subparagraph: c.subparagraph ?? null,
    };
    const key = `${meta.url}|${item.article}|${item.paragraph ?? ""}|${item.subparagraph ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    g.items.push(item);
  }
  return [...groups.values()];
}

export type ArticleGroup = { article: string; points: string[] };

/**
 * Collapse items of one law into one entry per article, with a "1"/"2"-style
 * point per paragraph+subparagraph. Shared by the live chat view and the
 * consultation history view so both render the exact same "Legal Basis" text
 * for the same data.
 */
export function groupItemsByArticle(items: LegalBasisItem[]): ArticleGroup[] {
  const map = new Map<string, string[]>();
  for (const it of items) {
    if (!map.has(it.article)) map.set(it.article, []);
    let point = "";
    if (it.paragraph && it.subparagraph) {
      point = `${it.paragraph} „${it.subparagraph}"`;
    } else if (it.paragraph) {
      point = it.paragraph;
    } else if (it.subparagraph) {
      point = `„${it.subparagraph}"`;
    }
    if (point) map.get(it.article)!.push(point);
  }
  return [...map.entries()].map(([article, points]) => ({ article, points }));
}
