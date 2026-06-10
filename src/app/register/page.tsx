import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { GoogleButton } from "@/components/auth/google-button";

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">რეგისტრაცია</CardTitle>
          <CardDescription>დაიწყე უფასოდ — საკრედიტო ბარათი არ არის საჭირო</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <GoogleButton label="რეგისტრაცია Google-ით" requireConsent />
          </Suspense>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>ან</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <RegisterForm />
          <p className="mt-6 text-sm text-center text-muted-foreground">
            უკვე გაქვს ანგარიში?{" "}
            <Link href="/login" className="text-foreground font-medium">შესვლა</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
