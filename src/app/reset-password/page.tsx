import Link from "next/link";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const [{ token }, locale] = await Promise.all([searchParams, getLocale()]);
  const d = getDict(locale);

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-6 flex flex-col items-center text-center gap-2 animate-fade-up">
        <Link href="/" className="flex flex-col items-center gap-3 group">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
        </Link>
        <p className="text-xs text-muted-foreground max-w-xs">{d.auth.resetDescription}</p>
      </div>

      <Card className="w-full max-w-md border-t-[3px] border-t-primary rounded-2xl shadow-xl animate-fade-up delay-150">
        <CardHeader>
          <CardTitle className="text-2xl">
            {token ? d.auth.resetTitle : d.auth.resetInvalidTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm locale={locale} token={token} />
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">{d.auth.resetInvalidBody}</p>
              <Link
                href="/forgot-password"
                className={buttonVariants() + " w-full"}
              >
                {d.auth.requestNewLink}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
