import type { HomePageData } from "@/types/cms"

// Single seed with both KA and EN text. Structure fields (visible, order, etc.) are shared.
// Used by: route.ts (DB seed on first GET) + page.tsx (fallback when cms is null/draft)
export const HOME_SEED: Omit<HomePageData, "status"> = {
  sections: { hero: true, stats: true, features: true, pricing: true, faq: true, howItWorks: true },
  hero: {
    title: "ჩემი იურისტი",
    titleEn: "My Lawyer",
    subtitle: "კანონი მარტივ ენაზე",
    subtitleEn: "Law in plain language",
    ctaText: "",
    ctaHref: "",
    imageUrl: "",
    imagePubId: "",
  },
  serviceCards: [
    {
      _id: "sc-1",
      title: "AI ასისტენტი", titleEn: "AI Lawyer",
      subtitle: "AI კონსულტაცია", subtitleEn: "Ask a question",
      ctaText: "კითხვის დასმა", ctaTextEn: "Learn more",
      href: "/chat", icon: "MessageSquare", comingSoon: false, visible: true, order: 0,
    },
    {
      _id: "sc-2",
      title: "შაბლონები", titleEn: "Templates",
      subtitle: "დოკუმენტის გენერატორი", subtitleEn: "Create a template",
      ctaText: "შექმენით დოკუმენტი", ctaTextEn: "Create document",
      href: "/generate", icon: "FileText", comingSoon: false, visible: true, order: 1,
    },
    {
      _id: "sc-3",
      title: "დოკუმენტები", titleEn: "Documents",
      subtitle: "დოკუმენტის ანალიზი", subtitleEn: "Check a document",
      ctaText: "ფაილის შემოწმება", ctaTextEn: "Check file",
      href: "/review", icon: "FolderOpen", comingSoon: false, visible: true, order: 2,
    },
  ],
  cardsHeading: "ჩვენი სერვისები",
  cardsHeadingEn: "Services",
  howItWorksHeading: "როგორ მუშაობს",
  howItWorksHeadingEn: "How it works",
  howItWorks: [
    {
      key: "chat",
      title: "AI კონსულტაცია", titleEn: "AI consultation",
      steps: [
        { text: "გახსენი ჩატი", textEn: "Open the chat" },
        { text: "დაწერე შენი იურიდიული საკითხი მარტივი ენით", textEn: "Describe your legal question in plain language" },
        { text: "მიიღე მყისიერი პასუხი მოქმედი კანონმდებლობის მითითებით", textEn: "Get an instant answer citing current legislation" },
      ],
      ctaText: "კითხვის დასმა", ctaTextEn: "Ask a question",
    },
    {
      key: "review",
      title: "დოკუმენტის ანალიზი", titleEn: "Document review",
      steps: [
        { text: "აირჩიე დოკუმენტის ან ფოტოს რეჟიმი", textEn: "Choose document or photo mode" },
        { text: "ატვირთე ფაილი (PDF, DOCX, TXT ან სურათები)", textEn: "Upload your file (PDF, DOCX, TXT, or images)" },
        { text: "ნახე გამოვლენილი რისკები კატეგორიების მიხედვით და რეკომენდაციები", textEn: "Review the categorized risks and recommendations" },
      ],
      ctaText: "დოკუმენტის შემოწმება", ctaTextEn: "Check a document",
    },
    {
      key: "templates",
      title: "მზა შაბლონები", titleEn: "Ready-made templates",
      steps: [
        { text: "მოძებნე ან დაათვალიერე შაბლონების ბიბლიოთეკა", textEn: "Search or browse the template library" },
        { text: "შეავსე შენი მონაცემები და ჩამოტვირთე დოკუმენტი", textEn: "Fill in your details and download the document" },
      ],
      ctaText: "შაბლონის არჩევა", ctaTextEn: "Choose a template",
    },
    {
      key: "generate",
      title: "დოკუმენტის მომზადება", titleEn: "Document generation",
      steps: [
        { text: "აღწერე შენი სიტუაცია", textEn: "Describe your situation" },
        { text: "AI ადგენს საჩივარს ან მოთხოვნას შენს მონაცემებზე დაყრდნობით", textEn: "AI drafts the complaint or demand based on your details" },
        { text: "გადახედე, მოითხოვე შესწორება ან ჩამოტვირთე", textEn: "Review it, request a revision, or download" },
      ],
      ctaText: "დოკუმენტის შექმნა", ctaTextEn: "Create a document",
    },
  ],
  statsHeading: "ჩვენი შედეგები ციფრებში",
  statsHeadingEn: "Our results in numbers",
  stats: [
    { _id: "st-1", label: "დასმული კითხვა", labelEn: "Questions asked", value: "0", icon: "MessageSquare", visible: true, order: 0 },
    { _id: "st-2", label: "დამუშავებული დოკუმენტი", labelEn: "Documents processed", value: "0", icon: "FileText", visible: true, order: 1 },
    { _id: "st-3", label: "გამოყენებული შაბლონი", labelEn: "Templates used", value: "0", icon: "Layers", visible: true, order: 2 },
    { _id: "st-4", label: "რეგისტრირებული მომხმარებელი", labelEn: "Registered users", value: "11", icon: "Users", metric: "users", visible: true, order: 3 },
  ],
  statsCardsVisible: { services: true, satisfaction: true, rating: true },
  featuresHeading: "რატომ ჩემი იურისტი?",
  featuresHeadingEn: "Why My Lawyer?",
  features: [
    { _id: "fe-1", title: "მარტივი გამოყენება", titleEn: "Easy to use", body: "დასვით კითხვა, გამოიყენეთ შაბლონები ან ატვირთეთ დოკუმენტი მარტივად. პლატფორმა შექმნილია ყველასთვის.", bodyEn: "Ask a question, use templates, or upload a document effortlessly. The platform is designed for everyone.", icon: "MousePointerClick", order: 0, visible: true },
    { _id: "fe-2", title: "სწრაფი პასუხები", titleEn: "Fast answers", body: "მიიღეთ თქვენთვის საჭირი ინფორმაცია წამებში.", bodyEn: "Get the information you need in seconds.", icon: "Zap", order: 1, visible: true },
    { _id: "fe-3", title: "ყველაფერი ერთ სივრცეში", titleEn: "All in one place", body: "იურიდიული კონსულტაცია, დოკუმენტების შემოწმება და შაბლონები — ყველაფერი ერთ პლატფორმაზე.", bodyEn: "Legal consultation, document review, and templates — everything on one platform.", icon: "Layers", order: 2, visible: true },
    { _id: "fe-4", title: "უსაფრთხო გარემო", titleEn: "Secure environment", body: "თქვენი კითხვები და დოკუმენტები მუშავდება კონფიდენციალურად და უსაფრთხოდ.", bodyEn: "Your questions and documents are processed confidentially and securely.", icon: "ShieldCheck", order: 3, visible: true },
    { _id: "fe-5", title: "24/7 ხელმისაწვდომობა", titleEn: "Available 24/7", body: "მიიღეთ იურიდიული ინფორმაცია ნებისმიერ დროს, თქვენთვის მოსახერხებელ მომენტში.", bodyEn: "Get legal information at any time, at your convenience.", icon: "Clock", order: 4, visible: true },
  ],
  pricingHeading: "აირჩიეთ თქვენზე მორგებული პაკეტი",
  pricingHeadingEn: "Choose the plan that fits you",
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
  faqHeading: "ხშირად დასმული კითხვები",
  faqHeadingEn: "Frequently asked questions",
  ctaSection: {
    buttonText: "რეგისტრაცია",
    buttonTextEn: "Sign up",
    buttonHref: "/register",
  },
}

export function getHomeSeed(): Omit<HomePageData, "status"> {
  return HOME_SEED
}
