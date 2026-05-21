"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type AuthFormState } from "@/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
    undefined
  );
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
        {state?.fields?.password && (
          <p className="text-xs text-destructive">{state.fields.password[0]}</p>
        )}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "შემოწმება..." : "შესვლა"}
      </Button>
    </form>
  );
}
