/**
 * Approved Georgian law sources. HARD RULE: the AI legal assistant may only
 * read from these URLs. Never fetch or use data from any other website.
 *
 * Each source carries a `topic` description used by the query classifier
 * (query-understanding.ts) to decide WHICH law(s) a question is about, so we
 * fetch only the relevant source(s) instead of all of them.
 *
 * Titles are best-effort labels; the canonical title is re-read from each page
 * when fetched (see fetch-source.ts) and overrides these defaults.
 */
export type ApprovedSource = {
  /** Stable key used by the classifier and source routing. */
  id: string;
  url: string;
  /** Fallback display title; replaced by the live document title when available. */
  title: string;
  /** What this law regulates — fed to the classifier to match questions. */
  topic: string;
};

export const APPROVED_SOURCES: ApprovedSource[] = [
  {
    id: "labor",
    url: "https://matsne.gov.ge/ka/document/view/1155567",
    title: "საქართველოს ორგანული კანონი „საქართველოს შრომის კოდექსი“",
    topic:
      "შრომის კოდექსი — არეგულირებს დასაქმებულისა და დამსაქმებლის ურთიერთობას: განთავისუფლება, შვებულება, ხელფასი, ზეგანაკვეთური სამუშაო, დეკრეტი, შრომითი ხელშეკრულება, კომპენსაცია, სამუშაო დრო და სხვა შრომითი საკითხები.",
  },
  {
    id: "civil",
    url: "https://www.matsne.gov.ge/ka/document/view/31702",
    title: "საქართველოს სამოქალაქო კოდექსი",
    topic:
      "სამოქალაქო კოდექსი — ხელშეკრულებები, ქირავნობა, სესხი, ვალდებულებები, მემკვიდრეობა, საოჯახო სამართალი, საკუთრების უფლება, იპოთეკა, ზიანის ანაზღაურება და სხვა სამოქალაქო ურთიერთობები.",
  },
  {
    id: "consumer",
    url: "https://matsne.gov.ge/ka/document/view/5420598",
    title: "საქართველოს კანონი მომხმარებლის უფლებების დაცვის შესახებ",
    topic:
      "მომხმარებელთა უფლებების დაცვა — მომხმარებლის უფლებები პროდუქტის ან მომსახურების შეძენისას: ონლაინ შეძენა, ნივთის დაბრუნება, გარანტია, დაზიანებული პროდუქტი, შეცდომაში შეყვანა, მომსახურების ხარისხი.",
  },
  {
    id: "admin-offenses",
    url: "https://matsne.gov.ge/ka/document/view/28216",
    title: "საქართველოს ადმინისტრაციულ სამართალდარღვევათა კოდექსი",
    topic:
      "ადმინისტრაციულ სამართალდარღვევათა კოდექსი — ადმინისტრაციული დარღვევები და პასუხისმგებლობა: ჯარიმები, საგზაო დარღვევები, საპატრულო სამართალდარღვევები და სხვა ადმინისტრაციული საკითხები.",
  },
  {
    id: "tax",
    url: "https://matsne.gov.ge/ka/document/view/1043717",
    title: "საქართველოს საგადასახადო კოდექსი",
    topic:
      "საგადასახადო კოდექსი — საგადასახადო საკითხები: ინდმეწარმე, მცირე ბიზნესი, გადასახადები, დღგ, დეკლარაციები, საგადასახადო ჯარიმები და სხვა ფინანსური ვალდებულებები.",
  },
  {
    id: "data-protection",
    url: "https://matsne.gov.ge/ka/document/view/1561437",
    title: "საქართველოს კანონი პერსონალურ მონაცემთა დაცვის შესახებ",
    topic:
      "პერსონალური მონაცემების დაცვა — პერსონალური მონაცემების დამუშავება და დაცვა: ვიდეოკამერები, პირადი ინფორმაციის გავრცელება, კონფიდენციალურობა, მონაცემთა უსაფრთხოება.",
  },
  {
    id: "aml",
    url: "https://matsne.gov.ge/ka/document/view/4690334",
    title:
      "საქართველოს კანონი ფულის გათეთრებისა და ტერორიზმის დაფინანსების აღკვეთის ხელშეწყობის შესახებ",
    topic:
      "ფულის გათეთრებისა და ტერორიზმის დაფინანსების აღკვეთა (AML) — ფინანსური მონიტორინგის ვალდებულებები, საეჭვო ტრანზაქციების კონტროლი, იდენტიფიკაცია და ფინანსური უსაფრთხოების მოთხოვნები.",
  },
  {
    id: "constitution",
    url: "https://matsne.gov.ge/ka/document/view/30346",
    title: "საქართველოს კონსტიტუცია",
    topic:
      "საქართველოს კონსტიტუცია — სახელმწიფოს მოწყობა, ადამიანის უფლებები და თავისუფლებები, საკუთრების უფლება, სიტყვის თავისუფლება, თანასწორობა და მოქალაქის კონსტიტუციური უფლებები.",
  },
];

/** Set of valid source ids, for validating classifier output. */
export const SOURCE_IDS = new Set(APPROVED_SOURCES.map((s) => s.id));

/** Only these hosts may ever be fetched. */
export const ALLOWED_HOSTS = new Set(["matsne.gov.ge", "www.matsne.gov.ge"]);

/** True only if the URL is one of the approved sources (exact match). */
export function isApprovedUrl(url: string): boolean {
  return APPROVED_SOURCES.some((s) => s.url === url);
}

/**
 * Matsne page titles look like:
 *   `საქართველოს სამოქალაქო კოდექსი | სსიპ "საქართველოს საკანონმდებლო მაცნე"`
 * Keep only the law name (the part before the " | " site suffix) for citations.
 */
export function cleanLawName(title: string): string {
  const name = title.split("|")[0].trim();
  return name || title.trim();
}

/**
 * Drop amendment-citation / publication-metadata lines that matsne appends to
 * every article (they bloat the text and bury the real legal content). Handles
 * the many formats: "საქართველოს [რესპუბლიკის/სსრ] YYYY წლის ... კანონი/დეკრეტი
 * №N ...", "ვებგვერდი, DD.MM.YYYY", "პარლამენტის უწყებანი, №...", "ნორმატიული
 * აქტების კრებული, ... მუხ.N". Operates line-wise; legal article text (which
 * cites "ამ მუხლის ნაწილი", not amending act numbers) is preserved.
 */
export function stripCitations(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const l = line.trim();
      if (!l) return true;
      if (
        /(ვებგვერდი|პარლამენტის\s+უწყებ|უმაღლესი\s+საბჭოს\s+უწყებ|ნორმატიული\s+აქტების\s+კრებულ|საბჭოს\s+უწყებებ)/.test(
          l
        )
      )
        return false;
      if (
        /[№N]\s*\d/.test(l) &&
        /(კანონ|დეკრეტ|ბრძანებ|განკარგულებ|უწყებ|კრებულ|გაზეთ|მუხ\.)/.test(l)
      )
        return false;
      if (
        /^(საქართველოს|საქართველოს\s+რესპუბლიკის|საქართველოს\s+სსრ)\b[^\n]*\b(კანონ|დეკრეტ|ბრძანებ)\b/.test(
          l
        ) &&
        /\d{4}/.test(l)
      )
        return false;
      return true;
    })
    .join("\n");
}

/** True only if the URL host is on the allowlist. Defense in depth. */
export function isAllowedHost(url: string): boolean {
  try {
    return ALLOWED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}
