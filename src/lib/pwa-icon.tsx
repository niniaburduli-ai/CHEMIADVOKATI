import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

// Shared renderer for the installable-PWA icons referenced from manifest.ts.
// `maskable` keeps the monogram inside the inner ~80% safe zone so Android's
// adaptive-icon mask never clips it; the dark background bleeds to the edges.
export async function renderPwaIcon(size: number, opts: { maskable?: boolean } = {}) {
  const bold = await readFile(
    join(process.cwd(), "src/app/_og/NotoSansGeorgian-700.ttf")
  )
  const glyphRatio = opts.maskable ? 0.5 : 0.62

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#c9a227",
          fontSize: Math.round(size * glyphRatio),
          fontWeight: 700,
          fontFamily: "Noto",
        }}
      >
        ჩ
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: "Noto", data: bold, weight: 700, style: "normal" }],
    }
  )
}
