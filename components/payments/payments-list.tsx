"use client"

import Link from "next/link"
import { useScope } from "@/lib/data/store"
import { moneyExact } from "@/lib/format"
import { listPaymentRows, type PaymentRow } from "@/lib/payments/ledger"

export function PaymentsList() {
  const { ready, estimates, clients, quoteEstimate, session } = useScope()
  const limited = session?.role === "project_manager"
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
              <InvoiceRow
                row={row}
                href={limited ? undefined : row.balance > 0 ? `/estimates/${row.id}/pay` : `/estimates/${row.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function InvoiceRow({ row, href }: { row: PaymentRow; href?: string }) {
  const className =
    "grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))] sm:items-center"
  const body = (
    <>
      <span>
        <span className="block font-medium">{row.clientName}</span>
        <span className="block text-sm text-muted-foreground">
          {row.title} · {row.depositPercent}% deposit
        </span>
      </span>
      <span className="text-sm tabular-nums">
        <span className="block text-muted-foreground">Total</span>
        {moneyExact(row.total)}
        {row.credit > 0 ? <span className="block text-muted-foreground">Credit {moneyExact(row.credit)}</span> : null}
      </span>
      <span className="text-sm tabular-nums">
        <span className="block text-muted-foreground">Paid</span>
        {moneyExact(row.paid)}
      </span>
      <span className="text-sm font-medium tabular-nums">
        <span className="block font-normal text-muted-foreground">Balance</span>
        {moneyExact(row.balance)}
      </span>
    </>
  )
  if (!href) {
    return (
      <div data-testid={`payment-row-${row.id}`} className={className}>
        {body}
      </div>
    )
  }
  return (
    <Link href={href} data-testid={`payment-row-${row.id}`} className={className}>
      {body}
    </Link>
  )
}
