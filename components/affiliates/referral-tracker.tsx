"use client"

import { useEffect } from "react"

export function ReferralTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get("ref")
      if (ref && /^[a-zA-Z0-9_-]{3,32}$/.test(ref)) {
        // Set cookie for 30 days
        document.cookie = `sp_ref=${encodeURIComponent(ref)}; path=/; max-age=2592000; SameSite=Lax`
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, [])

  return null
}
