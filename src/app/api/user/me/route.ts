import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select("-passwordHash").lean();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: String(user._id),
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    plan: user.plan,
    consultationsRemaining: user.consultationsRemaining,
    resetAt: user.resetAt ?? null,
  });
}
