import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MessagesSquare,
  FileText,
  FileSearch,
  CreditCard,
  Clock,
  ArrowRight,
  User2,
} from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Consultation } from "@/lib/models/consultation";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { DocumentReview } from "@/lib/models/document-review";
import { Subscription } from "@/lib/models/subscription";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";
import { DOC_TYPES } from "@/lib/validators";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  free: "უფასო",
  standard: "სტანდარტი",
  premium: "პრემიუმი",
};

const STATUS_LABELS: Record<string, string> = {
  active: "აქტიური",
  on_hold: "შეჩერებული",
  cancelled: "გაუქმებული",
  expired: "ვადაგასული",
  failed: "შეცდომა",
};

function CreditStat({
  label,
  remaining,
  total,
  icon,
}: {
  label: string;
  remaining: number;
  total: number;
  icon: React.ReactNode;
}) {
  const used = Math.max(0, total - remaining);
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const isUnlimited = total >= 9999;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-bold tabular-nums">
          {isUnlimited ? (
            <span className="text-primary">∞</span>
          ) : (
            <>
              {remaining}
              <span className="text-base font-normal text-muted-foreground">
                /{total}
              </span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isUnlimited ? (
          <p className="text-xs text-muted-foreground">შეუზღუდავი</p>
        ) : (
          <>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-primary transition-all rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{used} გამოყენებული</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");

  await dbConnect();

  const [user, sub, consultations, documents, reviews] = await Promise.all([
    User.findById(session.user.id).select("-passwordHash").lean(),
    Subscription.findOne({ userId: session.user.id }).lean(),
    Consultation.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    GeneratedDocument.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    DocumentReview.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  if (!user) redirect("/login");

  const plan = (user.plan ?? "free") as Plan;
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const initials = (user.name ?? "?")
    .split(" ")
    .map((w: string) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const subStatus = user.subscriptionStatus || (sub as { status?: string } | null)?.status || null;
  const periodEnd = (sub as { currentPeriodEnd?: Date } | null)?.currentPeriodEnd
    ? new Date((sub as { currentPeriodEnd: Date }).currentPeriodEnd).toLocaleDateString("ka-GE")
    : null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      {/* ── Profile header ─────────────────────────────── */}
      <div className="flex items-center gap-5 mb-10 flex-wrap">
        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 select-none">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{user.name}</h1>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={plan === "free" ? "secondary" : "default"}>
              {PLAN_LABELS[plan] ?? plan}
            </Badge>
            {subStatus && (
              <Badge
                variant={subStatus === "active" ? "default" : "destructive"}
                className="text-xs"
              >
                {STATUS_LABELS[subStatus] ?? subStatus}
              </Badge>
            )}
            {periodEnd && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {periodEnd}-მდე
              </span>
            )}
          </div>
        </div>
        <Link
          href="/billing"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          გამოწერა
        </Link>
      </div>

      {/* ── Credit stats ───────────────────────────────── */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        ლიმიტები
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <CreditStat
          label="კონსულტაციები"
          remaining={user.consultationsRemaining ?? 0}
          total={limits.consultations}
          icon={<MessagesSquare className="h-3.5 w-3.5" />}
        />
        <CreditStat
          label="დოკ. გენერაცია"
          remaining={user.docGenerationRemaining ?? 0}
          total={limits.docGeneration}
          icon={<FileText className="h-3.5 w-3.5" />}
        />
        <CreditStat
          label="დოკ. ანალიზი"
          remaining={user.docReviewRemaining ?? 0}
          total={limits.docReview}
          icon={<FileSearch className="h-3.5 w-3.5" />}
        />
      </div>

      {/* ── Upgrade banner (free users only) ──────────── */}
      {plan === "free" && (
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-sm">განაახლე სტანდარტ გეგმაზე</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                მეტი ლიმიტი, AI კონსულტაციები, დოკუმენტების გენერაცია
              </p>
            </div>
            <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
              გეგმები
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Consultation history preview ───────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <MessagesSquare className="h-4 w-4" />
            AI კონსულტაციები
          </h2>
          <Link
            href="/dashboard/consultations"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ყველა
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
        <Card>
          <CardContent className="py-0">
            {consultations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                ჯერ კონსულტაცია არ გაქვს.{" "}
                <Link href="/chat" className="underline text-primary">
                  დაიწყე
                </Link>
              </p>
            ) : (
              <div className="divide-y">
                {consultations.map((c) => {
                  const id = String((c as { _id: unknown })._id);
                  const created = (c as { createdAt?: Date }).createdAt;
                  return (
                    <div
                      key={id}
                      className="py-3 flex items-start justify-between gap-4"
                    >
                      <p className="text-sm truncate flex-1 font-medium">
                        {c.question}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {created
                          ? new Date(created).toLocaleDateString("ka-GE")
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Generated documents preview ────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            გენერირებული დოკუმენტები
          </h2>
          <Link
            href="/dashboard/documents"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ყველა
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
        <Card>
          <CardContent className="py-0">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                ჯერ დოკუმენტი არ შექმნილა.{" "}
                <Link href="/generate" className="underline text-primary">
                  შექმენი
                </Link>
              </p>
            ) : (
              <div className="divide-y">
                {documents.map((d) => {
                  const id = String((d as { _id: unknown })._id);
                  const created = (d as { createdAt?: Date }).createdAt;
                  const typeName =
                    DOC_TYPES[d.type as keyof typeof DOC_TYPES] ?? d.type;
                  return (
                    <div
                      key={id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {d.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {typeName}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {created
                          ? new Date(created).toLocaleDateString("ka-GE")
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Document review history preview ────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <FileSearch className="h-4 w-4" />
            ანალიზის შედეგები
          </h2>
          <Link
            href="/dashboard/reviews"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ყველა
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
        <Card>
          <CardContent className="py-0">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                ჯერ ანალიზი არ გაქვს.{" "}
                <Link href="/review" className="underline text-primary">
                  ატვირთე
                </Link>
              </p>
            ) : (
              <div className="divide-y">
                {reviews.map((r) => {
                  const id = String((r as { _id: unknown })._id);
                  const created = (r as { createdAt?: Date }).createdAt;
                  return (
                    <div key={id} className="py-3">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <p className="text-sm font-medium truncate flex-1">
                          {r.fileName ?? "document"}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {created
                            ? new Date(created).toLocaleDateString("ka-GE")
                            : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {r.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
