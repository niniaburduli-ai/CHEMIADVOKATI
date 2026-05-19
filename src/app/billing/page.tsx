import Link from "next/link";
import { CreditCard, Calendar, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const invoices = [
  { id: "INV-0003", date: "2026-05-01", amount: "$5.00", status: "გადახდილი" },
  { id: "INV-0002", date: "2026-04-01", amount: "$5.00", status: "გადახდილი" },
  { id: "INV-0001", date: "2026-03-01", amount: "$5.00", status: "გადახდილი" },
];

export default function BillingPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">ბილინგი</h1>
      <p className="text-muted-foreground mb-8">
        გადახდის მართვა და გადახდების ისტორია
      </p>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <CardTitle>მიმდინარე გეგმა</CardTitle>
              <CardDescription>აქტიური სუბსკრიფცია</CardDescription>
            </div>
            <Badge>აქტიური</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold">სტანდარტი</span>
            <span className="text-muted-foreground">— $5/თვე</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            შემდეგი გადახდა: 2026-06-01
          </div>
          <div className="mt-6 flex gap-2 flex-wrap">
            <Link href="/pricing" className={buttonVariants()}>გეგმის შეცვლა</Link>
            <Button variant="outline">სუბსკრიფციის გაუქმება</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>გადახდის მეთოდი</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5" />
              <div>
                <div className="font-medium">Visa •••• 4242</div>
                <div className="text-xs text-muted-foreground">ვადა 12/28</div>
              </div>
            </div>
            <Button variant="outline" size="sm">ცვლილება</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>გადახდების ისტორია</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((inv, i) => (
              <div key={inv.id}>
                <div className="flex items-center justify-between py-2 flex-wrap gap-2">
                  <div>
                    <div className="font-medium text-sm">{inv.id}</div>
                    <div className="text-xs text-muted-foreground">{inv.date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{inv.amount}</span>
                    <Badge variant="secondary">{inv.status}</Badge>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {i < invoices.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
