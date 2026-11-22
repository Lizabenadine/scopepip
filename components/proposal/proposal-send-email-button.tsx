"use client"

import { useState } from "react"
import { Mail, Check, Loader2, X, Send } from "lucide-react"

export function ProposalSendEmailButton({
  estimateId,
  clientEmail,
  isSigned,
  className,
}: {
  estimateId: string
  clientEmail?: string
  isSigned?: boolean
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle")
  const [message, setMessage] = useState<string>("")
  const [showPrompt, setShowPrompt] = useState(false)
  const [inputEmail, setInputEmail] = useState(clientEmail || "")

  async function sendTo(email: string) {
    const trimmed = email.trim()
    if (!trimmed.includes("@")) {
      setMessage("Enter a valid email address.")
      setStatus("error")
      return
    }
    setBusy(true)
    setStatus("idle")
    setMessage("")
    try {
      const response = await fetch(`/api/proposals/${encodeURIComponent(estimateId)}/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean
        delivery?: string
        reason?: string
        detail?: string
      } | null

      if (response.ok && (result?.ok || result?.delivery === "sent")) {
        setStatus("sent")
        setMessage(`Sent to ${trimmed}`)
        setShowPrompt(false)
        setTimeout(() => setStatus("idle"), 4000)
      } else {
        setStatus("error")
        setMessage(result?.reason || result?.detail || "Email delivery failed.")
        setTimeout(() => setStatus("idle"), 4000)
      }
    } catch {
      setStatus("error")
      setMessage("Network error sending email.")
      setTimeout(() => setStatus("idle"), 4000)
    } finally {
      setBusy(false)
    }
  }

  function handleClick() {
    if (clientEmail && clientEmail.includes("@")) {
      void sendTo(clientEmail)
    } else {
      setShowPrompt(true)
    }
  }

  if (showPrompt) {
    return (
      <div className="relative inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 p-1.5 text-xs shadow-xs">
        <input
          type="email"
          autoFocus
          value={inputEmail}
          onChange={(e) => setInputEmail(e.target.value)}
          placeholder="recipient@example.com"
          className="h-7 w-44 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") void sendTo(inputEmail)
            if (e.key === "Escape") setShowPrompt(false)
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void sendTo(inputEmail)}
          className="inline-flex h-7 items-center gap-1 rounded-lg bg-blue-600 px-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          <span>Send</span>
        </button>
        <button
          type="button"
          onClick={() => setShowPrompt(false)}
          className="p-1 text-slate-400 hover:text-slate-600"
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        disabled={busy}
        onClick={handleClick}
        data-testid={`email-proposal-${estimateId}`}
        title={clientEmail ? `Email to ${clientEmail}` : "Email proposal"}
        className={
          className ||
          "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors disabled:opacity-60"
        }
      >
        {busy ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-blue-600" />
            <span>Sending…</span>
          </>
        ) : status === "sent" ? (
          <>
            <Check className="size-3.5 text-emerald-600" />
            <span className="text-emerald-700">Sent!</span>
          </>
        ) : status === "error" ? (
          <>
            <Mail className="size-3.5 text-rose-500" />
            <span className="text-rose-600">Failed</span>
          </>
        ) : (
          <>
            <Mail className="size-3.5 text-slate-500" />
            <span>{isSigned ? "Send Email" : "Send Email"}</span>
          </>
        )}
      </button>
      {message && status !== "idle" && (
        <span className="sr-only" role="status">
          {message}
        </span>
      )}
    </div>
  )
}
