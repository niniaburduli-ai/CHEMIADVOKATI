import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * DD.MM.YYYY, built manually instead of `toLocaleDateString` — ICU data for
 * "ka-GE" differs between Node and browsers, which produces different output
 * server- vs client-side and breaks hydration in any "use client" component
 * that renders a date on first paint.
 */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return ""
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${day}.${month}.${d.getFullYear()}`
}
