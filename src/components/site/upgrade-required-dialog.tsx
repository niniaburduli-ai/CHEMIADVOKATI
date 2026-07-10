"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function UpgradeRequiredDialog({
  open,
  onOpenChange,
  strings,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  strings: { title: string; body: string; upgradeCta: string; close: string }
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>{strings.title}</DialogTitle>
          <DialogDescription>{strings.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {strings.close}
          </Button>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button className="w-full">{strings.upgradeCta}</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
