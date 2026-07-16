import { renderPwaIcon } from "@/lib/pwa-icon"

// 192x192 maskable icon for the web app manifest.
export const dynamic = "force-static"

export function GET() {
  return renderPwaIcon(192, { maskable: true })
}
