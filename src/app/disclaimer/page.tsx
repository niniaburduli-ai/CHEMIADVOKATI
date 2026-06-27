import type { Metadata } from "next"
import { PageHero } from "@/components/site/PageHero"

export const metadata: Metadata = {
  title: "პასუხისმგებლობის შეზღუდვა | ჩემი იურისტი",
  description: "ჩემი იურისტის პასუხისმგებლობის შეზღუდვა",
}

export default function DisclaimerPage() {
  return (
    <div>
      <PageHero title="პასუხისმგებლობის შეზღუდვა" />
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 animate-fade-up delay-150 space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            პლატფორმის მიერ გენერირებული ინფორმაცია წარმოადგენს ავტომატურ, ხელოვნურ
            ინტელექტზე დაფუძნებულ შედეგს და ემყარება მოქმედ კანონმდებლობას.
          </p>
          <p>
            მოწოდებული ინფორმაცია არ წარმოადგენს ოფიციალურ იურიდიულ დასკვნას,
            პროფესიულ რჩევას ან ადვოკატურ მომსახურებას.
          </p>
          <p>
            პლატფორმა არ აგებს პასუხს მომხმარებლის მიერ მიღებულ გადაწყვეტილებებზე
            ან მათი გამოყენების შედეგად დამდგარ შედეგებზე.
          </p>
        </div>
      </section>
    </div>
  )
}
