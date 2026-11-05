"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { supabaseAuthConfigured, supabaseBrowserUrl, supabasePublishableKey } from "@/lib/supabase/env"

export function RecoveryListener() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return

    // 1. If hash contains recovery token, type=recovery, or auth error (e.g. otp_expired)
    const hash = window.location.hash
    if (
      hash &&
      (hash.includes("type=recovery") ||
        hash.includes("access_token=") ||
        hash.includes("error_code=") ||
        hash.includes("error_description=") ||
        hash.includes("error="))
    ) {
      if (pathname !== "/reset-password") {
        window.location.replace(`/reset-password${hash}`)
        return
      }
    }

    // 2. If search parameters on homepage contain code or recovery error
    const search = window.location.search
    if (search && pathname === "/") {
      const params = new URLSearchParams(search)
      if (
        params.get("type") === "recovery" ||
        params.get("next") === "/reset-password" ||
        params.get("error_code") ||
        params.get("error")
      ) {
        window.location.replace(`/reset-password${search}`)
        return
      }
    }

    // 3. Listen for Supabase PASSWORD_RECOVERY event
    if (!supabaseAuthConfigured()) return
    try {
      const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          if (pathname !== "/reset-password") {
            window.location.assign("/reset-password")
          }
        }
      })
      return () => {
        subscription.unsubscribe()
      }
    } catch {
      // Ignore if supabase browser client cannot initialize
    }
  }, [pathname])

  return null
}
