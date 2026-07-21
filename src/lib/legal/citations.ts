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

/**
 * True if at least one model-claimed citation matches an article we actually
 * provided (a matsne.gov.ge-sourced chunk) — i.e. the answer is grounded, not
 * a bare NOT_FOUND or an unverifiable claim. Used to decide whether the cheap
 * model's answer is trustworthy or needs escalation to the expensive model.
 */
export function hasVerifiedCitation(
  matches: ScoredChunk[],
  citations: RawCitation[]
): boolean {
  if (citations.length === 0) return false;
  const known = new Set(matches.map((m) => norm(m.article)));
  return citations.some((c) => known.has(norm(c.article)));
}

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

/** Shape of a persisted Consultation's `sources` array (matsne citations and/or web-search results). */
export type RawSource = {
  title?: string;
  url?: string;
  article?: string;
  paragraph?: string;
  subparagraph?: string;
  /** Legacy: consultations saved before article/paragraph/subparagraph existed. */
  articleNumber?: string;
};

export type RawWebSource = { url: string; title: string };

/**
 * Reconstruct a saved consultation's citations for display: entries with an
 * article number are grounded matsne law citations (grouped by law, same
 * shape the live streaming answer produces); entries with only a title/url
 * came from the web-search fallback and have no article to group by.
 */
export function splitRawSources(sources: RawSource[]): {
  legalBasis: LegalBasisGroup[];
  webSources: RawWebSource[];
} {
  const groups = new Map<string, LegalBasisGroup>();
  const webSources: RawWebSource[] = [];

  for (const s of sources) {
    const article = s.article ?? s.articleNumber;
    if (article) {
      const key = `${s.title ?? ""}|${s.url ?? ""}`;
      let g = groups.get(key);
      if (!g) {
        g = { lawName: s.title ?? "", url: s.url ?? "", items: [] };
        groups.set(key, g);
      }
      g.items.push({
        article,
        paragraph: s.paragraph ?? null,
        subparagraph: s.subparagraph ?? null,
      });
    } else if (s.url && s.title) {
      webSources.push({ url: s.url, title: s.title });
    }
  }

  return { legalBasis: [...groups.values()], webSources };
}

export type DocumentLegalBasisGroup = { lawName: string; articles: string[] };

/**
 * Parse the document generator's freeform "law name line, then dash-prefixed
 * article lines" legal-basis block (see SYSTEM prompt in
 * app/api/generate/route.ts) into groups for the dedicated sources panel.
 * Best-effort only — this text is model-authored prose, not grounded chunks.
 */
export function parseDocumentLegalBasis(raw: string): DocumentLegalBasisGroup[] {
  const groups: DocumentLegalBasisGroup[] = [];
  let current: DocumentLegalBasisGroup | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/^[-•*]/.test(t)) {
      const article = t.replace(/^[-•*]\s*/, "").trim();
      if (!article) continue;
      if (!current) {
        current = { lawName: "", articles: [] };
        groups.push(current);
      }
      current.articles.push(article);
    } else {
      current = { lawName: t.replace(/:\s*$/, "").trim(), articles: [] };
      groups.push(current);
    }
  }
  return groups.filter((g) => g.lawName || g.articles.length > 0);
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
