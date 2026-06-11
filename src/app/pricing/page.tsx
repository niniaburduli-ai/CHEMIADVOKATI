import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpgradeButton } from "@/components/site/upgrade-button";

type PricingPlan = {
  name: string;
  price: string;
  period: string;
  desc: string;
  highlight?: boolean;
  items: string[];
  cta: string;
  href: string;
  plan?: "standard" | "premium";
};

const plans: PricingPlan[] = [
  {
    name: "უფასო",
    price: "0₾",
    period: "/თვე",
    desc: "სცადე როგორ მუშაობს",
    items: [
      "1 კონსულტაცია თვეში",
      "კანონმდებლობის დათვალიერება",
      "საბაზო AI პასუხები",
    ],
    cta: "დაიწყე",
    href: "/register",
  },
  {
    name: "სტანდარტი",
    price: "$5",
    period: "/თვე",
    desc: "ყველაზე პოპულარული",
    highlight: true,
    items: [
      "10 კონსულტაცია თვეში",
      "მუხლების ციტირება",
      "კონსულტაციების ისტორია",
      "პრიორიტეტული პასუხი",
      "გაუქმება ნებისმიერ დროს",
    ],
    cta: "შეუერთდი",
    href: "/billing",
    plan: "standard",
  },
  {
    name: "პრო",
    price: "$15",
    period: "/თვე",
    desc: "ხშირი მომხმარებლისთვის",
    items: [
      "50 კონსულტაცია თვეში",
      "დოკუმენტის ანალიზი",
      "ადვოკატთან კავშირი",
      "ყველაფერი სტანდარტიდან",
    ],
    cta: "შეუერთდი",
    href: "/billing",
    plan: "premium",
  },
];

const faqs = [
  {
    q: "შემიძლია ნებისმიერ დროს გაუქმება?",
    a: "კი. ანგარიშის გვერდიდან ერთი დაკლიკებით.",
  },
  {
    q: "რა ხდება გამოუყენებელ კონსულტაციებთან?",
    a: "თვის ბოლოს განულდება. დაუბრუნდი ხშირად!",
  },
  {
    q: "უსაფრთხოა ჩემი მონაცემები?",
    a: "კი. ვიყენებთ შიფრაციას და არასოდეს ვუზიარებთ მესამე მხარეს.",
  },
  {
    q: "AI პასუხები სიზუსტისთვის რამდენად საიმედოა?",
    a: "AI გვაძლევს კარგ საწყის წერტილს, მაგრამ რთული საკითხებისთვის გირჩევთ ადვოკატთან კონსულტაციას.",
  },
];

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold">მარტივი ფასები</h1>
        <p className="mt-4 text-muted-foreground">
          აირჩიე გეგმა, რომელიც გერგება. ფარული გადასახადები არ არის.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {plans.map((p) => (
          <Card
            key={p.name}
            className={p.highlight ? "border-primary shadow-lg relative" : ""}
          >
            {p.highlight && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                პოპულარული
              </Badge>
            )}
            <CardContent className="pt-6">
              <div className="text-lg font-semibold">{p.name}</div>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              {p.plan ? (
                <UpgradeButton
                  plan={p.plan}
                  label={p.cta}
                  variant={p.highlight ? "default" : "outline"}
                />
              ) : (
                <Link
                  href={p.href}
                  className={buttonVariants({
                    variant: p.highlight ? "default" : "outline",
                    className: "mt-6 w-full",
                  })}
                >
                  {p.cta}
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="max-w-2xl mx-auto mt-20">
        <h2 className="text-2xl font-bold text-center mb-8">ხშირი კითხვები</h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <Card key={f.q}>
              <CardContent className="pt-5">
                <div className="font-medium">{f.q}</div>
                <p className="text-sm text-muted-foreground mt-1">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
