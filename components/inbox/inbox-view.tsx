"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { officeLabel } from "@/lib/office/dashboard-copy"
import type { Client, TextMessage } from "@/lib/types"

const PHOTO_LIMIT = 1_500_000

export function InboxView() {
  const scope = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const params = useSearchParams()
  const requested = params.get("client")
  const [chosen, setChosen] = useState<string | null | "unset">("unset")
  const [phone, setPhone] = useState("")
  const [phoneReady, setPhoneReady] = useState(false)
  const [phoneSaved, setPhoneSaved] = useState(false)
  const selected = chosen === "unset" ? requested : chosen

  useEffect(() => {
    if (!scope.ready || phoneReady) return
    setPhone(scope.estimateSettings.businessPhone ?? "")
    setPhoneReady(true)
  }, [scope.ready, scope.estimateSettings.businessPhone, phoneReady])

  const threads = useMemo(() => {
    return [...scope.clients].sort((left, right) => lastAt(right) - lastAt(left))
  }, [scope.clients])

  if (!scope.ready) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />

  const client = threads.find((item) => item.id === selected) ?? null
  const businessPhone = scope.estimateSettings.businessPhone?.trim() || ""

  return (
    <div className="flex flex-col gap-4" data-testid="inbox">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{say("Inbox")}</h1>
          <p className="text-sm text-muted-foreground">
            {language === "es"
              ? "Un hilo por cliente. Una respuesta llega a su trato y detiene ese seguimiento."
              : "One thread per client. A reply lands on their deal and stops that follow-up."}
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            scope.saveBusinessPhone(phone)
            setPhoneSaved(true)
          }}
        >
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Business number
            <input
              id="business-phone"
              data-testid="business-phone"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                setPhoneSaved(false)
              }}
              placeholder="(503) 555-0199"
              className="h-10 w-48 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground"
            />
          </label>
          <Button type="submit" className="h-10">
            Save number
          </Button>
          {phoneSaved ? <p className="text-xs text-muted-foreground">Saved.</p> : null}
        </form>
      </div>
      <p className="text-xs text-muted-foreground">
        {businessPhone ? `Customers text ${businessPhone}.` : "Save the number customers should text."} Texts log on the
        thread until Twilio is connected. A carrier reply posts to /api/messages/inbound.
      </p>
      <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className={client ? "hidden flex-col gap-2 md:flex" : "flex flex-col gap-2"}>
          {(scope.unmatchedTexts ?? []).map((message) => (
            <UnmatchedCard key={message.id} message={message} clients={scope.clients} onAssign={scope.assignUnmatchedText} />
          ))}
          {threads.map((item) => {
            const last = item.messages?.[item.messages.length - 1]
            const active = item.id === client?.id
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`thread-${item.id}`}
                onClick={() => setChosen(item.id)}
                className={
                  active
                    ? "rounded-2xl bg-card px-3 py-3 text-left ring-2 ring-primary"
                    : "rounded-2xl bg-card px-3 py-3 text-left border border-slate-200 bg-white shadow-sm"
                }
              >
                <span className="block font-medium">{item.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {last ? last.body || "Photo" : item.phone || "No texts yet"}
                </span>
              </button>
            )
          })}
        </aside>
        <section className={!client ? "hidden md:block" : "block"}>
          {client ? (
            <Thread
              client={client}
              businessPhone={businessPhone}
              onBack={() => setChosen(null)}
              onSend={scope.appendOutboundText}
              onDelivery={scope.markTextDelivery}
              onReply={scope.logCustomerReply}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">
              Pick a client to read the thread.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function Thread({
  client,
  businessPhone,
  onBack,
  onSend,
  onDelivery,
  onReply,
}: {
  client: Client
  businessPhone: string
  onBack: () => void
  onSend: (clientId: string, body: string, mediaUrls: string[]) => TextMessage | null
  onDelivery: (clientId: string, messageId: string, delivery: TextMessage["delivery"]) => void
  onReply: (clientId: string, body: string, mediaUrls: string[]) => { ok: true; estimateId: string | null } | { ok: false }
}) {
  const [body, setBody] = useState("")
  const [photo, setPhoto] = useState<string | null>(null)
  const [replying, setReplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const messages = client.messages ?? []

  async function submit() {
    const text = body.trim()
    const mediaUrls = photo ? [photo] : []
    if (!text && mediaUrls.length === 0) return
    setSending(true)
    setError(null)
    if (replying) {
      const result = onReply(client.id, text, mediaUrls)
      setSending(false)
      if (!result.ok) {
        setError("That reply could not be saved.")
        return
      }
      setBody("")
      setPhoto(null)
      return
    }
    if (!client.phone.trim()) {
      setSending(false)
      setError("Add a phone number on the client before texting.")
      return
    }
    const message = onSend(client.id, text, mediaUrls)
    if (!message) {
      setSending(false)
      return
    }
    try {
      const response = await fetch("/api/follow-ups/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: "text", to: client.phone, subject: "", body: text || "Photo" }),
      })
      const result = (await response.json()) as { delivery?: string }
      const delivery = result.delivery === "sent" ? "sent" : result.delivery === "failed" ? "failed" : "logged"
      onDelivery(client.id, message.id, delivery)
      setBody("")
      setPhoto(null)
    } catch {
      onDelivery(client.id, message.id, "failed")
      setError("The text could not be sent. It is still on the thread.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-[32rem] flex-col rounded-2xl bg-card border border-slate-200 bg-white shadow-sm" data-testid="inbox-thread">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <button type="button" className="mb-1 text-xs font-medium text-primary md:hidden" onClick={onBack}>
            All threads
          </button>
          <h2 className="font-medium">{client.name}</h2>
          <p className="text-xs text-muted-foreground">
            {client.phone || "No phone"} {businessPhone ? `· from ${businessPhone}` : ""}
          </p>
        </div>
        <Link href={`/clients/${client.id}`} className="text-sm font-medium text-primary">
          Client
        </Link>
      </header>
      <ol className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">No texts yet. Follow-up texts show up here, and so do replies.</li>
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} />)
        )}
      </ol>
      <form
        className="grid gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={!replying ? "font-medium text-foreground" : "text-muted-foreground"}
            onClick={() => setReplying(false)}
          >
            Office text
          </button>
          <button
            type="button"
            data-testid="inbox-reply-mode"
            className={replying ? "font-medium text-foreground" : "text-muted-foreground"}
            onClick={() => setReplying(true)}
          >
            Customer reply
          </button>
        </div>
        <textarea
          data-testid="inbox-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder={replying ? "What the customer texted back..." : "Text the customer..."}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none"
        />
        {photo ? <img src={photo} alt="Photo to send" className="h-24 w-24 rounded-lg object-cover" /> : null}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-primary">
            Photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                void readPhoto(file).then(setPhoto).catch((reason: unknown) => {
                  setError(reason instanceof Error ? reason.message : "That photo could not be read.")
                })
              }}
            />
          </label>
          <Button type="submit" className="h-10" disabled={sending} data-testid="inbox-send">
            {replying ? "Save reply" : "Send text"}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </div>
  )
}

function Bubble({ message }: { message: TextMessage }) {
  const outbound = message.direction === "out"
  return (
    <li className={outbound ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          outbound
            ? "max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
            : "max-w-[80%] rounded-2xl bg-muted px-3 py-2 text-sm"
        }
      >
        {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}
        {message.mediaUrls.map((url) => (
          <img key={url.slice(0, 48)} src={url} alt="Text photo" className="mt-2 max-h-48 rounded-lg" />
        ))}
        <p className={outbound ? "mt-1 text-[11px] text-primary-foreground/80" : "mt-1 text-[11px] text-muted-foreground"}>
          {outbound ? (message.delivery === "sent" ? "Sent" : message.delivery === "failed" ? "Not sent" : "Logged") : "Reply"}
        </p>
      </div>
    </li>
  )
}

function UnmatchedCard({
  message,
  clients,
  onAssign,
}: {
  message: TextMessage
  clients: Client[]
  onAssign: (messageId: string, clientId: string) => void
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "")
  return (
    <div className="rounded-2xl bg-amber-50 px-3 py-3 text-sm ring-1 ring-amber-200" data-testid={`unmatched-${message.id}`}>
      <p className="font-medium">Unknown {message.from || "number"}</p>
      <p className="text-xs text-muted-foreground">{message.body || "Photo"}</p>
      <div className="mt-2 flex gap-2">
        <select
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-white px-2 text-xs"
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="text-xs font-medium text-primary"
          onClick={() => {
            if (clientId) onAssign(message.id, clientId)
          }}
        >
          Assign
        </button>
      </div>
    </div>
  )
}

function lastAt(client: Client): number {
  const last = client.messages?.[client.messages.length - 1]?.createdAt
  return last ? Date.parse(last) : 0
}

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose a photo."))
      return
    }
    if (file.size > 900_000) {
      reject(new Error("Use a photo under 900 KB."))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : ""
      if (!value.startsWith("data:image/") || value.length > PHOTO_LIMIT) {
        reject(new Error("Use a smaller photo."))
        return
      }
      resolve(value)
    }
    reader.onerror = () => reject(new Error("That photo could not be read."))
    reader.readAsDataURL(file)
  })
}
