"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { supabaseAuthConfigured, supabaseBrowserUrl, supabasePublishableKey } from "@/lib/supabase/env"

export function RecoveryListener() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return

    // 1. If hash contains recovery token or type=recovery
    const hash = window.location.hash
    if (hash && (hash.includes("type=recovery") || hash.includes("access_token="))) {
      if (pathname !== "/reset-password") {
        window.location.replace(`/reset-password${hash}`)
        return
      }
    }

    // 2. If search parameters on homepage contain code for recovery
    const search = window.location.search
    if (search && pathname === "/") {
      const params = new URLSearchParams(search)
      if (params.get("type") === "recovery" || params.get("next") === "/reset-password") {
        window.location.replace(`/auth/callback${search}`)
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
