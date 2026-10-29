"use client"

import { useState } from "react"

export function ProposalEmail({ estimateId, hasEmail }: { estimateId: string; hasEmail: boolean }) {
  const [note, setNote] = useState(
    hasEmail ? "" : "Add an email on the client before this proposal can go to an inbox.",
  )
  const [busy, setBusy] = useState(false)

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
