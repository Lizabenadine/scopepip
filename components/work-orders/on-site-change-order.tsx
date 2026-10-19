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

export function OnSiteChangeOrder({ estimateId }: { estimateId: string }) {
  const { applyChangeOrder } = useScope()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [signature, setSignature] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const price = Number(amount)
    if (!description.trim() || !Number.isFinite(price) || price <= 0 || !signature) {
      setError("Add the scope, the amount, and the client's signature.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/work-orders/${estimateId}/change-orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [{ description: description.trim(), amount: price }],
          subtotal: price,
          clientSignatureUrl: signature,
        }),
      })
      const body = (await response.json().catch(() => null)) as {
        error?: string
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
      setDescription("")
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
      <Button
        type="button"
        className="h-11 w-full"
        data-testid="create-change-order"
        onClick={() => setOpen(true)}
      >
        Create on-site change order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>On-site change order</DialogTitle>
            <DialogDescription>
              The client signs the extra work. The invoice updates, and this sheet keeps the price off.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="on-site-change-order-scope">Scope / reason</Label>
              <Input
                id="on-site-change-order-scope"
                value={description}
                className="h-11"
                placeholder="Extra wood rot repair on fascia"
                data-testid="change-order-scope"
                onValueChange={setDescription}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="on-site-change-order-amount">Additional amount</Label>
              <Input
                id="on-site-change-order-amount"
                inputMode="decimal"
                value={amount}
                className="h-11"
                data-testid="change-order-amount"
                onValueChange={setAmount}
              />
            </div>
            <SignaturePad onChange={(payload) => setSignature(payload)} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="sm:flex-row">
              <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-11" disabled={pending} data-testid="apply-change-order">
                {pending ? "Applying" : "Sign and apply"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
