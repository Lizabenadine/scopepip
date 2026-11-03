"use client"

import Link from "next/link"
import { CompanyMark } from "@/components/brand/company-mark"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { displayCompanyName } from "@/lib/brand/company"
import type { EstimateQuote } from "@/lib/estimate/calculate"
import { compactNumber, moneyExact } from "@/lib/format"
import type { PaymentRow } from "@/lib/payments/ledger"
import type { Client, Estimate } from "@/lib/types"

export function InvoiceDocument({
  row,
  estimate,
  client,
  quote,
  companyName,
  companyEmail,
  companyPhone,
  logoUrl,
  canCollectDeposit,
  canOpenEstimate,
  canMarkPaid,
  onBack,
  onMarkPaid,
}: {
  row: PaymentRow
  estimate?: Estimate
  client?: Client
  quote: EstimateQuote | null
  companyName?: string
  companyEmail?: string
  companyPhone?: string
  logoUrl?: string
  canCollectDeposit: boolean
  canOpenEstimate: boolean
  canMarkPaid: boolean
  onBack: () => void
  onMarkPaid: () => void
}) {
  const lines = quote ? invoiceLines(quote) : []
  const minimumGap = quote ? roundCents(row.total - (quote.subtotal - quote.discount + quote.tax)) : 0
  const balanceReceived = roundCents(Math.max(0, row.paid - row.depositPaid))
  const paidOff = row.balance <= 0
  const issued = invoiceDate(estimate?.acceptedAt || estimate?.createdAt)
  const address = estimate?.jobAddress.trim() || client?.address.trim() || ""
  const email = client?.email.trim() || ""
  const phone = client?.phone.trim() || ""

  return (
    <article data-testid={`invoice-${row.id}`} className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button type="button" variant="outline" className="h-11" onClick={onBack}>
          All invoices
        </Button>
        <Button type="button" className="h-11" onClick={() => window.print()}>
          Print
        </Button>
        {canMarkPaid ? (
          <Button type="button" variant="outline" className="h-11" data-testid={`invoice-mark-paid-${row.id}`} onClick={onMarkPaid}>
            Mark balance paid
          </Button>
        ) : null}
        {canCollectDeposit ? (
          <Link href={`/estimates/${row.id}/pay`} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
            Collect deposit
          </Link>
        ) : null}
        {canOpenEstimate ? (
          <Link href={`/estimates/${row.id}`} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
            Open the estimate
          </Link>
        ) : null}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-8 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <CompanyMark
              name={displayCompanyName(companyName)}
              logoUrl={logoUrl}
              className="font-display text-3xl text-primary"
              imageClassName="h-14"
              testId="invoice-brand"
            />
            {companyEmail ? <p className="mt-2 text-sm text-slate-500">{companyEmail}</p> : null}
            {companyPhone ? <p className="text-sm text-slate-500">{companyPhone}</p> : null}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">Invoice</p>
            <p className="text-xl font-extrabold">{invoiceNumber(estimate, row.id)}</p>
            {issued ? <p className="mt-1 text-sm text-slate-500">{issued}</p> : null}
            <p
              className={
                paidOff
                  ? "mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
                  : "mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
              }
            >
              {paidOff ? "Paid" : row.depositPaid > 0 ? "Deposit paid" : "Due"}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">Bill to</p>
            <p className="mt-1 text-base font-semibold">{row.clientName}</p>
            {email ? <p className="text-sm text-slate-600">{email}</p> : null}
            {phone ? <p className="text-sm text-slate-600">{phone}</p> : null}
          </div>
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">Job</p>
            <p className="mt-1 text-base font-semibold">{row.title}</p>
            {address ? <p className="text-sm text-slate-600">{address}</p> : null}
          </div>
        </div>
        <h2 className="mt-8 text-sm font-bold tracking-wider text-slate-700 uppercase">Items</h2>
        <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {lines.length === 0 ? (
            <div className="flex items-center justify-between gap-4 p-4">
              <p className="text-sm font-semibold">{row.title}</p>
              <p className="text-sm font-bold tabular-nums">{moneyExact(row.total)}</p>
            </div>
          ) : (
            lines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-semibold">{line.name}</p>
                  {line.detail ? <p className="text-xs text-slate-500">{line.detail}</p> : null}
                </div>
                <p className="text-sm font-bold tabular-nums">{moneyExact(line.price)}</p>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
          <TotalLine label="Subtotal" amount={quote?.subtotal ?? row.total} />
          {quote && quote.discount > 0 ? <TotalLine label="Discount" amount={-quote.discount} /> : null}
          {quote && quote.tax > 0 ? <TotalLine label="Tax" amount={quote.tax} /> : null}
          {minimumGap > 0 ? <TotalLine label="Minimum job charge" amount={minimumGap} /> : null}
          <TotalLine label="Job total" amount={row.total} strong />
          {row.depositPaid > 0 ? <TotalLine label="Deposit received" amount={-row.depositPaid} /> : null}
          {balanceReceived > 0 ? <TotalLine label="Balance received" amount={-balanceReceived} /> : null}
          {row.credit > 0 ? <TotalLine label="Credit" amount={-row.credit} /> : null}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span>Balance due</span>
            <span className="tabular-nums">{moneyExact(row.balance)}</span>
          </div>
        </div>
      </div>
    </article>
  )
}

function TotalLine({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between text-sm font-semibold text-slate-900" : "flex justify-between text-sm text-slate-600"}>
      <span>{label}</span>
      <span className="tabular-nums">{moneyExact(amount)}</span>
    </div>
  )
}

function invoiceNumber(estimate: Estimate | undefined, id: string): string {
  const year = (estimate?.acceptedAt || estimate?.createdAt || "").slice(0, 4) || "2026"
  const body = id.replace(/^est-/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase()
  return `#INV-${year}-${body || "0000"}`
}

function invoiceDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return ""
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(time))
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
        name: `${surface.clientLabel} · ${area.name}`,
        detail: [measure, coats, product].filter(Boolean).join(" · "),
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
