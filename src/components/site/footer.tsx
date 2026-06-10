import Link from "next/link";
import { Mail, Phone, MapPin, Globe, TriangleAlert } from "lucide-react";

const nav = [
  { href: "/", label: "მთავარი" },
  { href: "/about", label: "ჩვენ შესახებ" },
  { href: "/services", label: "მომსახურებები" },
  { href: "/legislation", label: "კანონმდებლობა" },
  { href: "/blog", label: "ბლოგი" },
];

const legal = [
  { href: "/privacy", label: "კონფიდენციალურობის პოლიტიკა" },
  { href: "/terms", label: "გამოყენების პირობები" },
  { href: "/disclaimer", label: "პასუხისმგებლობის შეზღუდვა" },
];

export function Footer() {
  return (
    <footer className="bg-[#3730a3] text-white">
      {/* Main footer grid */}
      <div className="container mx-auto px-4 py-12 grid gap-10 md:grid-cols-4 text-sm">

        {/* Col 1 — brand */}
        <div className="space-y-4">
          <div>
            <p className="font-bold text-lg leading-tight">ჩემი იურისტი</p>
            <p className="text-indigo-300 text-xs mt-0.5">კანონი მარტივი ენით</p>
          </div>
          <p className="text-indigo-200 text-xs leading-relaxed">
            AI-ზე დაფუძნებული იურიდიული პლატფორმა, რომელიც გთავაზობს
            მარტივად ინტელექტურ პასუხებს სწრაფად და გასაგებ ენაზე.
          </p>
        </div>

        {/* Col 2 — navigation */}
        <div>
          <p className="font-semibold text-white mb-4">ნავიგაცია</p>
          <ul className="space-y-2.5">
            {nav.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="text-indigo-200 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — legal info */}
        <div>
          <p className="font-semibold text-white mb-4">სასარგებლო ინფორმაცია</p>
          <ul className="space-y-2.5">
            {legal.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-indigo-200 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 — contact */}
        <div>
          <p className="font-semibold text-white mb-4">კონტაქტი</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-2.5 text-indigo-200">
              <Mail className="h-4 w-4 shrink-0 text-indigo-300" />
              <a href="mailto:info@chemiuristi.ge" className="hover:text-white transition-colors">
                info@chemiuristi.ge
              </a>
            </li>
            <li className="flex items-center gap-2.5 text-indigo-200">
              <Globe className="h-4 w-4 shrink-0 text-indigo-300" />
              <a href="https://chemiuristi.ge" className="hover:text-white transition-colors">
                chemiuristi.ge
              </a>
            </li>
            <li className="flex items-center gap-2.5 text-indigo-200">
              <Phone className="h-4 w-4 shrink-0 text-indigo-300" />
              <a href="tel:+995321212345" className="hover:text-white transition-colors">
                +995 32 12 123 456
              </a>
            </li>
            <li className="flex items-center gap-2.5 text-indigo-200">
              <MapPin className="h-4 w-4 shrink-0 text-indigo-300" />
              <span>თბილისი, საქართველო</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Warning banner */}
      <div className="py-3 px-4 border-t border-indigo-700">
        <p className="flex items-center justify-center gap-2 text-xs md:text-sm text-indigo-200 text-center leading-snug max-w-3xl mx-auto">
          <TriangleAlert className="h-4 w-4 shrink-0 text-indigo-300" />
          <span>
            გაფრთხილება: პასუხები გენერირებულია ხელოვნური ინტელექტის მიერ და ეფუძნება მოქმედ კანონმდებლობას. ოფიციალური იურიდიული დასკვნისთვის მიმართეთ იურისტს.
          </span>
        </p>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-indigo-700">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-indigo-300 text-xs">
            © 2026 ჩემი იურისტი. ყველა უფლება დაცულია.
          </p>
        </div>
      </div>
    </footer>
  );
}
