"use client"

import Link from "next/link"
import { CompanyMark } from "@/components/brand/company-mark"
import { Button } from "@/components/ui/button"
import { displayCompanyName } from "@/lib/brand/company"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { moneyExact } from "@/lib/format"
import { listPaymentRows, type PaymentRow } from "@/lib/payments/ledger"

export function PaymentsList() {
  const { ready, estimates, clients, quoteEstimate, session, estimateSettings } = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const limited = session?.role === "project_manager"
  const rows = listPaymentRows(estimates, clients, (estimate) => quoteEstimate(estimate).total)

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  return (
    <section className="flex flex-col gap-4" data-testid="payments-list">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
        <CompanyMark
          name={displayCompanyName(estimateSettings.companyName)}
          logoUrl={estimateSettings.logoUrl}
          className="font-display text-3xl text-primary"
          imageClassName="h-14"
          testId="invoice-brand"
        />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{say("Invoices & Payments")}</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? language === "es"
              ? "Los trabajos aceptados se vuelven facturas."
              : "Accepted jobs become invoices."
            : language === "es"
              ? `${rows.length} facturas`
              : `${rows.length} invoices`}
        </p>
        </div>
        <Button type="button" variant="outline" className="h-11" onClick={() => window.print()}>
          Print
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {language === "es" ? "Todavía no hay facturas." : "No invoices yet."}
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
    "grid gap-3 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))] sm:items-center"
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
