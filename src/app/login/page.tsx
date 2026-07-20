import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      {/* Brand mark */}
      <div className="mb-6 flex flex-col items-center text-center gap-2 animate-fade-up">
        <Link href="/" className="flex flex-col items-center gap-3 group">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
        </Link>
        <p className="text-xs text-muted-foreground max-w-xs">{d.auth.loginDescription}</p>
      </div>

      <Card className="w-full max-w-md border-t-[3px] border-t-primary rounded-2xl shadow-xl animate-fade-up delay-150">
        <CardHeader>
          <CardTitle className="text-2xl">{d.auth.loginTitle}</CardTitle>
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
            <Link href={registerHref} className="text-gold font-medium hover:underline">{d.auth.signUpCta}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
