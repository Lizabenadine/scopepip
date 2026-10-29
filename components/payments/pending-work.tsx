"use client"

import { PendingSignForm } from "@/components/estimate/pending-sign-form"
import { pendingAmount } from "@/lib/estimate/pending"
import { money } from "@/lib/format"
import type { Estimate } from "@/lib/types"

export function PendingWork({
  estimate,
  onSigned,
}: {
  estimate: Estimate
  onSigned: (estimate: Estimate) => void
}) {
  const lines = estimate.lineItems.filter((line) => line.pending)
  const credits = estimate.credits ?? []
  if (lines.length === 0 && credits.length === 0) return null

  const sign = async (lineIds: string[], signature: string) => {
    const response = await fetch(`/api/public/estimates/${encodeURIComponent(estimate.id)}/pending`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineIds, clientSignatureUrl: signature }),
    })
    const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string; estimate?: Estimate } | null
    if (!response.ok || !body?.ok || !body.estimate) {
      return { ok: false as const, reason: body?.reason || "The signature could not be saved." }
    }
    onSigned(body.estimate)
    return { ok: true as const }
  }

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-testid="pending-work">
      {lines.length > 0 ? (
        <>
          <h2 className="text-lg font-semibold">Pending additional work</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This stays off the invoice until you sign it. A reduction becomes a credit.
          </p>
          <div className="mt-3">
            <PendingSignForm
              lines={lines.map((line) => ({
                id: line.id,
                label: line.label.trim() || "Additional work",
                amount: pendingAmount(line, estimate.settings),
                note: line.clientNote,
              }))}
              onSign={sign}
            />
          </div>
        </>
      ) : null}
      {credits.length > 0 ? (
        <div className={lines.length > 0 ? "mt-4 border-t border-border pt-3" : ""}>
          <h2 className="text-sm font-semibold">Credits</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {credits.map((credit) => (
              <li key={credit.id} className="flex justify-between gap-3 text-sm">
                <span>{credit.label}</span>
                <span className="tabular-nums">{money(-credit.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
