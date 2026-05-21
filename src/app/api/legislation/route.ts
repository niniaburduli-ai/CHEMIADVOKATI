import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { LegislationDoc } from "@/lib/models/legislation";
import { LegislationQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = LegislationQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { q, code, limit, skip } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (code) filter.code = code;
  if (q) filter.$text = { $search: q };

  const [items, total] = await Promise.all([
    LegislationDoc.find(filter)
      .select("-embedding")
      .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LegislationDoc.countDocuments(filter),
  ]);

  return NextResponse.json({ items, total, limit, skip });
}
