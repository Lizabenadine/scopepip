"use client"

import { useEffect, useRef } from "react"

export function ProposalTracker({ proposalId }: { proposalId: string }) {
  const hasTrackedOpen = useRef(false)

  useEffect(() => {
    if (hasTrackedOpen.current) return
    hasTrackedOpen.current = true

    // Development runs this effect twice. The timeout lets the first pass cancel
    // so a visit posts one open, including when the client comes back.
    const visit = window.setTimeout(() => {
      void fetch(`/api/proposals/${encodeURIComponent(proposalId)}/track`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventType: "open",
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => undefined)
    }, 0)

    return () => {
      window.clearTimeout(visit)
      hasTrackedOpen.current = false
    }
  }, [proposalId])

  return null
}
