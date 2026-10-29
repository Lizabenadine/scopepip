"use client"

import { useState } from "react"
import { PendingSignForm } from "@/components/estimate/pending-sign-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { pendingAmount } from "@/lib/estimate/pending"

export function PendingSign({ estimateId }: { estimateId: string }) {
  const { estimates, applyPendingSignature } = useScope()
  const { copy } = useFieldLanguage()
  const [open, setOpen] = useState(false)
  const estimate = estimates.find((item) => item.id === estimateId)
  const lines = estimate?.lineItems.filter((line) => line.pending) ?? []
  if (!estimate || lines.length === 0) return null

  return (
    <>
      <Button type="button" variant="outline" className="h-11 w-full" data-testid="open-pending-sign" onClick={() => setOpen(true)}>
        {copy.customerSignsPending}
      </Button>
      {open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{copy.pendingTitle}</DialogTitle>
              <DialogDescription>{copy.pendingBody}</DialogDescription>
            </DialogHeader>
            <PendingSignForm
              lines={lines.map((line) => ({
                id: line.id,
                label: line.label.trim() || "Additional work",
                amount: pendingAmount(line, estimate.settings),
                note: line.clientNote,
              }))}
              onSign={async (lineIds, signature) => {
                const result = applyPendingSignature(estimateId, lineIds, signature)
                if (result.ok) setOpen(false)
                return result
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
