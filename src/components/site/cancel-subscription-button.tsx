"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export function CancelSubscriptionButton({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const cancel = async () => {
    if (loading) return;
    if (!confirm(d.billing.confirmCancel)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? d.billing.cancelFail);
        return;
      }
      toast.success(d.billing.cancelSuccess);
      router.refresh();
    } catch {
      toast.error(d.billing.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={cancel} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : d.billing.cancelSub}
    </Button>
  );
}
