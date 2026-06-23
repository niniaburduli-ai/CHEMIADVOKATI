import type { HomePageData } from "@/types/cms"
import type { Locale } from "@/lib/i18n/config"

// Used by: route.ts (DB seed on first GET) + page.tsx (fallback when cms is null/draft)
export const HOME_SEED: Omit<HomePageData, "status"> = {
  sections: { hero: true, stats: true, features: true, pricing: true, cta: true },
  hero: {
    title: "ჩემი იურისტი",
    subtitle: "კანონი მარტივ ენაზე",
    ctaText: "",
    ctaHref: "",
    imageUrl: "",
    imagePubId: "",
  },
  serviceCards: [
    { _id: "sc-1", title: "AI ასისტენტი", subtitle: "AI კონსულტაცია", description: "მიიღეთ მყისიერი პასუხები თქვენს იურიდიულ კითხვებზე ხელოვნური ინტელექტის დახმარებით, 24/7 რეჟიმში.", ctaText: "კითხვის დასმა", href: "/chat", icon: "MessageSquare", comingSoon: false, visible: true, order: 0 },
    { _id: "sc-2", title: "შაბლონები", subtitle: "დოკუმენტის გენერატორი", description: "შექმენით პროფესიული ხელშეკრულებები და ოფიციალური დოკუმენტები წამებში მარტივი კითხვარის შევსებით.", ctaText: "შექმენი დოკუმენტი", href: "/templates", icon: "FileText", comingSoon: true, visible: true, order: 1 },
    { _id: "sc-3", title: "ჭკვიანი ანალიზი", subtitle: "დოკუმენტის ანალიზი", description: "ატვირთეთ ნებისმიერი ფაილი და სისტემა ავტომატურად ამოიცნობს ფარულ რისკებს და საეჭვო პუნქტებს.", ctaText: "ფაილის შემოწმება", href: "/docs", icon: "FolderOpen", comingSoon: true, visible: true, order: 2 },
  ],
  statsHeading: "ჩვენი შედეგები ციფრებში",
  stats: [
    { _id: "st-1", label: "დასმული კითხვა", value: "0", icon: "MessageSquare", visible: true, order: 0 },
    { _id: "st-2", label: "დამუშავებული დოკუმენტი", value: "0", icon: "FileText", visible: true, order: 1 },
    { _id: "st-3", label: "გამოყენებული შაბლონი", value: "0", icon: "Layers", visible: true, order: 2 },
    { _id: "st-4", label: "რეგისტრირებული მომხმარებელი", value: "11", icon: "Users", visible: true, order: 3 },
  ],
  featuresHeading: "რატომ ჩემი იურისტი?",
  features: [
    { _id: "fe-1", title: "მარტივი გამოყენება", body: "დასვით კითხვა, გამოიყენეთ შაბლონები ან ატვირთეთ დოკუმენტი მარტივად. პლატფორმა შექმნილია ყველასთვის.", icon: "MousePointerClick", order: 0, visible: true },
    { _id: "fe-2", title: "სწრაფი პასუხები", body: "მიიღეთ თქვენთვის საჭირი ინფორმაცია წამებში.", icon: "Zap", order: 1, visible: true },
    { _id: "fe-3", title: "ერთ სივრცეში", body: "იურიდიული კონსულტაცია, დოკუმენტების შემოწმება და შაბლონები — ყველაფერი ერთ პლატფორმაზე.", icon: "Layers", order: 2, visible: true },
    { _id: "fe-4", title: "უსაფრთხო გარემო", body: "თქვენი კითხვები და დოკუმენტები მუშავდება კონფიდენციალურად და უსაფრთხოდ.", icon: "ShieldCheck", order: 3, visible: true },
    { _id: "fe-5", title: "24/7 ხელმისაწვდომობა", body: "მიიღეთ იურიდიული ინფორმაცია ნებისმიერ დროს, თქვენთვის მოსახერხებელ მომენტში.", icon: "Clock", order: 4, visible: true },
  ],
  pricingHeading: "აირჩიე თქვენზე მორგებული პაკეტი",
  plans: [
    {
      _id: "pl-1", name: "საბაზისო პაკეტი", price: "0", badge: "",
      ctaText: "დაიწყეთ უფასოდ", ctaHref: "/register", plan: "",
      highlighted: false, visible: true, order: 0,
      items: ["9 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    },
    {
      _id: "pl-2", name: "სტანდარტული პაკეტი", price: "19", badge: "ყველაზე პოპულარული",
      ctaText: "აირჩიეთ პაკეტი", ctaHref: "/register", plan: "standard",
      highlighted: true, visible: true, order: 1,
      items: ["29 კონსულტაცია AI იურისტთან", "19 შაბლონის გენერირება", "9 დოკუმენტის შემოწმება", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    },
    {
      _id: "pl-3", name: "პრემიუმ (ბიზნეს) პაკეტი", price: "99", badge: "",
      ctaText: "აირჩიეთ პაკეტი", ctaHref: "/register", plan: "premium",
      highlighted: false, visible: true, order: 2,
      items: ["შეუზღუდავი კონსულტაცია AI იურისტთან", "შეუზღუდავი შაბლონის გენერირება", "99 დოკუმენტის/ხელშეკრულების შემოწმება", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა", "გაფართოებული იურიდიული ანალიზი"],
    },
  ],
  ctaSection: {
    title: "მზად ხარ?",
    subtitle: "დაარეგისტრირდი წამში და მიიღე პირველი კონსულტაცია უფასოდ.",
    buttonText: "რეგისტრაცია",
    buttonHref: "/register",
  },
}

const HOME_SEED_EN: Omit<HomePageData, "status"> = {
  sections: { hero: true, stats: true, features: true, pricing: true, cta: true },
  hero: {
    title: "My Lawyer",
    subtitle: "Law in plain language",
    ctaText: "",
    ctaHref: "",
    imageUrl: "",
    imagePubId: "",
  },
  serviceCards: [
    { _id: "sc-1", title: "AI Assistant", subtitle: "AI Consultation", description: "Get instant answers to your legal questions using artificial intelligence, available 24/7.", ctaText: "Ask a Question", href: "/chat", icon: "MessageSquare", comingSoon: false, visible: true, order: 0 },
    { _id: "sc-2", title: "Templates", subtitle: "Document Generator", description: "Create professional contracts and official documents in seconds by filling out a simple questionnaire.", ctaText: "Create Document", href: "/templates", icon: "FileText", comingSoon: true, visible: true, order: 1 },
    { _id: "sc-3", title: "Smart Analysis", subtitle: "Document Analysis", description: "Upload any file and the system will automatically detect hidden risks and suspicious clauses.", ctaText: "Check File", href: "/docs", icon: "FolderOpen", comingSoon: true, visible: true, order: 2 },
  ],
  statsHeading: "Our results in numbers",
  stats: [
    { _id: "st-1", label: "Questions asked", value: "0", icon: "MessageSquare", visible: true, order: 0 },
    { _id: "st-2", label: "Documents processed", value: "0", icon: "FileText", visible: true, order: 1 },
    { _id: "st-3", label: "Templates used", value: "0", icon: "Layers", visible: true, order: 2 },
    { _id: "st-4", label: "Registered users", value: "11", icon: "Users", visible: true, order: 3 },
  ],
  featuresHeading: "Why My Lawyer?",
  features: [
    { _id: "fe-1", title: "Easy to use", body: "Ask a question, use templates, or upload a document effortlessly. The platform is designed for everyone.", icon: "MousePointerClick", order: 0, visible: true },
    { _id: "fe-2", title: "Fast answers", body: "Get the information you need in seconds.", icon: "Zap", order: 1, visible: true },
    { _id: "fe-3", title: "All in one place", body: "Legal consultation, document review, and templates — everything on one platform.", icon: "Layers", order: 2, visible: true },
    { _id: "fe-4", title: "Secure environment", body: "Your questions and documents are processed confidentially and securely.", icon: "ShieldCheck", order: 3, visible: true },
    { _id: "fe-5", title: "Available 24/7", body: "Get legal information at any time, at your convenience.", icon: "Clock", order: 4, visible: true },
  ],
  pricingHeading: "Choose the plan that fits you",
  plans: [
    {
      _id: "pl-1", name: "Basic plan", price: "0", badge: "",
      ctaText: "Get started free", ctaHref: "/register", plan: "",
      highlighted: false, visible: true, order: 0,
      items: ["9 AI lawyer consultations", "Official source citations", "View question history"],
    },
    {
      _id: "pl-2", name: "Standard plan", price: "19", badge: "Most popular",
      ctaText: "Choose plan", ctaHref: "/register", plan: "standard",
      highlighted: true, visible: true, order: 1,
      items: ["29 AI lawyer consultations", "19 template generations", "9 document reviews", "Official source citations", "View question history"],
    },
    {
      _id: "pl-3", name: "Premium (Business) plan", price: "99", badge: "",
      ctaText: "Choose plan", ctaHref: "/register", plan: "premium",
      highlighted: false, visible: true, order: 2,
      items: ["Unlimited AI lawyer consultations", "Unlimited template generations", "99 document/contract reviews", "Official source citations", "View question history", "Extended legal analysis"],
    },
  ],
  ctaSection: {
    title: "Ready?",
    subtitle: "Register in seconds and get your first consultation for free.",
    buttonText: "Sign up",
    buttonHref: "/register",
  },
}

export function getHomeSeed(locale: Locale): Omit<HomePageData, "status"> {
  return locale === "en" ? HOME_SEED_EN : HOME_SEED
}
