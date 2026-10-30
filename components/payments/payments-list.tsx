"use client"

import Link from "next/link"
import { CompanyMark } from "@/components/brand/company-mark"
import { Button } from "@/components/ui/button"
import { displayCompanyName } from "@/lib/brand/company"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { compactNumber, moneyExact } from "@/lib/format"
import type { EstimateQuote } from "@/lib/estimate/calculate"
import { listPaymentRows, type PaymentRow } from "@/lib/payments/ledger"
import type { Estimate } from "@/lib/types"

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
          {rows.map((row) => {
            const estimate = estimates.find((item) => item.id === row.id)
            return (
              <li key={row.id}>
                <InvoiceRow
                  row={row}
                  estimate={estimate}
                  quote={estimate ? quoteEstimate(estimate) : null}
                  href={limited ? undefined : row.balance > 0 ? `/estimates/${row.id}/pay` : `/estimates/${row.id}`}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function InvoiceRow({
  row,
  estimate,
  quote,
  href,
}: {
  row: PaymentRow
  estimate?: Estimate
  quote: EstimateQuote | null
  href?: string
}) {
  const className = "block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
  const lines = quote ? invoiceLines(quote) : []
  const minimumGap = quote ? roundCents(row.total - (quote.subtotal - quote.discount + quote.tax)) : 0
  const paidOff = row.balance <= 0
  const body = (
    <>
      <div className="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Invoice Number</span>
          <p className="text-xl font-extrabold text-slate-900">{invoiceNumber(estimate, row.id)}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{row.clientName}</p>
          <p className="text-xs text-slate-500">{row.title}</p>
        </div>
        <div className="text-right">
          <span
            className={
              paidOff
                ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
                : "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
            }
          >
            {paidOff ? "Paid" : row.paid > 0 ? "Deposit paid" : "Due"}
          </span>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-sm font-bold tracking-wider text-slate-700 uppercase">Invoice Items</h3>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {lines.length === 0 ? (
            <div className="flex items-center justify-between p-4">
              <p className="text-sm font-semibold text-slate-800">{row.title}</p>
              <p className="text-sm font-bold text-slate-900">{moneyExact(row.total)}</p>
            </div>
          ) : (
            lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{line.name}</p>
                  {line.detail ? <p className="text-xs text-slate-500">{line.detail}</p> : null}
                </div>
                <p className="text-sm font-bold text-slate-900">{moneyExact(line.price)}</p>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 space-y-2 rounded-xl border border-slate-200/60 bg-slate-50 p-4">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{moneyExact(quote?.subtotal ?? row.total)}</span>
          </div>
          {quote && quote.discount > 0 ? (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Discount</span>
              <span>{moneyExact(-quote.discount)}</span>
            </div>
          ) : null}
          {quote && quote.tax > 0 ? (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span>{moneyExact(quote.tax)}</span>
            </div>
          ) : null}
          {minimumGap > 0 ? (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Minimum job charge</span>
              <span>{moneyExact(minimumGap)}</span>
            </div>
          ) : null}
          {row.paid > 0 ? (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Deposit applied</span>
              <span>{moneyExact(-row.paid)}</span>
            </div>
          ) : null}
          {row.credit > 0 ? (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Credit</span>
              <span>{moneyExact(-row.credit)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Balance Due</span>
            <span>{moneyExact(row.balance)}</span>
          </div>
        </div>
      </div>
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

function invoiceNumber(estimate: Estimate | undefined, id: string): string {
  const year = (estimate?.acceptedAt || estimate?.createdAt || "").slice(0, 4) || "2026"
  const body = id.replace(/^est-/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase()
  return `#INV-${year}-${body || "0000"}`
}

function invoiceLines(quote: EstimateQuote): { id: string; name: string; detail: string; price: number }[] {
  const lines: { id: string; name: string; detail: string; price: number }[] = []
  for (const area of quote.areas) {
    for (const surface of area.surfaces) {
      if (surface.hideFromCustomer) continue
      const measure = surface.quantity > 0 ? `${compactNumber(surface.quantity)} ${surface.quantityUnit}` : ""
      const coats = surface.showCoats && surface.coatCount > 0 ? `${surface.coatCount} coats` : ""
      const product = surface.productName || surface.clientDescription
      lines.push({
        id: surface.id,
        name: `${surface.clientLabel} — ${area.name}`,
        detail: [measure, coats, product].filter(Boolean).join(" • "),
        price: surface.price,
      })
    }
  }
  for (const line of quote.lineItems) {
    lines.push({
      id: line.id,
      name: line.label,
      detail: line.clientNote || line.detail,
      price: line.price,
    })
  }
  return lines
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}
