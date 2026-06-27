import type { Metadata } from "next"
import { PageHero } from "@/components/site/PageHero"

export const metadata: Metadata = {
  title: "კონფიდენციალურობის პოლიტიკა | ჩემი იურისტი",
  description: "ჩემი იურისტის კონფიდენციალურობის პოლიტიკა",
}

export default function PrivacyPage() {
  return (
    <div>
      <PageHero title="კონფიდენციალურობის პოლიტიკა" />
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 animate-fade-up delay-150 space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            მომხმარებლის მონაცემები გამოიყენება მხოლოდ სერვისის მიწოდების, სისტემის
            გაუმჯობესებისა და სამართლებრივი ანალიზის მიზნით.
          </p>
          <p>
            მონაცემები არ გადაეცემა მესამე პირებს კომერციული მიზნებით, გარდა სერვისის
            ფუნქციონირებისთვის აუცილებელი ტექნიკური პროვაიდერებისა.
          </p>
          <p>
            მომხმარებელს უფლება აქვს მოითხოვოს საკუთარ მონაცემებზე წვდომა, მათი
            ცვლილება ან წაშლა მოქმედი კანონმდებლობის შესაბამისად.
          </p>
        </div>
      </section>
    </div>
  )
}
