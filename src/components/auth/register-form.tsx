"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction, type AuthFormState } from "@/actions/auth";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    registerAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">სახელი</Label>
        <Input
          id="name"
          name="name"
          placeholder="თქვენი სახელი"
          defaultValue={state?.values?.name ?? ""}
          required
          autoComplete="name"
        />
        {state?.fields?.name && (
          <p className="text-xs text-destructive">{state.fields.name[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">ელ. ფოსტა</Label>
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
        <Label htmlFor="password">პაროლი</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">მინიმუმ 8 სიმბოლო</p>
        {state?.fields?.password && (
          <p className="text-xs text-destructive">{state.fields.password[0]}</p>
        )}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "იქმნება..." : "ანგარიშის შექმნა"}
      </Button>
    </form>
  );
}
