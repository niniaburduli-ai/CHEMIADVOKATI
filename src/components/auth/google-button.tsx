"use client";

import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { googleSignInAction } from "@/actions/auth";

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      <GoogleIcon />
      {pending ? "..." : label}
    </Button>
  );
}

export function GoogleButton({ label = "გაგრძელე Google-ით" }: { label?: string }) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  return (
    <form action={googleSignInAction}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <SubmitBtn label={label} />
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 11v3.2h5.3c-.2 1.4-1.6 4.1-5.3 4.1-3.2 0-5.8-2.6-5.8-5.9S8.8 6.5 12 6.5c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 4 14.5 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.4 12 21.4c6.9 0 9.4-4.9 9.4-7.4 0-.5 0-.9-.1-1.3H12z"/>
    </svg>
  );
}
