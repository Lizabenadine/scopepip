"use client"

import { useEffect, useRef, useState } from "react"
import { useScope } from "@/lib/data/store"
import type { ProposalMessage } from "@/lib/types"

export function ProposalChat({
  messages,
  customerName,
  viewer,
  onSend,
}: {
  messages: ProposalMessage[]
  customerName: string
  viewer: "customer" | "office"
  onSend: (body: string) => Promise<{ ok: true } | { ok: false; reason: string }>
}) {
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (sending) return
    setSending(true)
    setError(null)
    const result = await onSend(body)
    setSending(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setBody("")
  }

  return (
    <section data-testid="proposal-chat" data-proposal-section="Chat" className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div>
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {viewer === "customer"
            ? "Write a question about this proposal. Your painter replies here."
            : "Reply here. The customer sees it on the proposal."}
        </p>
      </div>
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {messages.map((message) => (
            <li key={message.id} className="rounded-xl bg-muted/60 px-3 py-2" data-testid={`proposal-message-${message.id}`}>
              <p className="text-xs font-medium text-muted-foreground">{speaker(message, viewer, customerName)}</p>
              <p className="mt-1 text-sm whitespace-pre-line">{message.body}</p>
            </li>
          ))}
        </ol>
      )}
      <label className="grid gap-1 text-sm" htmlFor="proposal-chat-body">
        Message
        <textarea
          id="proposal-chat-body"
          data-testid="proposal-chat-body"
          value={body}
          rows={3}
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none"
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button
        type="button"
        data-testid="proposal-chat-send"
        className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={sending}
        onClick={() => void send()}
      >
        {sending ? "Sending" : "Send"}
      </button>
    </section>
  )
}

export function OfficeProposalChat({
  estimateId,
  messages,
  customerName,
}: {
  estimateId: string
  messages: ProposalMessage[]
  customerName: string
}) {
  const scope = useScope()
  const reload = useRef(scope.reloadBook)
  reload.current = scope.reloadBook
  useEffect(() => {
    const timer = window.setInterval(() => void reload.current(), 8000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <ProposalChat
      messages={messages}
      customerName={customerName}
      viewer="office"
      onSend={(body) => Promise.resolve(scope.postProposalChat(estimateId, body))}
    />
  )
}

function speaker(message: ProposalMessage, viewer: "customer" | "office", customerName: string): string {
  if (message.from === "office") return viewer === "office" ? "You" : "Office"
  return viewer === "customer" ? "You" : customerName
}
