import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { RegisterSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  await dbConnect();
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Free-tier quota comes from the User schema's defaults (the Basic plan's
  // one-time lifetime allowance) — no need to set it here.
  const user = await User.create({
    name,
    email,
    passwordHash,
    plan: "free",
  });

  return NextResponse.json(
    {
      id: String(user._id),
      email: user.email,
      name: user.name,
    },
    { status: 201 }
  );
}
