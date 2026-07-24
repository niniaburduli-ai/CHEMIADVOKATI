import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { User } from "@/lib/models/user";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const items = await GeneratedDocument.find()
    .select("userId title type costUsd createdAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .populate({ path: "userId", model: User, select: "name email" })
    .lean();

  return NextResponse.json({
    items: items.map((d) => {
      const owner = d.userId as unknown as { name?: string; email?: string } | null;
      return {
        id: String((d as { _id: unknown })._id),
        title: d.title,
        type: d.type,
        costUsd: d.costUsd ?? 0,
        createdAt: (d as { createdAt?: Date }).createdAt?.toISOString() ?? null,
        owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
      };
    }),
  });
}
