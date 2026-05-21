import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare, FileText, CreditCard, Clock } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Consultation } from "@/lib/models/consultation";
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

export const dynamic = "force-dynamic";

const PLAN_TOTAL = { free: 1, standard: 10 } as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  await dbConnect();
  const user = await User.findById(session.user.id).select("-passwordHash").lean();
  if (!user) redirect("/login");

  const history = await Consultation.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const plan = (user.plan ?? "free") as keyof typeof PLAN_TOTAL;
  const total = PLAN_TOTAL[plan];
  const remaining = user.consultationsRemaining ?? 0;
  const used = Math.max(0, total - remaining);
  const percent = total > 0 ? (used / total) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">გამარჯობა, {user.name}</h1>
          <p className="text-muted-foreground mt-1">აქ ხარ შენი იურიდიული ცენტრი</p>
        </div>
        <Link href="/chat" className={buttonVariants()}>
          <MessagesSquare className="mr-2 h-4 w-4" /> ახალი კონსულტაცია
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>დარჩენილი კონსულტაცია</CardDescription>
            <CardTitle className="text-3xl">{remaining}/{total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full bg-muted rounded overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {user.resetAt
                ? `განახლდება ${new Date(user.resetAt).toLocaleDateString("ka-GE")}`
                : "უფასო ლიმიტი — განახლება ხელით"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>გეგმა</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 capitalize">
              {plan === "standard" ? "სტანდარტი" : "უფასო"}
              {plan === "standard" && <Badge>$5/თვე</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <CreditCard className="mr-2 h-4 w-4" /> მართვა
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>კონსულტაციები</CardDescription>
            <CardTitle className="text-3xl">{history.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/legislation" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <FileText className="mr-2 h-4 w-4" /> კანონმდებლობა
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>კონსულტაციების ისტორია</CardTitle>
          <CardDescription>ბოლო ნახული შეკითხვები</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              ჯერ არცერთი კონსულტაცია არ გაქვს. დაიწყე{" "}
              <Link href="/chat" className="underline">აქ</Link>.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => {
                const id = String((h as { _id: unknown })._id);
                const created = (h as { createdAt?: Date }).createdAt;
                return (
                  <div key={id}>
                    <Link
                      href={`/chat/${id}`}
                      className="flex items-start justify-between gap-4 py-2 hover:bg-muted/40 -mx-2 px-2 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{h.question}</div>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {created ? new Date(created).toLocaleDateString("ka-GE") : ""}
                      </div>
                    </Link>
                    {i < history.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
