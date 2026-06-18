import type { Locale } from "./config"

/** Static UI strings (non-CMS). ka is the source of truth; en mirrors its shape. */
const ka = {
  header: {
    signIn: "შესვლა",
    signUp: "რეგისტრაცია",
    admin: "ადმინი",
    account: "ანგარიში",
    logout: "გასვლა",
  },
  footer: {
    navigation: "ნავიგაცია",
    usefulInfo: "სასარგებლო ინფორმაცია",
    contact: "კონტაქტი",
    brandBlurb:
      "AI-ზე დაფუძნებული იურიდიული პლატფორმა, რომელიც გთავაზობს მარტივად ინტელექტურ პასუხებს სწრაფად და გასაგებ ენაზე.",
    nav: {
      home: "მთავარი",
      about: "ჩვენ შესახებ",
      services: "მომსახურებები",
      legislation: "კანონმდებლობა",
      blog: "ბლოგი",
    },
    legal: {
      privacy: "კონფიდენციალურობის პოლიტიკა",
      terms: "გამოყენების პირობები",
      disclaimer: "პასუხისმგებლობის შეზღუდვა",
    },
  },
  pricing: {
    title: "მარტივი ფასები",
    subtitle: "აირჩიე გეგმა, რომელიც გერგება. ფარული გადასახადები არ არის.",
    popular: "პოპულარული",
    perMonth: "თვე",
    join: "შეუერთდი",
    start: "დაიწყე",
    faqTitle: "ხშირი კითხვები",
    faqs: [
      { q: "შემიძლია ნებისმიერ დროს გაუქმება?", a: "კი. ანგარიშის გვერდიდან ერთი დაკლიკებით." },
      { q: "რა ხდება გამოუყენებელ კონსულტაციებთან?", a: "თვის ბოლოს განულდება. დაუბრუნდი ხშირად!" },
      { q: "უსაფრთხოა ჩემი მონაცემები?", a: "კი. ვიყენებთ შიფრაციას და არასოდეს ვუზიარებთ მესამე მხარეს." },
      {
        q: "AI პასუხები სიზუსტისთვის რამდენად საიმედოა?",
        a: "AI გვაძლევს კარგ საწყის წერტილს, მაგრამ რთული საკითხებისთვის გირჩევთ ადვოკატთან კონსულტაციას.",
      },
    ],
  },
  auth: {
    loginTitle: "შესვლა",
    registerTitle: "რეგისტრაცია",
    name: "სახელი",
    email: "ელ. ფოსტა",
    password: "პაროლი",
    signInCta: "შესვლა",
    signUpCta: "რეგისტრაცია",
    or: "ან",
    haveAccount: "უკვე გაქვს ანგარიში?",
    noAccount: "არ გაქვს ანგარიში?",
  },
  common: {
    loading: "იტვირთება…",
    save: "შენახვა",
    cancel: "გაუქმება",
  },
}

export type Dict = typeof ka

const en: Dict = {
  header: {
    signIn: "Sign in",
    signUp: "Sign up",
    admin: "Admin",
    account: "Account",
    logout: "Sign out",
  },
  footer: {
    navigation: "Navigation",
    usefulInfo: "Useful information",
    contact: "Contact",
    brandBlurb:
      "An AI-powered legal platform delivering smart answers quickly, in plain and clear language.",
    nav: {
      home: "Home",
      about: "About us",
      services: "Services",
      legislation: "Legislation",
      blog: "Blog",
    },
    legal: {
      privacy: "Privacy policy",
      terms: "Terms of use",
      disclaimer: "Disclaimer",
    },
  },
  pricing: {
    title: "Simple pricing",
    subtitle: "Pick the plan that fits you. No hidden fees.",
    popular: "Popular",
    perMonth: "mo",
    join: "Subscribe",
    start: "Get started",
    faqTitle: "Frequently asked questions",
    faqs: [
      { q: "Can I cancel anytime?", a: "Yes. One click from your account page." },
      { q: "What happens to unused consultations?", a: "They reset at the end of the month. Come back often!" },
      { q: "Is my data safe?", a: "Yes. We use encryption and never share with third parties." },
      {
        q: "How reliable are the AI answers?",
        a: "AI gives a good starting point, but for complex matters we recommend consulting a lawyer.",
      },
    ],
  },
  auth: {
    loginTitle: "Sign in",
    registerTitle: "Sign up",
    name: "Name",
    email: "Email",
    password: "Password",
    signInCta: "Sign in",
    signUpCta: "Sign up",
    or: "or",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
  },
  common: {
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
  },
}

const dictionaries: Record<Locale, Dict> = { ka, en }

export function getDict(locale: Locale): Dict {
  return dictionaries[locale] ?? dictionaries.ka
}
