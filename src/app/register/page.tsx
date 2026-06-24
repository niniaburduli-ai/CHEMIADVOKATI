import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";

type Props = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const [{ callbackUrl }, locale] = await Promise.all([searchParams, getLocale()]);
  const d = getDict(locale);

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{d.auth.registerTitle}</CardTitle>
          <CardDescription>{d.auth.registerDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <GoogleButton label={d.auth.googleRegister} requireConsent locale={locale} />
          </Suspense>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>{d.auth.or}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <RegisterForm locale={locale} callbackUrl={callbackUrl} />
          <p className="mt-6 text-sm text-center text-muted-foreground">
            {d.auth.haveAccount}{" "}
            <Link href="/login" className="text-foreground font-medium">{d.auth.signInCta}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
