"use client"

import { useEffect } from "react"

// Registers the PWA service worker (public/sw.js) after the app is interactive.
// Dev is skipped on purpose — a service worker in `next dev` caches assets and
// makes hot-reload behave unpredictably.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err)
      })
    }

    // Wait for the window load event so registration never competes with the
    // initial render for bandwidth.
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])

  return null
}
