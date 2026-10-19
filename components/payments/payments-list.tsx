"use client"

import Link from "next/link"
import { useScope } from "@/lib/data/store"
import { moneyExact } from "@/lib/format"
import { listPaymentRows } from "@/lib/payments/ledger"

export function PaymentsList() {
  const { ready, estimates, clients, quoteEstimate } = useScope()
  const rows = listPaymentRows(estimates, clients, (estimate) => quoteEstimate(estimate).total)

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  return (
    <section className="flex flex-col gap-4" data-testid="payments-list">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices & Payments</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length === 0 ? "Accepted jobs become invoices." : `${rows.length} invoices`}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No invoices yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.balance > 0 ? `/estimates/${row.id}/pay` : `/estimates/${row.id}`}
                data-testid={`payment-row-${row.id}`}
                className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))] sm:items-center"
              >
                <span>
                  <span className="block font-medium">{row.clientName}</span>
                  <span className="block text-sm text-muted-foreground">
                    {row.title} · {row.depositPercent}% deposit
                  </span>
                </span>
                <span className="text-sm tabular-nums">
                  <span className="block text-muted-foreground">Total</span>
                  {moneyExact(row.total)}
                </span>
                <span className="text-sm tabular-nums">
                  <span className="block text-muted-foreground">Paid</span>
                  {moneyExact(row.paid)}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  <span className="block font-normal text-muted-foreground">Balance</span>
                  {moneyExact(row.balance)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
