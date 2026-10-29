"use client"

import { useState } from "react"
import { SignaturePad } from "@/components/proposal/signature-pad"
import { Button } from "@/components/ui/button"
import { money } from "@/lib/format"

export interface PendingSignLine {
  id: string
  label: string
  amount: number
  note: string
}

export function PendingSignForm({
  lines,
  onSign,
}: {
  lines: PendingSignLine[]
  onSign: (lineIds: string[], signature: string) => Promise<{ ok: true } | { ok: false; reason: string }>
}) {
  const [signature, setSignature] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    if (!signature) {
      setError("The customer signature is missing.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await onSign(lines.map((line) => line.id), signature)
      if (!result.ok) setError(result.reason)
    } catch {
      setError("The signature could not be saved.")
    } finally {
      setPending(false)
    }
  }

  if (lines.length === 0) return null

  return (
    <div className="flex flex-col gap-3" data-testid="pending-sign-form">
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span>
              <span className="font-medium">{line.label}</span>
              {line.note ? <span className="mt-1 block text-muted-foreground">{line.note}</span> : null}
            </span>
            <span className="tabular-nums">{money(line.amount)}</span>
          </li>
        ))}
      </ul>
      <SignaturePad onChange={(payload) => setSignature(payload)} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" className="h-11" data-testid="pending-sign" disabled={pending} onClick={() => void submit()}>
        {pending ? "Saving" : "Sign additional work"}
      </Button>
    </div>
  )
}
