import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const items = await User.find()
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return NextResponse.json({
    items: items.map((u) => ({
      id: String((u as { _id: unknown })._id),
      name: u.name,
      email: u.email,
      image: u.image ?? null,
      role: u.role ?? "user",
      plan: u.plan ?? "free",
      consultationsRemaining: u.consultationsRemaining ?? 0,
      createdAt: (u as { createdAt?: Date }).createdAt ?? null,
    })),
  });
}
