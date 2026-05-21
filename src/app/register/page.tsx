import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">რეგისტრაცია</CardTitle>
          <CardDescription>დაიწყე უფასოდ — საკრედიტო ბარათი არ არის საჭირო</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
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
