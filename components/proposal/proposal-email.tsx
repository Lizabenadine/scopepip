"use client"

import { useState } from "react"
import { useScope } from "@/lib/data/store"

export function ProposalEmail({ estimateId, hasEmail }: { estimateId: string; hasEmail: boolean }) {
  const { estimates, stages, moveStage, placeOnColumn } = useScope()
  const [note, setNote] = useState(
    hasEmail ? "" : "Add an email on the client before this proposal can go to an inbox.",
  )
  const [busy, setBusy] = useState(false)

  const placeInSent = () => {
    const estimate = estimates.find((item) => item.id === estimateId)
    if (!estimate || estimate.clientStatus === "accepted" || estimate.clientStatus === "declined") return
    const sentStage = stages.find((item) => item.slug === "estimate_sent")
    const current = stages.find((item) => item.id === estimate.stageId)
    const hold = current?.slug === "scheduled" || current?.slug === "completed"
    if (!hold && sentStage && current && current.id !== sentStage.id) moveStage(estimate.id, sentStage.id)
    if (!hold) placeOnColumn(estimate.id, "proposal_sent")
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <a className="font-medium text-primary" data-testid="proposal-pdf" href={`/api/proposals/${estimateId}/pdf`}>
        PDF
      </a>
      <button
        type="button"
        className="font-medium text-primary disabled:text-muted-foreground"
        data-testid="email-proposal"
        disabled={!hasEmail || busy}
        onClick={() => {
          setBusy(true)
          setNote("")
          void fetch(`/api/proposals/${estimateId}/email`, { method: "POST" })
            .then(async (response) => {
              const body = (await response.json().catch(() => null)) as { detail?: string; reason?: string } | null
              if (response.ok) placeInSent()
              setNote(body?.detail || body?.reason || "The proposal email could not be prepared.")
            })
            .catch(() => setNote("The proposal email could not be prepared."))
            .finally(() => setBusy(false))
        }}
      >
        {busy ? "Emailing…" : "Email proposal"}
      </button>
      {note ? (
        <p className="w-full text-muted-foreground" data-testid="proposal-email-status">
          {note}
        </p>
      ) : null}
    </div>
  )
}
