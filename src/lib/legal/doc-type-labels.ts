import type { Locale } from "@/lib/i18n/config";

/** Bilingual display labels for document/template type keys used across
 * /generate, /templates, and the services modal. Single source of truth so
 * all three surfaces stay in sync when the site locale is English. */
export const DOC_TYPE_LABELS: Record<string, { label: string; labelEn: string }> = {
  complaint: { label: "საჩივარი", labelEn: "Complaint" },
  "demand-letter": { label: "სამართლებრივი მოთხოვნა", labelEn: "Demand letter" },
  "rental-agreement": { label: "ქირავნობის ხელშეკრულება", labelEn: "Rental agreement" },
  "employment-contract": { label: "შრომის ხელშეკრულება", labelEn: "Employment contract" },
  "service-agreement": { label: "მომსახურების ხელშეკრულება", labelEn: "Service agreement" },
  "power-of-attorney": { label: "მინდობილობა", labelEn: "Power of attorney" },
  "termination-notice": { label: "სამსახურიდან გათავისუფლება", labelEn: "Termination notice" },
  "claim-letter": { label: "წერილი-პრეტენზია", labelEn: "Claim letter" },
  "debt-claim": { label: "დავალიანების დაფარვის მოთხოვნა", labelEn: "Debt claim" },
  "child-travel-consent": { label: "თანხმობა არასრულწლოვნის საზღვარგარეთ გაყვანაზე", labelEn: "Child travel consent" },
  invoice: { label: "ინვოისი", labelEn: "Invoice" },
  "acceptance-act": { label: "მიღება-ჩაბარების აქტი", labelEn: "Acceptance act" },
};

export function docTypeLabel(type: string, locale: Locale): string {
  const entry = DOC_TYPE_LABELS[type];
  if (!entry) return type;
  return locale === "en" ? entry.labelEn : entry.label;
}
