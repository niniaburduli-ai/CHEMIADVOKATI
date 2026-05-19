import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">შესვლა</CardTitle>
          <CardDescription>გააგრძელე შენი იურიდიული მოგზაურობა</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ელ. ფოსტა</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">პაროლი</Label>
                <Link href="/forgot" className="text-xs text-muted-foreground hover:text-foreground">
                  დაგავიწყდა?
                </Link>
              </div>
              <Input id="password" type="password" />
            </div>
            <Button className="w-full" type="submit">შესვლა</Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">ან</span>
            <Separator className="flex-1" />
          </div>
          <Button variant="outline" className="w-full">Google-ით შესვლა</Button>
          <p className="mt-6 text-sm text-center text-muted-foreground">
            არ გაქვს ანგარიში?{" "}
            <Link href="/register" className="text-foreground font-medium">რეგისტრაცია</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
