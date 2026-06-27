export const dynamic = "force-dynamic"

import Link from "next/link"
import { MessageSquare, FileText, FolderOpen, ArrowRight, Check } from "lucide-react"
import { getLocale } from "@/lib/i18n/locale"
import { getDict } from "@/lib/i18n/dictionaries"
import { getHomePage } from "@/lib/cms"
import { getHomeSeed } from "@/lib/homepage-defaults"
import { PageHero } from "@/components/site/PageHero"
import { AnimateIn } from "@/components/site/AnimateIn"

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
      subtitle: isEn ? "Ask a question" : "დასვით კითხვა",
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
      cta: isEn ? "Ask a question" : "დასვით კითხვა",
      href: "/chat",
      comingSoon: false,
    },
    {
      id: "templates",
      icon: FileText,
      title: isEn ? "Templates" : "შაბლონები",
      subtitle: isEn ? "Create a template" : "შექმენით შაბლონი",
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
      cta: isEn ? "Create Document" : "შექმენით დოკუმენტი",
      href: "/templates",
      comingSoon: true,
    },
    {
      id: "smart-analysis",
      icon: FolderOpen,
      title: isEn ? "Documents" : "დოკუმენტები",
      subtitle: isEn ? "Check a document" : "შეამოწმეთ დოკუმენტი",
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
  const seed = getHomeSeed()
  const cmsPage = await getHomePage()
  const cmsCards = cmsPage?.serviceCards ?? seed.serviceCards
  const visibleHrefs = new Set(
    cmsCards.filter((c) => c.visible !== false).map((c) => c.href),
  )
  const cmsComingSoonMap = new Map(cmsCards.map((c) => [c.href, c.comingSoon]))

  const SERVICES = getServices(locale)
    .filter((s) => visibleHrefs.has(s.href))
    .map((s) => ({
      ...s,
      comingSoon: cmsComingSoonMap.has(s.href) ? cmsComingSoonMap.get(s.href)! : s.comingSoon,
    }))

  return (
    <div>
      <PageHero title={d.services.title} subtitle={d.services.subtitle} />

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col gap-6">
          {SERVICES.map((s, idx) => {
            const Icon = s.icon
            if (s.comingSoon) {
              return (
                <AnimateIn key={s.id} delay={idx * 100}>
                  <div className="border-t-[3px] border-t-border bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row gap-8 opacity-60">
                    <div className="shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-8 w-8 text-primary/30" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h2 className="text-2xl font-bold leading-snug text-foreground">{s.title}</h2>
                          <p className="text-sm font-semibold mt-0.5 text-primary/50">{s.subtitle}</p>
                        </div>
                        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground border border-border rounded-full px-3 py-1 shrink-0">
                          {d.services.comingSoon}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-3 leading-relaxed">{s.description}</p>
                      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                        {s.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary/30" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AnimateIn>
              )
            }
            return (
              <AnimateIn key={s.id} delay={idx * 100}>
                <div className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row gap-8 card-hover group">
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-snug text-foreground">{s.title}</h2>
                    <p className="text-sm font-semibold mt-0.5 text-primary">{s.subtitle}</p>
                    <p className="text-muted-foreground mt-3 leading-relaxed">{s.description}</p>
                    <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                      {s.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      <Link
                        href={s.href}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl btn-hover"
                      >
                        {s.cta}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            )
          })}
        </div>
      </div>
    </div>
  )
}
