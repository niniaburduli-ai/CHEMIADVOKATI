import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Upload } from "@/lib/models/upload";
import { Consultation } from "@/lib/models/consultation";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { DocumentReview } from "@/lib/models/document-review";
import { Feedback } from "@/lib/models/Feedback";
import {
  AdminDashboard,
  type UploadRow,
  type UserRow,
  type ConsultationRow,
  type GeneratedDocRow,
  type ReviewRow,
  type FeedbackRow,
} from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

type CostBucket = { _id: string; total: number };

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/dashboard");

  await dbConnect();

  const [
    uploads,
    users,
    consultations,
    generatedDocs,
    reviews,
    feedback,
    consultationCosts,
    docCosts,
    reviewCosts,
  ] = await Promise.all([
    Upload.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    User.find().select("-passwordHash").sort({ createdAt: -1 }).limit(500).lean(),
    Consultation.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    GeneratedDocument.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    DocumentReview.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    Feedback.find().sort({ createdAt: -1 }).limit(500).lean(),
    Consultation.aggregate<CostBucket>([
      { $group: { _id: "$userId", total: { $sum: "$costUsd" } } },
    ]),
    GeneratedDocument.aggregate<CostBucket>([
      { $group: { _id: "$userId", total: { $sum: "$costUsd" } } },
    ]),
    DocumentReview.aggregate<CostBucket>([
      { $group: { _id: "$userId", total: { $sum: "$costUsd" } } },
    ]),
  ]);

  const costByUser = new Map<string, number>();
  for (const bucket of [...consultationCosts, ...docCosts, ...reviewCosts]) {
    const key = String(bucket._id);
    costByUser.set(key, (costByUser.get(key) ?? 0) + bucket.total);
  }

  const uploadRows: UploadRow[] = uploads.map((u) => {
    const owner = u.userId as unknown as
      | { _id: unknown; name?: string; email?: string }
      | null;
    return {
      id: String((u as { _id: unknown })._id),
      url: u.url,
      publicId: u.publicId,
      bytes: u.bytes,
      format: u.format ?? null,
      resourceType: u.resourceType,
      originalName: u.originalName ?? null,
      note: u.note ?? "",
      createdAt: (u as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
    };
  });

  const userRows: UserRow[] = users.map((u) => ({
    id: String((u as { _id: unknown })._id),
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    role: (u.role ?? "user") as "user" | "admin",
    plan: (u.plan ?? "free") as string,
    consultationsRemaining: u.consultationsRemaining ?? 0,
    docGenerationRemaining: u.docGenerationRemaining ?? 0,
    docReviewRemaining: u.docReviewRemaining ?? 0,
    docTemplatesRemaining: u.docTemplatesRemaining ?? 0,
    planExpiresAt: u.planExpiresAt ? new Date(u.planExpiresAt).toISOString() : null,
    createdAt: (u as { createdAt?: Date }).createdAt?.toISOString() ?? null,
    totalAiCostUsd: costByUser.get(String((u as { _id: unknown })._id)) ?? 0,
  }));

  const consultationRows: ConsultationRow[] = consultations.map((c) => {
    const owner = c.userId as unknown as
      | { _id: unknown; name?: string; email?: string }
      | null;
    return {
      id: String((c as { _id: unknown })._id),
      question: c.question,
      answer: c.answer,
      modelTier: (c as { modelTier?: string }).modelTier ?? null,
      costUsd: (c as { costUsd?: number }).costUsd ?? 0,
      createdAt: (c as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
    };
  });

  const generatedDocRows: GeneratedDocRow[] = generatedDocs.map((d) => {
    const owner = d.userId as unknown as
      | { _id: unknown; name?: string; email?: string }
      | null;
    return {
      id: String((d as { _id: unknown })._id),
      title: d.title,
      type: d.type,
      costUsd: (d as { costUsd?: number }).costUsd ?? 0,
      createdAt: (d as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
    };
  });

  const reviewRows: ReviewRow[] = reviews.map((r) => {
    const owner = r.userId as unknown as
      | { _id: unknown; name?: string; email?: string }
      | null;
    return {
      id: String((r as { _id: unknown })._id),
      fileName: r.fileName ?? "document",
      summary: r.summary,
      findingsCount: (r.findings ?? []).length,
      recommendationsCount: (r.recommendations ?? []).length,
      costUsd: (r as { costUsd?: number }).costUsd ?? 0,
      createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
    };
  });

  const feedbackRows: FeedbackRow[] = feedback.map((f) => ({
    id: String((f as { _id: unknown })._id),
    rating: f.rating ?? null,
    message: f.message ?? "",
    createdAt: (f as { createdAt?: Date }).createdAt?.toISOString() ?? null,
  }));

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <AdminDashboard
        initialUploads={uploadRows}
        initialUsers={userRows}
        initialConsultations={consultationRows}
        initialGeneratedDocs={generatedDocRows}
        initialReviews={reviewRows}
        initialFeedback={feedbackRows}
        currentUserId={session.user.id}
      />
    </div>
  );
}
