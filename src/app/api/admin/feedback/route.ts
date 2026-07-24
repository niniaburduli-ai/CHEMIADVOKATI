import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { Feedback } from "@/lib/models/Feedback";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const items = await Feedback.find().sort({ createdAt: -1 }).limit(500).lean();

  return NextResponse.json({
    items: items.map((f) => ({
      id: String((f as { _id: unknown })._id),
      rating: f.rating ?? null,
      message: f.message ?? "",
      createdAt: (f as { createdAt?: Date }).createdAt?.toISOString() ?? null,
    })),
  });
}
