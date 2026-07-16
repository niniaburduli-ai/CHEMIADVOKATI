import { renderPwaIcon } from "@/lib/pwa-icon"

// 512x512 maskable icon for the web app manifest.
export const dynamic = "force-static"

export function GET() {
  return renderPwaIcon(512, { maskable: true })
}
