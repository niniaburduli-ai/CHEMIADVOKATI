import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { Upload } from "@/lib/models/upload";
import { User } from "@/lib/models/user";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const items = await Upload.find()
    .sort({ createdAt: -1 })
    .limit(500)
    .populate({ path: "userId", model: User, select: "name email" })
    .lean();

  return NextResponse.json({
    items: items.map((u) => {
      const owner = u.userId as unknown as { _id: unknown; name?: string; email?: string } | null;
      return {
        id: String((u as { _id: unknown })._id),
        url: u.url,
        publicId: u.publicId,
        bytes: u.bytes,
        format: u.format ?? null,
        resourceType: u.resourceType,
        originalName: u.originalName ?? null,
        note: u.note ?? "",
        createdAt: (u as { createdAt?: Date }).createdAt ?? null,
        owner: owner
          ? { id: String(owner._id), name: owner.name ?? null, email: owner.email ?? null }
          : null,
      };
    }),
  });
}
