"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getDict } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/config"

export function FeedbackWidget({ locale }: { locale: Locale }) {
  const d = getDict(locale).feedback
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  function reset() {
    setRating(0)
    setHoverRating(0)
    setMessage("")
    setSending(false)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  async function submit() {
    if (rating < 1) {
      toast.error(d.validationError)
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message: message.trim() }),
      })
      if (!res.ok) throw new Error("request failed")
      toast.success(d.successToast)
      handleOpenChange(false)
      router.refresh()
    } catch {
      toast.error(d.errorToast)
      setSending(false)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={d.tabLabel}
        className="fixed right-0 top-1/2 -translate-y-1/2 rotate-180 z-40 [writing-mode:vertical-rl] bg-gold text-slate-900 text-xs font-semibold tracking-wider px-2 py-4 rounded-l-lg shadow-lg hover:brightness-95 hover:px-3 transition-all"
      >
        {d.tabLabel}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{d.modalTitle}</DialogTitle>
            <DialogDescription>{d.modalDescription}</DialogDescription>
          </DialogHeader>

          <p className="text-center text-sm font-medium text-foreground">{d.rateUsLabel}</p>
          <div className="flex justify-center gap-1 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n}/5`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    n <= displayRating ? "text-gold fill-gold" : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={d.placeholder}
            rows={4}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={sending}>
              {d.cancel}
            </Button>
            <Button onClick={submit} disabled={sending}>
              {sending ? d.sending : d.send}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
