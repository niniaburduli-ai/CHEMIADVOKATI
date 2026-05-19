import Link from "next/link";
import { MessagesSquare, FileText, CreditCard, Clock } from "lucide-react";
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

const mockHistory = [
  {
    id: "1",
    question: "შრომითი ხელშეკრულების შეწყვეტა შეუძლია დამსაქმებელს ერთი დღით ადრე?",
    date: "2026-05-10",
    code: "შრომის კოდექსი, მუხლი 47",
  },
  {
    id: "2",
    question: "როგორ ვიყიდო ბინა იპოთეკით?",
    date: "2026-05-06",
    code: "სამოქალაქო კოდექსი, მუხლი 286",
  },
  {
    id: "3",
    question: "შემიძლია მეზობლის ხმაურზე საჩივარი დავწერო?",
    date: "2026-04-29",
    code: "ადმინისტრაციულ სამართალდარღვევათა კოდექსი, მუხლი 174",
  },
];

export default function DashboardPage() {
  const used = 3;
  const total = 10;
  const remaining = total - used;
  const percent = (used / total) * 100;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">გამარჯობა, ნინო</h1>
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
              <div
                className="h-full bg-primary"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              განახლდება 1 ივნისს
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>გეგმა</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              სტანდარტი <Badge>$5/თვე</Badge>
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
            <CardDescription>დაცული მუხლები</CardDescription>
            <CardTitle className="text-3xl">12</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/legislation" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <FileText className="mr-2 h-4 w-4" /> ნახვა
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
          <div className="space-y-3">
            {mockHistory.map((h, i) => (
              <div key={h.id}>
                <Link
                  href={`/chat/${h.id}`}
                  className="flex items-start justify-between gap-4 py-2 hover:bg-muted/40 -mx-2 px-2 rounded"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{h.question}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {h.code}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {h.date}
                  </div>
                </Link>
                {i < mockHistory.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
