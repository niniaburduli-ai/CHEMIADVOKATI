import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  Check,
  ArrowRight,
  MessageSquare,
  FileText,
  FolderOpen,
  MousePointerClick,
  Zap,
  Layers,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpgradeButton } from "@/components/site/upgrade-button";
import { dbConnect } from "@/lib/db";
import {
  Consultation,
  DocumentReview,
  GeneratedDocument,
  User,
} from "@/lib/models";

async function getStats() {
  try {
    await dbConnect();
    const [questions, documents, templates, users] = await Promise.all([
      Consultation.countDocuments(),
      DocumentReview.countDocuments(),
      GeneratedDocument.countDocuments(),
      User.countDocuments(),
    ]);
    return { questions, documents, templates, users };
  } catch {
    return { questions: 0, documents: 0, templates: 0, users: 0 };
  }
}

const features = [
  {
    num: "1",
    Icon: MousePointerClick,
    title: "მარტივი გამოყენება",
    body: "დასვით კითხვა, გამოიყენეთ შაბლონები ან ატვირთეთ დოკუმენტი მარტივად. პლატფორმა შექმნილია ყველასთვის.",
  },
  {
    num: "2",
    Icon: Zap,
    title: "სწრაფი პასუხები",
    body: "მიიღეთ თქვენთვის საჭირო ინფორმაცია წამებში.",
  },
  {
    num: "3",
    Icon: Layers,
    title: "ერთ სივრცეში",
    body: "იურიდიული კონსულტაცია, დოკუმენტების შემოწმება და შაბლონები — ყველაფერი ერთ პლატფორმაზე.",
  },
  {
    num: "4",
    Icon: ShieldCheck,
    title: "უსაფრთხო გარემო",
    body: "თქვენი კითხვები და დოკუმენტები მუშავდება კონფიდენციალურად და უსაფრთხოდ.",
  },
  {
    num: "5",
    Icon: Clock,
    title: "24/7 ხელმისაწვდომობა",
    body: "მიიღეთ იურიდიული ინფორმაცია ნებისმიერ დროს, თქვენთვის მოსახერხებელ მომენტში.",
  },
];

const plans = [
  {
    name: "საბაზისო პაკეტი",
    price: "0",
    badge: null,
    cta: "დაიწყეთ უფასოდ",
    href: "/register",
    highlighted: false,
    items: [
      "9 კონსულტაცია AI იურისტთან",
      "ოფიციალური წყაროების მითითება",
      "კითხვების ისტორიის ნახვა",
    ],
  },
  {
    name: "სტანდარტული პაკეტი",
    price: "19",
    badge: "ყველაზე პოპულარული",
    cta: "აირჩიეთ პაკეტი",
    href: "/register",
    plan: "standard" as const,
    highlighted: true,
    items: [
      "29 კონსულტაცია AI იურისტთან",
      "19 შაბლონის გენერირება",
      "9 დოკუმენტის შემოწმება",
      "ოფიციალური წყაროების მითითება",
      "კითხვების ისტორიის ნახვა",
    ],
  },
  {
    name: "პრემიუმ (ბიზნეს) პაკეტი",
    price: "99",
    badge: null,
    cta: "აირჩიეთ პაკეტი",
    href: "/register",
    plan: "premium" as const,
    highlighted: false,
    items: [
      "შეუზღუდავი კონსულტაცია AI იურისტთან",
      "შეუზღუდავი შაბლონის გენერირება",
      "99 დოკუმენტის/ხელშეკრულების შემოწმება",
      "ოფიციალური წყაროების მითითება",
      "კითხვების ისტორიის ნახვა",
      "გაფართოებული იურიდიული ანალიზი",
    ],
  },
];


export default async function Home() {
  const stats = await getStats();

  const statCards = [
    { icon: MessageSquare, value: stats.questions,  label: "დასმული კითხვა" },
    { icon: FileText,      value: stats.documents,  label: "დამუშავებული დოკუმენტი" },
    { icon: Layers,        value: stats.templates,  label: "გამოყენებული შაბლონი" },
    { icon: Users,         value: stats.users,      label: "რეგისტრირებული მომხმარებელი" },
  ];

  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#ededff] via-[#eef0ff] to-[#e8eaff]">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div>

            {/* Hero content */}
            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-7xl font-bold text-[#1a1a2e] leading-none mb-3 tracking-tight">
                ჩემი იურისტი
              </h1>
              <p className="text-3xl md:text-4xl text-[#4338ca] mb-10 font-semibold">
                კანონი მარტივ ენაზე
              </p>

              {/* Service cards */}
              <div className="grid grid-cols-3 gap-3 max-w-xl">
                {/* Card 1 — active */}
                <Link
                  href="/chat"
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col gap-1 group"
                >
                  <MessageSquare className="h-7 w-7 text-[#6366f1] mb-1" />
                  <span className="font-bold text-[#1a1a2e] text-base leading-snug">AI იურისტი</span>
                  <span className="text-sm text-gray-500 leading-snug">დასვი კითხვა</span>
                  <ArrowRight className="h-5 w-5 text-[#6366f1] mt-2 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Card 2 — coming soon */}
                <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-1 cursor-default">
                  <span className="text-[10px] text-gray-400 font-medium tracking-wide mb-0.5 uppercase">
                    მალე დაემატება
                  </span>
                  <FileText className="h-7 w-7 text-[#a5b4fc] mb-1" />
                  <span className="font-bold text-[#6b7280] text-base leading-snug">შაბლონები</span>
                  <span className="text-sm text-gray-400 leading-snug">შექმენი შაბლონი</span>
                  <ArrowRight className="h-5 w-5 text-gray-300 mt-2" />
                </div>

                {/* Card 3 — coming soon */}
                <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-1 cursor-default">
                  <span className="text-[10px] text-gray-400 font-medium tracking-wide mb-0.5 uppercase">
                    მალე დაემატება
                  </span>
                  <FolderOpen className="h-7 w-7 text-[#a5b4fc] mb-1" />
                  <span className="font-bold text-[#6b7280] text-base leading-snug">დოკუმენტები</span>
                  <span className="text-sm text-gray-400 leading-snug">შეამოწმე დოკუმენტი</span>
                  <ArrowRight className="h-5 w-5 text-gray-300 mt-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="container mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1a1a2e] mb-10">
          ჩვენი შედეგები ციფრებში
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="bg-[#f7f7ff] border border-[#e0e0ff] rounded-2xl px-6 py-7 flex items-center gap-4"
            >
              <div className="shrink-0 w-12 h-12 rounded-full bg-[#ededff] flex items-center justify-center">
                <Icon className="h-6 w-6 text-[#6366f1]" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[#3730a3] leading-none">
                  {value.toLocaleString()}+
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY SECTION ── */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1a1a2e] mb-12">
          რატომ ჩემი იურისტი?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {features.map((f) => (
            <div key={f.num} className="flex flex-col items-center text-center gap-3">
              {/* Icon circle */}
              <div className="w-16 h-16 rounded-full bg-[#ededff] flex items-center justify-center shrink-0">
                <f.Icon className="h-7 w-7 text-[#6366f1]" />
              </div>
              {/* Numbered title */}
              <p className="font-bold text-[#3730a3] text-sm leading-snug">
                {f.num}. {f.title}
              </p>
              {/* Description */}
              <p className="text-xs text-gray-500 leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1a1a2e] mb-12">
          აირჩიე თქვენზე მორგებული პაკეტი
        </h2>
        <div className="grid gap-6 md:grid-cols-3 items-start">
          {plans.map((p) => (
            <div
              key={p.name}
              className={[
                "relative rounded-2xl border bg-white flex flex-col p-7",
                p.highlighted
                  ? "border-[#6366f1] shadow-lg shadow-indigo-100"
                  : "border-[#e5e7eb]",
              ].join(" ")}
            >
              {/* Popular badge — above card top edge */}
              {p.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#6366f1] text-white text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
                    {p.badge}
                  </span>
                </div>
              )}

              {/* Plan name */}
              <p className={[
                "font-bold text-base mb-4",
                p.highlighted ? "text-[#4338ca]" : "text-[#3730a3]",
              ].join(" ")}>
                {p.name}
              </p>

              {/* Price */}
              <div className="flex items-end gap-1 mb-6">
                <span className="text-5xl font-bold text-[#1a1a2e] leading-none">
                  {p.price}
                </span>
                <span className="text-lg font-semibold text-[#1a1a2e] mb-0.5">₾</span>
                <span className="text-sm text-gray-400 mb-1">/ თვეში</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 text-sm flex-1 mb-8">
                {p.items.map((item) => (
                  <li key={item} className="flex gap-2.5 items-start">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#6366f1]" />
                    <span className="text-gray-700 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {"plan" in p && p.plan ? (
                <UpgradeButton
                  plan={p.plan}
                  label={p.cta}
                  className={[
                    "w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60",
                    p.highlighted
                      ? "bg-[#4338ca] hover:bg-[#3730a3] text-white"
                      : "border border-[#c7d2fe] text-[#4338ca] hover:bg-[#ededff]",
                  ].join(" ")}
                />
              ) : (
                <Link
                  href={p.href}
                  className={[
                    "w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors",
                    p.highlighted
                      ? "bg-[#4338ca] hover:bg-[#3730a3] text-white"
                      : "border border-[#c7d2fe] text-[#4338ca] hover:bg-[#ededff]",
                  ].join(" ")}
                >
                  {p.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center max-w-2xl">
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
