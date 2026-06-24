import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";

type Props = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const [{ callbackUrl }, locale] = await Promise.all([searchParams, getLocale()]);
  const d = getDict(locale);
  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{d.auth.loginTitle}</CardTitle>
          <CardDescription>{d.auth.loginDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <GoogleButton label={d.auth.googleContinue} locale={locale} />
          </Suspense>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>{d.auth.or}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Suspense fallback={null}>
            <LoginForm locale={locale} />
          </Suspense>
          <p className="mt-6 text-sm text-center text-muted-foreground">
            {d.auth.noAccount}{" "}
            <Link href={registerHref} className="text-foreground font-medium">{d.auth.signUpCta}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
