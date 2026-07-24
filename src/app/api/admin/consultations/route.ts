import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { Consultation } from "@/lib/models/consultation";
import { User } from "@/lib/models/user";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const items = await Consultation.find()
    .select("userId question answer modelTier costUsd createdAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .populate({ path: "userId", model: User, select: "name email" })
    .lean();

  return NextResponse.json({
    items: items.map((c) => {
      const owner = c.userId as unknown as { name?: string; email?: string } | null;
      return {
        id: String((c as { _id: unknown })._id),
        question: c.question,
        answer: c.answer,
        modelTier: c.modelTier ?? null,
        costUsd: c.costUsd ?? 0,
        createdAt: (c as { createdAt?: Date }).createdAt?.toISOString() ?? null,
        owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
      };
    }),
  });
}
