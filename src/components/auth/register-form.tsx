"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction, type AuthFormState } from "@/actions/auth";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export function RegisterForm({ locale, callbackUrl }: { locale: Locale; callbackUrl?: string }) {
  const d = getDict(locale);
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    registerAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="name">{d.auth.fullName}</Label>
        <Input
          id="name"
          name="name"
          placeholder={d.auth.namePlaceholder}
          defaultValue={state?.values?.name ?? ""}
          required
          autoComplete="name"
        />
        {state?.fields?.name && (
          <p className="text-xs text-destructive">{state.fields.name[0]}</p>
        )}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="password">{d.auth.password}</Label>
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

      <div className="space-y-1.5 pt-1">
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="consentAccepted"
            name="consentAccepted"
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#4338ca]"
            required
          />
          <label
            htmlFor="consentAccepted"
            className="text-xs text-muted-foreground leading-snug cursor-pointer select-none"
          >
            {d.auth.agreeTo}{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-foreground underline underline-offset-2 hover:text-[#4338ca]"
            >
              {d.auth.termsLink}
            </Link>
            {", "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-foreground underline underline-offset-2 hover:text-[#4338ca]"
            >
              {d.auth.privacyLink}
            </Link>
            {" "}{d.auth.and}{" "}
            <Link
              href="/disclaimer"
              target="_blank"
              className="text-foreground underline underline-offset-2 hover:text-[#4338ca]"
            >
              {d.auth.disclaimerLink}
            </Link>
            .
          </label>
        </div>
        {state?.fields?.consentAccepted && (
          <p className="text-xs text-destructive">{state.fields.consentAccepted[0]}</p>
        )}
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? d.auth.creating : d.auth.createAccount}
      </Button>
    </form>
  );
}
