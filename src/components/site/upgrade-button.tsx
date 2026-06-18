"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  /** DB-backed plan key (e.g. "standard"). */
  plan: string;
  label: string;
  /** When set, render a native button with these classes (matches host styling). */
  className?: string;
  /** shadcn variant, used only when className is not provided. */
  variant?: "default" | "outline";
};

/** Starts a Flitt checkout for a paid plan and redirects to the hosted page. */
export function UpgradeButton({ plan, label, className, variant = "default" }: Props) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      // Not signed in → send to login, return to the current page afterwards.
      if (res.status === 401) {
        const back = encodeURIComponent(window.location.pathname || "/pricing");
        window.location.href = `/login?callbackUrl=${back}`;
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        toast.error(data.error ?? "გადახდის გვერდი ვერ გაიხსნა.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("სერვისთან კავშირი ვერ დამყარდა.");
    } finally {
      setLoading(false);
    }
  };

  const content = loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : label;

  // Native button preserves the host's bespoke styling (e.g. homepage cards).
  if (className) {
    return (
      <button type="button" onClick={start} disabled={loading} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Button onClick={start} disabled={loading} variant={variant} className="mt-6 w-full">
      {content}
    </Button>
  );
}
