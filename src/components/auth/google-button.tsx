"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { googleSignInAction } from "@/actions/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 11v3.2h5.3c-.2 1.4-1.6 4.1-5.3 4.1-3.2 0-5.8-2.6-5.8-5.9S8.8 6.5 12 6.5c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 4 14.5 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.4 12 21.4c6.9 0 9.4-4.9 9.4-7.4 0-.5 0-.9-.1-1.3H12z"/>
    </svg>
  );
}

export function GoogleButton({
  label = "გაგრძელე Google-ით",
  requireConsent = false,
}: {
  label?: string;
  requireConsent?: boolean;
}) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [consented, setConsented] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSignIn = () => {
    if (requireConsent && !consented) return;
    const fd = new FormData();
    fd.set("callbackUrl", callbackUrl);
    startTransition(() => { googleSignInAction(fd); });
  };

  return (
    <div className="space-y-3">
      {requireConsent && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
          <input
            type="checkbox"
            id="googleConsent"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#4338ca]"
          />
          <label
            htmlFor="googleConsent"
            className="text-xs text-muted-foreground leading-snug cursor-pointer select-none"
          >
            Google-ით რეგისტრაციით ვეთანხმები{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-foreground underline underline-offset-2 hover:text-[#4338ca]"
            >
              მომსახურების პირობებს
            </Link>
            {" "}და{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-foreground underline underline-offset-2 hover:text-[#4338ca]"
            >
              კონფიდენციალურობის პოლიტიკას
            </Link>
            .
          </label>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isPending || (requireConsent && !consented)}
        onClick={handleSignIn}
      >
        <GoogleIcon />
        {isPending ? "..." : label}
      </Button>
    </div>
  );
}
