import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { CheckoutSchema } from "@/lib/validators";
import { getDodoClient, productIdForPlan } from "@/lib/dodo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Base URL for post-checkout redirect. */
function appUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { plan } = parsed.data;

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let productId: string;
  try {
    productId = productIdForPlan(plan);
  } catch {
    // Plan not configured yet (e.g. premium product id not provided).
    return NextResponse.json(
      { error: `Plan "${plan}" is not available yet.` },
      { status: 503 }
    );
  }

  try {
    const dodo = getDodoClient();
    const checkout = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email, name: user.name },
      return_url: `${appUrl()}/billing?status=success`,
      // Echoed back on subscription webhooks so we can map to the user/plan.
      metadata: { userId: String(user._id), plan },
    });

    if (!checkout.checkout_url) {
      return NextResponse.json(
        { error: "Checkout URL missing from provider response" },
        { status: 502 }
      );
    }
    return NextResponse.json({ checkoutUrl: checkout.checkout_url });
  } catch (err) {
    return NextResponse.json(
      { error: "Payment provider error", detail: String(err instanceof Error ? err.message : err) },
      { status: 502 }
    );
  }
}
