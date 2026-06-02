import Link from "next/link";
import {
  ShieldCheck,
  MessagesSquare,
  BookOpen,
  Clock,
  Check,
  ArrowRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: MessagesSquare,
    title: "მარტივი ენით",
    body: "გართულებული ტერმინების გარეშე. პასუხი ისე, როგორც მეგობარს ეკითხები.",
  },
  {
    icon: BookOpen,
    title: "ოფიციალური წყაროები",
    body: "ყოველი პასუხი ეფუძნება საქართველოს კოდექსებსა და სასამართლო პრაქტიკას.",
  },
  {
    icon: Clock,
    title: "24/7 ხელმისაწვდომი",
    body: "დაელოდე არ მოგიწევს — პასუხი წამებში.",
  },
  {
    icon: ShieldCheck,
    title: "კონფიდენციალური",
    body: "შენი მონაცემები დაცულია. არავის გადაეცემა.",
  },
];

const plans = [
  {
    name: "უფასო",
    price: "0₾",
    period: "/თვე",
    cta: "დაიწყე",
    href: "/register",
    items: [
      "1 კონსულტაცია თვეში",
      "კანონმდებლობის დათვალიერება",
      "საბაზო პასუხები",
    ],
  },
  {
    name: "სტანდარტი",
    price: "$5",
    period: "/თვე",
    highlighted: true,
    cta: "შეუერთდი",
    href: "/pricing",
    items: [
      "10 კონსულტაცია თვეში",
      "ოფიციალური წყაროების ციტირება",
      "კონსულტაციების ისტორია",
      "პრიორიტეტული პასუხი",
    ],
  },
];

export default function Home() {
  return (
    <div className="container mx-auto px-4">
      <section className="py-20 md:py-28 text-center max-w-3xl mx-auto">
        <Badge variant="secondary" className="mb-4">
          ახალი — AI იურისტი ქართულად
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight md:leading-[1.2]">
          იურიდიული რჩევა ისე, როგორც გესმის
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          ჰკითხე ნებისმიერ იურიდიულ შეკითხვაზე — ჩვენ ვუპასუხებთ მარტივი
          ენით და საქართველოს კანონებზე დაყრდნობით.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/chat" className={buttonVariants({ size: "lg" })}>
            დაიწყე უფასოდ <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/pricing" className={buttonVariants({ size: "lg", variant: "outline" })}>
            გეგმების ნახვა
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          საკრედიტო ბარათი არ არის საჭირო
        </p>
      </section>

      <section className="py-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-6">
              <f.icon className="h-6 w-6 mb-3" />
              <div className="font-semibold mb-1">{f.title}</div>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="py-20 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">აირჩიე გეგმა</h2>
          <p className="mt-3 text-muted-foreground">
            გაუქმება ნებისმიერ დროს, დამატებითი ხარჯების გარეშე.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={p.highlighted ? "border-primary shadow-lg" : ""}
            >
              <CardContent className="pt-6">
                {p.highlighted && <Badge className="mb-3">პოპულარული</Badge>}
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={buttonVariants({
                    variant: p.highlighted ? "default" : "outline",
                    className: "mt-6 w-full",
                  })}
                >
                  {p.cta}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-20 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold">მზად ხარ?</h2>
        <p className="mt-3 text-muted-foreground">
          დაარეგისტრირდი წამში და მიიღე პირველი კონსულტაცია უფასოდ.
        </p>
        <Link href="/register" className={buttonVariants({ size: "lg", className: "mt-6" })}>
          რეგისტრაცია
        </Link>
      </section>
    </div>
  );
}
