"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function RecoveryListener() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return

    // If a recovery link lands on the homepage with token_hash or type=recovery, redirect to /reset-password
    const search = window.location.search
    if (search && pathname === "/") {
      const params = new URLSearchParams(search)
      if (params.get("token_hash") || params.get("type") === "recovery") {
        window.location.replace(`/reset-password${search}`)
      }
    }
  }, [pathname])

  return null
}
