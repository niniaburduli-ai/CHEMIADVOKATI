"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/actions/password-reset";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export function ResetPasswordForm({ locale, token }: { locale: Locale; token: string }) {
  const d = getDict(locale);
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    undefined
  );

  if (state?.done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="font-medium">{d.auth.resetDoneTitle}</p>
          <p className="text-sm text-muted-foreground">{d.auth.resetDoneBody}</p>
        </div>
        <Link href="/login" className={buttonVariants() + " w-full"}>
          {d.auth.goToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">{d.auth.newPassword}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">{d.auth.minPassword}</p>
        {state?.fields?.password && (
          <p className="text-xs text-destructive">{state.fields.password[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{d.auth.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {state?.fields?.confirmPassword && (
          <p className="text-xs text-destructive">{state.fields.confirmPassword[0]}</p>
        )}
      </div>
      {state?.error && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{state.error}</p>
          <Link
            href="/forgot-password"
            className="text-sm text-primary font-medium hover:underline"
          >
            {d.auth.requestNewLink}
          </Link>
        </div>
      )}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? d.auth.resetting : d.auth.resetSubmit}
      </Button>
    </form>
  );
}
