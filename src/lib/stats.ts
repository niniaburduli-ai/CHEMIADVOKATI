import { dbConnect } from "@/lib/db"
import { User } from "@/lib/models/user"
import { Consultation } from "@/lib/models/consultation"
import { GeneratedDocument } from "@/lib/models/generated-document"
import { DocumentReview } from "@/lib/models/document-review"
import { Upload } from "@/lib/models/upload"

/** Live metrics a homepage stat card can bind to. */
export type PublicMetric = "users" | "consultations" | "documents" | "reviews" | "uploads"

export type PublicStats = Record<PublicMetric, number>

const ZERO: PublicStats = { users: 0, consultations: 0, documents: 0, reviews: 0, uploads: 0 }

/** Live counts for the public homepage "results in numbers" section. */
export async function getPublicStats(): Promise<PublicStats> {
  try {
    await dbConnect()
    const [users, consultations, documents, reviews, uploads] = await Promise.all([
      User.estimatedDocumentCount(),
      Consultation.estimatedDocumentCount(),
      GeneratedDocument.estimatedDocumentCount(),
      DocumentReview.estimatedDocumentCount(),
      Upload.estimatedDocumentCount(),
    ])
    return { users, consultations, documents, reviews, uploads }
  } catch {
    return { ...ZERO }
  }
}

/**
 * Resolve a stat card's metric: an explicit binding wins; otherwise infer from
 * the Georgian label so existing CMS cards light up without rebinding.
 */
export function resolveMetric(explicit: string | undefined, label: string): PublicMetric | null {
  if (explicit && explicit in ZERO) return explicit as PublicMetric
  const l = (label || "").toLowerCase()
  if (l.includes("მომხმარებ")) return "users"
  if (l.includes("კითხვ") || l.includes("კონსულტაც")) return "consultations"
  if (l.includes("შაბლონ")) return "documents"
  if (l.includes("დამუშავ") || l.includes("მიმოხილ")) return "reviews"
  if (l.includes("ფაილ") || l.includes("ატვირთ")) return "uploads"
  if (l.includes("დოკუმენტ")) return "documents"
  return null
}
