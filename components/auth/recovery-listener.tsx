"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function RecoveryListener() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return

    // 1. If hash contains recovery token, type=recovery, or auth error (e.g. otp_expired)
    const hash = window.location.hash
    if (hash && hash.length > 1) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      // Persist tokens in sessionStorage before anything can clear window.location.hash
      try {
        if (accessToken) {
          window.sessionStorage.setItem("scopepipe_recovery_access_token", accessToken)
        }
        if (refreshToken) {
          window.sessionStorage.setItem("scopepipe_recovery_refresh_token", refreshToken)
        }
      } catch {
        // ignore storage errors
      }

      if (
        hash.includes("type=recovery") ||
        hash.includes("access_token=") ||
        hash.includes("error_code=") ||
        hash.includes("error_description=") ||
        hash.includes("error=")
      ) {
        if (pathname !== "/reset-password") {
          window.location.replace(`/reset-password${hash}`)
          return
        }
      }
    }

    // 2. If search parameters on homepage contain code, token, token_hash, or recovery error
    const search = window.location.search
    if (search && pathname === "/") {
      const params = new URLSearchParams(search)
      if (
        params.get("type") === "recovery" ||
        params.get("token") ||
        params.get("token_hash") ||
        params.get("next") === "/reset-password" ||
        params.get("error_code") ||
        params.get("error")
      ) {
        window.location.replace(`/reset-password${search}`)
        return
      }
    }
  }, [pathname])

  return null
}
