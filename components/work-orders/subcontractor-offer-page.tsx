"use client"

import { useEffect, useState } from "react"
import { SubcontractorWorkOrder } from "@/components/work-orders/subcontractor-work-order"
import { useFieldLanguage } from "@/hooks/use-field-language"
import type { WorkOrderData } from "@/lib/work-orders/subcontractor"
import type { SubcontractorOfferStatus } from "@/lib/types"

interface OfferView {
  order: WorkOrderData
  description: string
  spanishDescription?: string
  offerName: string
  status: SubcontractorOfferStatus
  taken: boolean
  logoUrl?: string | null
}

export function SubcontractorOfferPage({ token }: { token: string }) {
  const { copy } = useFieldLanguage()
  const [view, setView] = useState<OfferView | null>(null)
  const [missing, setMissing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/public/work-orders/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setMissing(true)
          return
        }
        const body = (await response.json()) as OfferView
        if (!cancelled) setView(body)
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const answer = async (decision: "accept" | "decline") => {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/public/work-orders/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      const body = (await response.json().catch(() => null)) as { reason?: string; offer?: OfferView | null } | null
      if (!response.ok) {
        setError(body?.reason ?? copy.offerInvalid)
        return
      }
      if (body?.offer) setView(body.offer)
    } catch {
      setError(copy.offerInvalid)
    } finally {
      setPending(false)
    }
  }

  if (missing) {
    return <p className="text-sm text-slate-600">{copy.offerInvalid}</p>
  }
  if (!view) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  return (
    <SubcontractorWorkOrder
      order={view.order}
      logoUrl={view.logoUrl}
      description={view.description}
      spanishDescription={view.spanishDescription}
      setDescription={() => undefined}
      readOnly
      remote={{
        status: view.status,
        taken: view.taken,
        pending,
        error,
        onAccept: () => void answer("accept"),
        onDecline: () => void answer("decline"),
      }}
    />
  )
}
