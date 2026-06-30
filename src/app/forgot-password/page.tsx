import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const d = getDict(locale);

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-6 flex flex-col items-center text-center gap-2 animate-fade-up">
        <Link href="/" className="flex flex-col items-center gap-3 group">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
        </Link>
        <p className="text-xs text-muted-foreground max-w-xs">{d.auth.forgotDescription}</p>
      </div>

      <Card className="w-full max-w-md border-t-[3px] border-t-primary rounded-2xl shadow-xl animate-fade-up delay-150">
        <CardHeader>
          <CardTitle className="text-2xl">{d.auth.forgotTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
