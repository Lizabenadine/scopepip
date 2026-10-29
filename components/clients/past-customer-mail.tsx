"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { displayCompanyName } from "@/lib/brand/company"
import { useScope } from "@/lib/data/store"
import { pastCustomerEmail, pastCustomers } from "@/lib/outreach/past-customers"
import type { FollowUpMessage } from "@/lib/follow-ups/types"

export function PastCustomerMail() {
  const scope = useScope()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState("")
  const rows = pastCustomers(scope)
  const company = displayCompanyName(scope.estimateSettings.companyName)

  async function send() {
    if (rows.length === 0 || sending) return
    setSending(true)
    setResult("")
    let sent = 0
    let logged = 0
    let failed = 0
    for (const row of rows) {
      const message = pastCustomerEmail({ clientName: row.client.name, company, address: row.address })
      try {
        const response = await fetch("/api/follow-ups/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channel: "email", to: row.email, subject: message.subject, body: message.body, fromName: company }),
        })
        const payload = (await response.json()) as { delivery?: string; detail?: string }
        const delivery = payload.delivery === "sent" ? "sent" : payload.delivery === "logged" ? "logged" : "skipped"
        if (payload.delivery === "sent") sent += 1
        else if (payload.delivery === "failed") failed += 1
        else logged += 1
        const record: FollowUpMessage = {
          id: crypto.randomUUID(),
          estimateId: row.estimate.id,
          stepId: "past-customer",
          stage: "project_completed",
          channel: "email",
          to: row.email,
          subject: message.subject,
          body: message.body,
          sentAt: new Date().toISOString(),
          delivery,
          detail: payload.detail || "",
        }
        scope.recordFollowUpDelivery(record)
      } catch {
        failed += 1
      }
    }
    setSending(false)
    setResult(
      failed > 0 && sent === 0 && logged === 0
        ? "The email could not be sent."
        : `Sent ${sent}. Logged ${logged}.${failed > 0 ? ` ${failed} failed.` : ""}`,
    )
  }

  return (
    <section className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm" data-testid="email-past-customers">
      <h2 className="text-lg font-semibold">Email past customers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One email to every client whose job is finished and who has an email address.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No finished jobs with an email yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {rows.map((row) => (
            <li key={row.client.id}>
              {row.client.name} · {row.email}
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        className="mt-3 h-11"
        data-testid="send-past-customers"
        disabled={rows.length === 0 || sending}
        onClick={() => void send()}
      >
        {sending ? "Sending..." : rows.length === 1 ? "Email 1 past customer" : `Email ${rows.length} past customers`}
      </Button>
      {result ? <p className="mt-2 text-sm">{result}</p> : null}
    </section>
  )
}
