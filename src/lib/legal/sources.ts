/**
 * Approved Georgian law sources. HARD RULE: the AI legal assistant may only
 * read from these URLs. Never fetch or use data from any other website.
 *
 * Titles are best-effort labels; the canonical title is re-read from each page
 * when fetched (see fetch-source.ts) and overrides these defaults.
 */
export type ApprovedSource = {
  url: string;
  /** Fallback display title; replaced by the live document title when available. */
  title: string;
};

export const APPROVED_SOURCES: ApprovedSource[] = [
  { url: "https://matsne.gov.ge/ka/document/view/1155567", title: "მატსნე — დოკუმენტი 1155567" },
  { url: "https://www.matsne.gov.ge/ka/document/view/31702", title: "საქართველოს სამოქალაქო კოდექსი" },
  { url: "https://matsne.gov.ge/ka/document/view/5456100", title: "მატსნე — დოკუმენტი 5456100" },
  { url: "https://matsne.gov.ge/ka/document/view/28216", title: "მატსნე — დოკუმენტი 28216" },
];

/** Only this host may ever be fetched. */
export const ALLOWED_HOSTS = new Set(["matsne.gov.ge", "www.matsne.gov.ge"]);

/** True only if the URL is one of the approved sources (exact match). */
export function isApprovedUrl(url: string): boolean {
  return APPROVED_SOURCES.some((s) => s.url === url);
}

/** True only if the URL host is on the allowlist. Defense in depth. */
export function isAllowedHost(url: string): boolean {
  try {
    return ALLOWED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}
