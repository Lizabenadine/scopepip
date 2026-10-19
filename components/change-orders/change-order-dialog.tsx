"use client"

import { useState } from "react"
import { SignaturePad } from "@/components/proposal/signature-pad"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import type { ChangeOrder, LineItemInput } from "@/lib/types"

export function ChangeOrderDialog({
  estimateId,
  onApplied,
}: {
  estimateId: string
  onApplied: (lineItems: LineItemInput[], message: string) => void
}) {
  const { applyChangeOrder } = useScope()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [amount, setAmount] = useState("")
  const [signature, setSignature] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    setPending(true)
    setError(null)
    const price = Number(amount)
    try {
      const response = await fetch(`/api/work-orders/${estimateId}/change-orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [{ label, amount: price }],
          subtotal: price,
          clientSignatureUrl: signature,
        }),
      })
      const body = (await response.json().catch(() => null)) as {
        error?: string
        message?: string
        changeOrder?: ChangeOrder
        lineItems?: LineItemInput[]
      } | null
      if (!response.ok || !body?.changeOrder || !body.lineItems) {
        setError(body?.error ?? "Could not apply the change order.")
        return
      }
      const applied = applyChangeOrder(body.changeOrder, body.lineItems)
      if (!applied.ok) {
        setError(applied.reason)
        return
      }
      onApplied(body.lineItems, body.message ?? "Change order applied and invoice updated instantly.")
      setLabel("")
      setAmount("")
      setSignature("")
      setOpen(false)
    } catch {
      setError("Could not apply the change order.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="h-9" onClick={() => setOpen(true)}>
        Change order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change order</DialogTitle>
            <DialogDescription>
              Add signed extra work. The invoice picks up the amount on the next total.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="change-order-label">Work</Label>
              <Input
                id="change-order-label"
                value={label}
                className="h-11"
                onValueChange={setLabel}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="change-order-amount">Amount</Label>
              <Input
                id="change-order-amount"
                inputMode="decimal"
                value={amount}
                className="h-11"
                onValueChange={setAmount}
              />
            </div>
            <SignaturePad onChange={(payload) => setSignature(payload)} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" className="h-11" disabled={pending} onClick={() => void submit()}>
              {pending ? "Applying" : "Apply change order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
