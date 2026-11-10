"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { supabaseAuthConfigured } from "@/lib/supabase/env"

export function RecoveryListener() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return

    // 1. Securely handle URL fragment tokens on client before server verification
    const rawHash = window.location.hash
    if (rawHash && rawHash.includes("access_token")) {
      const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const type = hashParams.get("type")

      // Immediately strip tokens from the URL bar so they are not exposed in history, logs, or referrers
      window.history.replaceState(null, "", window.location.pathname + window.location.search)

      if (accessToken && refreshToken && supabaseAuthConfigured()) {
        if (type === "recovery") {
          const target = window.location.hostname === "scopepipe.com"
            ? "https://www.scopepipe.com/reset-password"
            : "/reset-password"
          window.location.replace(target)
          return
        }

        const supabase = createClient()
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => {
            const target = window.location.hostname === "scopepipe.com"
              ? "https://www.scopepipe.com/auth/callback"
              : "/auth/callback"
            window.location.replace(target)
          })
          .catch(() => {
            const target = window.location.hostname === "scopepipe.com"
              ? "https://www.scopepipe.com/login?confirmed=1&onboarding=incomplete"
              : "/login?confirmed=1&onboarding=incomplete"
            window.location.replace(target)
          })
        return
      }
    }

    // 2. Handle email confirmation and recovery query parameters landing on the homepage or apex domain
    const search = window.location.search
    if (search && pathname === "/") {
      const params = new URLSearchParams(search)
      const isRecovery =
        params.get("type") === "recovery" ||
        params.get("next") === "/reset-password" ||
        params.get("next")?.startsWith("/reset-password")

      if (params.get("token_hash") && isRecovery) {
        const target = window.location.hostname === "scopepipe.com"
          ? `https://www.scopepipe.com/reset-password${search}`
          : `/reset-password${search}`
        window.location.replace(target)
        return
      }

      if (params.get("code") || params.get("token_hash")) {
        const target = window.location.hostname === "scopepipe.com"
          ? `https://www.scopepipe.com/auth/callback${search}`
          : `/auth/callback${search}`
        window.location.replace(target)
        return
      }
    }
  }, [pathname])

  return null
}
