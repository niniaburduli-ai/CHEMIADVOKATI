import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Upload } from "@/lib/models/upload";
import { Consultation } from "@/lib/models/consultation";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { DocumentReview } from "@/lib/models/document-review";
import {
  AdminDashboard,
  type UploadRow,
  type UserRow,
  type ConsultationRow,
  type GeneratedDocRow,
  type ReviewRow,
} from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/dashboard");

  await dbConnect();

  const [uploads, users, consultations, generatedDocs, reviews] = await Promise.all([
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
  ]);

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
  }));

  const consultationRows: ConsultationRow[] = consultations.map((c) => {
    const owner = c.userId as unknown as
      | { _id: unknown; name?: string; email?: string }
      | null;
    return {
      id: String((c as { _id: unknown })._id),
      question: c.question,
      answer: c.answer,
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
      createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
    };
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <AdminDashboard
        initialUploads={uploadRows}
        initialUsers={userRows}
        initialConsultations={consultationRows}
        initialGeneratedDocs={generatedDocRows}
        initialReviews={reviewRows}
        currentUserId={session.user.id}
      />
    </div>
  );
}
