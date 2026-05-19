import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">რეგისტრაცია</CardTitle>
          <CardDescription>დაიწყე უფასოდ — საკრედიტო ბარათი არ არის საჭირო</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">სახელი</Label>
              <Input id="name" placeholder="თქვენი სახელი" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">ელ. ფოსტა</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">პაროლი</Label>
              <Input id="password" type="password" />
              <p className="text-xs text-muted-foreground">მინიმუმ 8 სიმბოლო</p>
            </div>
            <Button className="w-full" type="submit">ანგარიშის შექმნა</Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">ან</span>
            <Separator className="flex-1" />
          </div>
          <Button variant="outline" className="w-full">Google-ით რეგისტრაცია</Button>
          <p className="mt-6 text-sm text-center text-muted-foreground">
            უკვე გაქვს ანგარიში?{" "}
            <Link href="/login" className="text-foreground font-medium">შესვლა</Link>
          </p>
          <p className="mt-4 text-xs text-center text-muted-foreground">
            რეგისტრაციით ეთანხმები{" "}
            <Link href="/terms" className="underline">წესებს</Link> და{" "}
            <Link href="/privacy" className="underline">კონფიდენციალურობის პოლიტიკას</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
