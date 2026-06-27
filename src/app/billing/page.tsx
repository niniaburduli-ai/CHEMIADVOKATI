import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Receipt } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Payment } from "@/lib/models/payment";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CancelSubscriptionButton } from "@/components/site/cancel-subscription-button";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/site/PageHero";

export const dynamic = "force-dynamic";

const fmtDate = (d?: Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "—";
const fmtAmount = (minor: number, currency = "GEL") =>
  `${(minor / 100).toFixed(2)} ${currency === "GEL" ? "₾" : currency}`;

export default async function BillingPage() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/login?callbackUrl=/billing");

  const d = getDict(locale);

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/login");

  const plan = (user.plan ?? "free") as string;

  const PLAN_INFO: Record<string, { label: string; price: string }> = {
    free: { label: d.billing.planFree, price: d.billing.priceFree },
    standard: { label: d.billing.planStandard, price: d.billing.priceStandard },
    premium: { label: d.billing.planPremium, price: d.billing.pricePremium },
  };

  const STATUS_LABEL: Record<string, string> = {
    active: d.billing.statusActive,
    pending: d.billing.statusPending,
    canceled: d.billing.statusCanceled,
    declined: d.billing.statusDeclined,
    expired: d.billing.statusExpired,
    reversed: d.billing.statusReversed,
  };

  const info = PLAN_INFO[plan] ?? PLAN_INFO.free;
  const isPaid = plan !== "free";
  const status = user.subscriptionStatus || (isPaid ? "active" : "");

  const payments = await Payment.find({ userId: session.user.id })
    .sort({ paidAt: -1 })
    .limit(50)
    .lean();

  return (
    <div>
      <PageHero title={d.billing.title} subtitle={d.billing.subtitle} />
    <div className="container mx-auto px-4 py-16 max-w-3xl animate-fade-up">

      <Card className="mb-6 border-t-[3px] border-t-primary rounded-2xl">
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <CardTitle>{d.billing.currentPlan}</CardTitle>
              <CardDescription>
                {isPaid ? d.billing.activeSub : d.billing.freePlanLabel}
              </CardDescription>
            </div>
            {status && (
              <Badge variant={status === "active" ? "default" : "secondary"}>
                {STATUS_LABEL[status] ?? status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{info.label}</span>
            <span className="text-muted-foreground">— {info.price}</span>
          </div>
          {isPaid && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {d.billing.nextPayment} {fmtDate(user.resetAt)}
            </div>
          )}
          <div className="mt-6 flex gap-2 flex-wrap">
            <Link href="/pricing" className={buttonVariants() + " btn-hover"}>
              {isPaid ? d.billing.changePlan : d.billing.choosePlan}
            </Link>
            {isPaid && status !== "canceled" && <CancelSubscriptionButton locale={locale} />}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-t-[3px] border-t-primary">
        <CardHeader>
          <CardTitle>{d.billing.paymentHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Receipt className="h-4 w-4" />
              {d.billing.noPayments}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p, i) => {
                const id = String((p as { _id: unknown })._id);
                return (
                  <div key={id}>
                    <div className="flex items-center justify-between py-2 flex-wrap gap-2">
                      <div>
                        <div className="font-medium text-sm">
                          {PLAN_INFO[p.plan]?.label ?? p.plan}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(p.paidAt as Date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{fmtAmount(p.amount, p.currency)}</span>
                        <Badge variant="secondary">
                          {STATUS_LABEL[p.status ?? "approved"] ?? d.billing.statusPaid}
                        </Badge>
                      </div>
                    </div>
                    {i < payments.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
