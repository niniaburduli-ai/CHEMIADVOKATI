import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { DocumentReview } from "@/lib/models/document-review";
import { User } from "@/lib/models/user";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const items = await DocumentReview.find()
    .select("userId fileName summary findings recommendations costUsd createdAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .populate({ path: "userId", model: User, select: "name email" })
    .lean();

  return NextResponse.json({
    items: items.map((r) => {
      const owner = r.userId as unknown as { name?: string; email?: string } | null;
      return {
        id: String((r as { _id: unknown })._id),
        fileName: r.fileName ?? "document",
        summary: r.summary,
        findingsCount: (r.findings ?? []).length,
        recommendationsCount: (r.recommendations ?? []).length,
        costUsd: r.costUsd ?? 0,
        createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? null,
        owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
      };
    }),
  });
}
