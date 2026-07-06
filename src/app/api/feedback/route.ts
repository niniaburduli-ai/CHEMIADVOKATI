import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Feedback } from "@/lib/models/Feedback";
import { FeedbackCreateSchema } from "@/lib/validators";
import { getFeedbackSummary } from "@/lib/feedback";
import { getSiteConfig } from "@/lib/cms";
import { sendFeedbackEmail, fromAddress } from "@/lib/mailer";

export const runtime = "nodejs";

export async function GET() {
  const summary = await getFeedbackSummary();
  return NextResponse.json(summary);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FeedbackCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  await Feedback.create({ rating: parsed.data.rating, message: parsed.data.message });

  try {
    const siteConfig = await getSiteConfig();
    const to = siteConfig.contactEmail || fromAddress();
    if (to) await sendFeedbackEmail(to, parsed.data);
  } catch {
    // Email delivery failure shouldn't fail the submission — feedback is already saved.
  }

  const summary = await getFeedbackSummary();
  return NextResponse.json(summary, { status: 201 });
}
