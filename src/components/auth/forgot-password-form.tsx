"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "@/actions/password-reset";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    undefined
  );

  if (state?.sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-gold" />
        </div>
        <div className="space-y-1.5">
          <p className="font-medium">{d.auth.forgotSentTitle}</p>
          <p className="text-sm text-muted-foreground">{d.auth.forgotSentBody}</p>
          <p className="text-xs text-muted-foreground">{d.auth.forgotSpamHint}</p>
        </div>
        <Link
          href="/login"
          className={buttonVariants({ variant: "outline" }) + " w-full"}
        >
          {d.auth.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{d.auth.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          defaultValue={state?.values?.email ?? ""}
          required
          autoComplete="email"
        />
        {state?.fields?.email && (
          <p className="text-xs text-destructive">{state.fields.email[0]}</p>
        )}
      </div>
      {state?.notRegistered && (
        <p className="text-sm text-destructive">{d.auth.emailNotRegistered}</p>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? d.auth.forgotSending : d.auth.forgotSubmit}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        <Link href="/login" className="text-gold font-medium hover:underline">
          {d.auth.backToLogin}
        </Link>
      </p>
    </form>
  );
}
