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
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import type { ChangeOrder, LineItemInput } from "@/lib/types"

export function OnSiteChangeOrder({ estimateId }: { estimateId: string }) {
  const { applyChangeOrder } = useScope()
  const { copy } = useFieldLanguage()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [signature, setSignature] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const price = Number(amount)
    if (!description.trim() || !Number.isFinite(price) || price <= 0 || !signature) {
      setError(copy.changeError)
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
        setError(body?.error ?? copy.changeFailed)
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
      setError(copy.changeFailed)
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
        {copy.createChange}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.changeTitle}</DialogTitle>
            <DialogDescription>{copy.changeBody}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="on-site-change-order-scope">{copy.scopeReason}</Label>
              <Input
                id="on-site-change-order-scope"
                value={description}
                className="h-11"
                placeholder={copy.changePlaceholder}
                data-testid="change-order-scope"
                onValueChange={setDescription}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="on-site-change-order-amount">{copy.additionalAmount}</Label>
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
                {copy.cancel}
              </Button>
              <Button type="submit" className="h-11" disabled={pending} data-testid="apply-change-order">
                {pending ? copy.applying : copy.signAndApply}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
