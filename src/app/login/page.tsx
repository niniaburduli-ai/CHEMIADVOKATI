import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">შესვლა</CardTitle>
          <CardDescription>გააგრძელე შენი იურიდიული მოგზაურობა</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-sm text-center text-muted-foreground">
            არ გაქვს ანგარიში?{" "}
            <Link href="/register" className="text-foreground font-medium">რეგისტრაცია</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
