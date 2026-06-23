export type LegislationDoc = {
  id: string
  title: { ka: string; en: string }
  description: { ka: string; en: string }
  tagId: string
  url: string
}

export const LEGISLATION_DOCS: LegislationDoc[] = [
  {
    id: "1",
    title: {
      ka: "შრომის კოდექსი",
      en: "Labour Code",
    },
    description: {
      ka: "არეგულირებს დასაქმებულისა და დამსაქმებლის ურთიერთობას, მათ შორის: განთავისუფლებას, შვებულებას, ხელფასს, ზეგანაკვეთურ სამუშაოს, დეკრეტს, კონტრაქტებს, კომპენსაციას, სამუშაო დროს და სხვა შრომით საკითხებს.",
      en: "Regulates the relationship between employees and employers, including: dismissal, leave, salary, overtime, maternity leave, contracts, compensation, working hours, and other labour matters.",
    },
    tagId: "labor",
    url: "https://matsne.gov.ge/ka/document/view/1155567?utm_source=&publication=28",
  },
  {
    id: "2",
    title: {
      ka: "სამოქალაქო კოდექსი",
      en: "Civil Code",
    },
    description: {
      ka: "მოიცავს ხელშეკრულებებს, ქირავნობას, სესხს, ვალდებულებებს, მემკვიდრეობას, საოჯახო სამართალს, საკუთრების უფლებას, იპოთეკას, ზიანის ანაზღაურებას და სხვა სამოქალაქო ურთიერთობებს.",
      en: "Covers contracts, lease, loans, obligations, inheritance, family law, property rights, mortgages, damages, and other civil relations.",
    },
    tagId: "civil",
    url: "https://www.matsne.gov.ge/ka/document/view/31702?publication=138",
  },
  {
    id: "3",
    title: {
      ka: "ადმინისტრაციულ სამართალდარღვევათა კოდექსი",
      en: "Administrative Offences Code",
    },
    description: {
      ka: "მოიცავს ადმინისტრაციულ დარღვევებსა და პასუხისმგებლობას, მათ შორის: ჯარიმებს, საგზაო დარღვევებს, საპატრულო სამართალდარღვევებს და სხვა ადმინისტრაციულ საკითხებს.",
      en: "Covers administrative violations and liability, including: fines, traffic violations, patrol offences, and other administrative matters.",
    },
    tagId: "admin",
    url: "https://matsne.gov.ge/ka/document/view/28216?publication=623",
  },
  {
    id: "4",
    title: {
      ka: "კანონი მომხმარებელთა უფლებების დაცვის შესახებ",
      en: "Consumer Rights Protection Law",
    },
    description: {
      ka: "არეგულირებს მომხმარებლის უფლებებს პროდუქტის ან მომსახურების შეძენისას, მათ შორის: ონლაინ შეძენას, ნივთის დაბრუნებას, გარანტიას, დაზიანებულ პროდუქტს, შეცდომაში შეყვანას და მომსახურების ხარისხს.",
      en: "Regulates consumer rights when purchasing products or services, including: online purchases, returns, warranties, damaged products, misleading advertising, and service quality.",
    },
    tagId: "consumer",
    url: "https://matsne.gov.ge/ka/document/view/5420598?publication=3",
  },
  {
    id: "5",
    title: {
      ka: "საგადასახადო კოდექსი",
      en: "Tax Code",
    },
    description: {
      ka: "არეგულირებს საგადასახადო საკითხებს, მათ შორის: ინდმეწარმეს, მცირე ბიზნესს, გადასახადებს, დღგ-ს, დეკლარაციებს, ჯარიმებსა და სხვა ფინანსურ ვალდებულებებს.",
      en: "Regulates tax matters, including: individual entrepreneurs, small businesses, taxes, VAT, declarations, penalties, and other financial obligations.",
    },
    tagId: "tax",
    url: "https://matsne.gov.ge/ka/document/view/1043717?publication=244",
  },
  {
    id: "6",
    title: {
      ka: "პერსონალური მონაცემების დაცვა",
      en: "Personal Data Protection",
    },
    description: {
      ka: "არეგულირებს პერსონალური მონაცემების დამუშავებასა და დაცვას, მათ შორის: ვიდეოკამერებს, პირადი ინფორმაციის გავრცელებას, კონფიდენციალურობას და მონაცემთა უსაფრთხოებას.",
      en: "Regulates the processing and protection of personal data, including: video cameras, disclosure of personal information, privacy, and data security.",
    },
    tagId: "privacy",
    url: "https://matsne.gov.ge/ka/document/view/1043717?publication=244",
  },
  {
    id: "7",
    title: {
      ka: "საქართველოს კონსტიტუცია",
      en: "Constitution of Georgia",
    },
    description: {
      ka: "მოიცავს სახელმწიფოს მოწყობის, ადამიანის უფლებების, თავისუფლებების, საკუთრების უფლების, სიტყვის თავისუფლების, თანასწორობისა და მოქალაქის კონსტიტუციური უფლებების ძირითად პრინციპებს.",
      en: "Covers the fundamental principles of state organization, human rights and freedoms, property rights, freedom of speech, equality, and the constitutional rights of citizens.",
    },
    tagId: "constitution",
    url: "https://matsne.gov.ge/ka/document/view/30346?publication=36",
  },
  {
    id: "8",
    title: {
      ka: "კანონი ფულის გათეთრებისა და ტერორიზმის დაფინანსების აღმკვეთი ღონისძიებების შესახებ",
      en: "Money Laundering and Terrorism Financing Prevention Law",
    },
    description: {
      ka: "არეგულირებს ფულის გათეთრებისა და ტერორიზმის დაფინანსების წინააღმდეგ მიმართულ წესებს, ფინანსური მონიტორინგის ვალდებულებებს, საეჭვო ტრანზაქციების კონტროლს, იდენტიფიკაციასა და ფინანსური უსაფრთხოების მოთხოვნებს.",
      en: "Regulates rules against money laundering and terrorism financing, financial monitoring obligations, suspicious transaction control, identification, and financial security requirements.",
    },
    tagId: "finance",
    url: "https://matsne.gov.ge/ka/document/view/4690334?publication=14",
  },
]

export const CATEGORY_IDS = ["all", "labor", "civil", "admin", "consumer", "tax", "privacy", "constitution", "finance"] as const
