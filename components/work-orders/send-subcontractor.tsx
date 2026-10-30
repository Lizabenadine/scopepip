"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFieldLanguage } from "@/hooks/use-field-language"
import type { SubcontractorOffer } from "@/lib/types"

export function SendSubcontractor({
  offers,
  onSend,
}: {
  offers: SubcontractorOffer[]
  onSend: (name: string, email: string) => { ok: true; token: string; jobName: string } | { ok: false; reason: string }
}) {
  const { copy } = useFieldLanguage()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const submit = async () => {
    setNotice(null)
    setError(null)
    const sent = onSend(name, email)
    if (!sent.ok) {
      setError(sent.reason)
      return
    }
    const link = `${window.location.origin}/w/${sent.token}`
    setName("")
    setEmail("")
    try {
      const response = await fetch("/api/work-orders/offer-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: email, name: name.trim(), jobName: sent.jobName, token: sent.token }),
      })
      const body = (await response.json().catch(() => null)) as { detail?: string; link?: string; delivery?: string } | null
      const ready = body?.link ?? link
      setNotice(body?.delivery === "sent" ? (body.detail ?? ready) : `${body?.detail ?? ready} ${ready}`)
    } catch {
      setNotice(link)
    }
  }

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/w/${token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(token)
    } catch {
      setNotice(link)
    }
  }

  const current = [...offers].reverse().find((offer) => offer.status === "sent" || offer.status === "accepted")
  const passed = current ? undefined : [...offers].reverse().find((offer) => offer.status === "declined")

  return (
    <div className="space-y-4" data-testid="send-subcontractor">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{copy.sendOffers}</h3>
        <p className="mt-1 text-xs text-slate-500">{copy.sendOffersBody}</p>
      </div>
      {current ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span>
            <span className="font-semibold text-slate-900">{current.name}</span>
            <span className="text-slate-500"> · {current.email}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">
              {current.status === "accepted" ? copy.offerAccepted : copy.offerWaiting}
            </span>
            {current.status === "sent" ? (
              <button type="button" className="font-semibold text-blue-700" onClick={() => void copyLink(current.token)}>
                {copied === current.token ? copy.linkCopied : copy.copyOfferLink}
              </button>
            ) : null}
          </span>
        </div>
      ) : (
      <div className="grid gap-3">
      {passed ? (
        <p className="text-sm text-slate-700">
          {passed.name} · {copy.offerDeclined}. {copy.sendNext}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-1">
          <Label htmlFor="offer-name">{copy.offerName}</Label>
          <Input id="offer-name" data-testid="offer-name" value={name} className="h-11" onValueChange={setName} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="offer-email">{copy.offerEmail}</Label>
          <Input
            id="offer-email"
            data-testid="offer-email"
            value={email}
            inputMode="email"
            autoComplete="email"
            className="h-11"
            onValueChange={setEmail}
          />
        </div>
        <button
          type="button"
          data-testid="offer-send"
          className="h-11 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white"
          onClick={() => void submit()}
        >
          {copy.sendOffer}
        </button>
      </div>
      </div>
      )}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="text-sm text-slate-700" data-testid="offer-notice">{notice}</p> : null}
    </div>
  )
}
