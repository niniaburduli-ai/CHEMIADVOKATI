import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email(),
  role: z.enum(["user", "admin"]),
});

export async function POST(req: Request) {
  const session = await auth();
  const caller = session?.user as { id?: string; role?: string } | undefined;
  if (!caller?.id || caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  await dbConnect();
  const updated = await User.findOneAndUpdate(
    { email: parsed.data.email.toLowerCase() },
    { role: parsed.data.role },
    { new: true, select: "email name role" }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: updated });
}
