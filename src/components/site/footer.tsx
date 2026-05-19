import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="font-semibold mb-2">ჩემი ადვოკატი</div>
          <p className="text-muted-foreground">
            იურიდიული რჩევები მარტივ ენაზე ქართველებისთვის.
          </p>
        </div>
        <div>
          <div className="font-medium mb-2">პროდუქტი</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link href="/chat">კონსულტაცია</Link></li>
            <li><Link href="/legislation">კანონმდებლობა</Link></li>
            <li><Link href="/pricing">ფასები</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">კომპანია</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link href="/about">ჩვენ შესახებ</Link></li>
            <li><Link href="/contact">კონტაქტი</Link></li>
            <li><Link href="/terms">წესები</Link></li>
            <li><Link href="/privacy">კონფიდენციალურობა</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">გაფრთხილება</div>
          <p className="text-muted-foreground text-xs">
            ვებგვერდი იძლევა ზოგად ინფორმაციას და არ ცვლის
            კვალიფიციური ადვოკატის რჩევას.
          </p>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ჩემი ადვოკატი. ყველა უფლება დაცულია.
      </div>
    </footer>
  );
}
