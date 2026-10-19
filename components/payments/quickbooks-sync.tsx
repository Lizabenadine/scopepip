"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useScope } from "@/lib/data/store"
import { quickBooksInvoice } from "@/lib/quickbooks/invoice"
import { listPaymentRows } from "@/lib/payments/ledger"

export function QuickBooksSync() {
  const scope = useScope()
  const [sending, setSending] = useState(false)
  const [detail, setDetail] = useState("")
  const rows = listPaymentRows(scope.estimates, scope.clients, (estimate) => scope.quoteEstimate(estimate).total)

  async function sync() {
    if (sending) return
    setSending(true)
    setDetail("")
    const invoices = rows
      .map((row) => {
        const estimate = scope.estimates.find((item) => item.id === row.id)
        const client = scope.clients.find((item) => item.id === estimate?.clientId)
        return quickBooksInvoice({
          estimateId: row.id,
          customerName: row.clientName,
          email: client?.email ?? "",
          description: row.title,
          amount: row.total,
          quickbooksInvoiceId: estimate?.quickbooksInvoiceId,
        })
      })
      .filter((invoice) => invoice !== null)
    try {
      const response = await fetch("/api/quickbooks/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoices }),
      })
      const payload = (await response.json()) as {
        connected?: boolean
        detail?: string
        invoices?: { estimateId: string; quickbooksInvoiceId?: string; delivery: string }[]
      }
      const syncedAt = new Date().toISOString()
      const applied = (payload.invoices ?? [])
        .filter((invoice) => invoice.delivery === "synced" && invoice.quickbooksInvoiceId)
        .map((invoice) => ({ estimateId: invoice.estimateId, quickbooksInvoiceId: invoice.quickbooksInvoiceId!, syncedAt }))
      if (applied.length > 0) scope.applyQuickBooks(applied)
      setDetail(payload.detail || (payload.connected ? "QuickBooks did not accept the invoices." : "QuickBooks is not connected."))
    } catch {
      setDetail("QuickBooks could not be reached.")
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-testid="quickbooks-sync">
      <h2 className="text-lg font-semibold">QuickBooks</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Accepted invoices sync to QuickBooks Online when the company is connected. Nothing is marked synced until QuickBooks accepts it.
      </p>
      <Button type="button" className="mt-3 h-11" data-testid="quickbooks-send" disabled={sending || rows.length === 0} onClick={() => void sync()}>
        {sending ? "Syncing..." : "Sync invoices"}
      </Button>
      {detail ? <p className="mt-2 text-sm" data-testid="quickbooks-status">{detail}</p> : null}
    </section>
  )
}
