import Link from "next/link"
import { MessageSquare, FileText, FolderOpen, ArrowRight, Check } from "lucide-react"
import { getLocale } from "@/lib/i18n/locale"
import { getDict } from "@/lib/i18n/dictionaries"

type ServiceData = {
  id: string
  icon: typeof MessageSquare
  title: string
  subtitle: string
  description: string
  features: string[]
  cta: string
  href: string
  comingSoon: boolean
}

function getServices(locale: "ka" | "en"): ServiceData[] {
  const isEn = locale === "en"
  return [
    {
      id: "ai-assistant",
      icon: MessageSquare,
      title: isEn ? "AI Lawyer" : "AI იურისტი",
      subtitle: isEn ? "Ask a question" : "დასვი კითხვა",
      description: isEn
        ? "Get instant answers to your legal questions using artificial intelligence, available 24/7. Our AI is trained on Georgian legislation and provides accurate, source-backed answers in plain language."
        : "მიიღეთ მყისიერი პასუხები თქვენს იურიდიულ კითხვებზე ხელოვნური ინტელექტის დახმარებით, 24/7 რეჟიმში. ჩვენი AI გაწვრთნილია საქართველოს კანონმდებლობაზე და გაწვდით ზუსტ, წყაროებით გამყარებულ პასუხებს მარტივად გასაგებ ენაზე.",
      features: isEn
        ? [
            "Instant answers based on Georgian legislation",
            "Official legal source citations",
            "Available 24/7, no appointment needed",
            "Full conversation history saved",
            "Follow-up questions supported",
          ]
        : [
            "მყისიერი პასუხები საქართველოს კანონმდებლობის საფუძველზე",
            "ოფიციალური სამართლებრივი წყაროების ციტირება",
            "ხელმისაწვდომია 24/7, წინასწარი ჩაწერის გარეშე",
            "საუბრის სრული ისტორიის შენახვა",
            "დამატებითი კითხვების დასმის მხარდაჭერა",
          ],
      cta: isEn ? "Ask a question" : "დასვი კითხვა",
      href: "/chat",
      comingSoon: false,
    },
    {
      id: "templates",
      icon: FileText,
      title: isEn ? "Templates" : "შაბლონები",
      subtitle: isEn ? "Create a template" : "შექმენი შაბლონი",
      description: isEn
        ? "Create legal documents quickly and easily by filling out a simple questionnaire. The system automatically prepares a ready-to-use document."
        : "შექმენით იურიდიული დოკუმენტები სწრაფად და მარტივად, მარტივი კითხვარის შევსებით. სისტემა ავტომატურად ამზადებს მზად გამოსაყენებელ დოკუმენტს.",
      features: isEn
        ? [
            "Employment and service contracts",
            "Rental and lease agreements",
            "Power of attorney documents",
            "Step-by-step questionnaire",
            "Download in PDF format",
          ]
        : [
            "შრომითი და მომსახურების ხელშეკრულებები",
            "ქირავნობის და იჯარის შეთანხმებები",
            "მინდობილობის დოკუმენტები",
            "ნაბიჯ-ნაბიჯ კითხვარი",
            "PDF ფორმატში ჩამოტვირთვა",
          ],
      cta: isEn ? "Create Document" : "შექმენი დოკუმენტი",
      href: "/templates",
      comingSoon: true,
    },
    {
      id: "smart-analysis",
      icon: FolderOpen,
      title: isEn ? "Documents" : "დოკუმენტები",
      subtitle: isEn ? "Check a document" : "შეამოწმე დოკუმენტი",
      description: isEn
        ? "Upload any document and the system will automatically detect risks and suspicious clauses. Get accurate information before signing a document."
        : "ატვირთეთ ნებისმიერი დოკუმენტი და სისტემა ავტომატურად აღმოაჩენს რისკებსა და საეჭვო პუნქტებს. მიიღეთ ზუსტი ინფორმაცია სანამ ხელს მოაწერთ დოკუმენტს.",
      features: isEn
        ? [
            "Clause-level risk detection",
            "Easy-to-understand risk explanations",
            "Unusual or one-sided terms highlighted",
            "PDF, DOCX and TXT support",
            "Results in under 30 seconds",
          ]
        : [
            "პუნქტების დონეზე რისკების ამოცნობა",
            "მარტივად გასაგები რისკების ახსნა",
            "უჩვეულო ან არათანაბარი პირობების მონიშვნა",
            "PDF, DOCX და TXT მხარდაჭერა",
            "შედეგი 30 წამზე ნაკლებ დროში",
          ],
      cta: isEn ? "Check File" : "ფაილის შემოწმება",
      href: "/docs",
      comingSoon: true,
    },
  ]
}

export default async function ServicesPage() {
  const locale = await getLocale()
  const d = getDict(locale)
  const SERVICES = getServices(locale)

  return (
    <div className="container mx-auto px-4 py-14 max-w-5xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[#1a1a2e] tracking-tight">{d.services.title}</h1>
        <p className="text-lg text-gray-500 mt-2 max-w-2xl">{d.services.subtitle}</p>
      </div>

      <div className="flex flex-col gap-8">
        {SERVICES.map((s) => {
          const Icon = s.icon
          const card = (
            <div
              className={[
                "rounded-2xl border p-8 flex flex-col sm:flex-row gap-8 transition-all",
                s.comingSoon
                  ? "bg-[#f7f7ff] border-[#e0e0ff] opacity-70"
                  : "bg-white border-[#e0e0ff] hover:shadow-lg hover:-translate-y-0.5 group",
              ].join(" ")}
            >
              <div className="shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-[#ededff] flex items-center justify-center">
                  <Icon className={["h-8 w-8", s.comingSoon ? "text-[#a5b4fc]" : "text-[#6366f1]"].join(" ")} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className={["text-2xl font-bold leading-snug", s.comingSoon ? "text-[#6b7280]" : "text-[#1a1a2e]"].join(" ")}>
                      {s.title}
                    </h2>
                    <p className={["text-sm font-semibold mt-0.5", s.comingSoon ? "text-[#a5b4fc]" : "text-[#6366f1]"].join(" ")}>
                      {s.subtitle}
                    </p>
                  </div>
                  {s.comingSoon && (
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 border border-gray-200 rounded-full px-3 py-1 shrink-0">
                      {d.services.comingSoon}
                    </span>
                  )}
                </div>

                <p className="text-gray-500 mt-3 leading-relaxed">{s.description}</p>

                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className={["h-4 w-4 shrink-0 mt-0.5", s.comingSoon ? "text-[#a5b4fc]" : "text-[#6366f1]"].join(" ")} />
                      {f}
                    </li>
                  ))}
                </ul>

                {!s.comingSoon && (
                  <div className="mt-6">
                    <Link
                      href={s.href}
                      className="inline-flex items-center gap-2 bg-[#4338ca] hover:bg-[#3730a3] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                    >
                      {s.cta}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )

          return <div key={s.id}>{card}</div>
        })}
      </div>
    </div>
  )
}
