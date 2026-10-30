"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useScope } from "@/lib/data/store"
import { quickBooksCredit, quickBooksInvoice } from "@/lib/quickbooks/invoice"
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
    const credits = scope.estimates.flatMap((estimate) => {
      const client = scope.clients.find((item) => item.id === estimate.clientId)
      return (estimate.credits ?? [])
        .filter((credit) => !credit.quickbooksCreditId)
        .map((credit) =>
          quickBooksCredit({
            estimateId: estimate.id,
            creditId: credit.id,
            customerName: client?.name ?? "",
            email: client?.email ?? "",
            description: credit.label,
            amount: credit.amount,
          }),
        )
        .filter((credit) => credit !== null)
    })
    try {
      const response = await fetch("/api/quickbooks/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoices, credits }),
      })
      const payload = (await response.json()) as {
        connected?: boolean
        detail?: string
        invoices?: { estimateId: string; quickbooksInvoiceId?: string; delivery: string }[]
        credits?: { estimateId: string; creditId: string; quickbooksCreditId?: string; delivery: string }[]
      }
      const syncedAt = new Date().toISOString()
      const applied = (payload.invoices ?? [])
        .filter((invoice) => invoice.delivery === "synced" && invoice.quickbooksInvoiceId)
        .map((invoice) => ({ estimateId: invoice.estimateId, quickbooksInvoiceId: invoice.quickbooksInvoiceId!, syncedAt }))
      if (applied.length > 0) scope.applyQuickBooks(applied)
      const appliedCredits = (payload.credits ?? [])
        .filter((credit) => credit.delivery === "synced" && credit.quickbooksCreditId)
        .map((credit) => ({ estimateId: credit.estimateId, creditId: credit.creditId, quickbooksCreditId: credit.quickbooksCreditId! }))
      if (appliedCredits.length > 0) scope.applyQuickBooksCredits(appliedCredits)
      setDetail(payload.detail || (payload.connected ? "The books did not accept the invoices." : "The books are not connected."))
    } catch {
      setDetail("The books could not be reached.")
    } finally {
      setSending(false)
    }
  }

  if (scope.session?.role === "project_manager") return null

  return (
    <section className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm" data-testid="quickbooks-sync">
      <h2 className="text-lg font-semibold">Invoice sync</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Accepted invoices sync to the books when the company is connected. Nothing is marked synced until the books accept them.
      </p>
      <Button type="button" className="mt-3 h-11" data-testid="quickbooks-send" disabled={sending || rows.length === 0} onClick={() => void sync()}>
        {sending ? "Syncing..." : "Sync invoices"}
      </Button>
      {detail ? <p className="mt-2 text-sm" data-testid="quickbooks-status">{detail}</p> : null}
    </section>
  )
}
