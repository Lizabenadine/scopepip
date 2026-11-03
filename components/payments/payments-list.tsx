"use client"

import { useState } from "react"
import { CompanyMark } from "@/components/brand/company-mark"
import { InvoiceDocument } from "@/components/payments/invoice-document"
import { QuickBooksSync } from "@/components/payments/quickbooks-sync"
import { displayCompanyName } from "@/lib/brand/company"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { moneyExact } from "@/lib/format"
import { listPaymentRows } from "@/lib/payments/ledger"

export function PaymentsList() {
  const scope = useScope()
  const { ready, estimates, clients, quoteEstimate, session, estimateSettings } = scope
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = listPaymentRows(estimates, clients, (estimate) => quoteEstimate(estimate).total)
  const openRow = rows.find((row) => row.id === openId)
  const openEstimate = openRow ? estimates.find((item) => item.id === openRow.id) : undefined

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  if (openRow) {
    const client = clients.find((item) => item.id === openEstimate?.clientId)
    const owner = session?.role === "owner"
    return (
      <InvoiceDocument
        row={openRow}
        estimate={openEstimate}
        client={client}
        quote={openEstimate ? quoteEstimate(openEstimate) : null}
        companyName={estimateSettings.companyName}
        companyEmail={estimateSettings.companyEmail}
        companyPhone={estimateSettings.businessPhone}
        logoUrl={estimateSettings.logoUrl}
        canCollectDeposit={owner && openRow.balance > 0 && openRow.depositPaid <= 0}
        canOpenEstimate={owner}
        canMarkPaid={openEstimate?.paymentStatus === "deposit_paid" && openRow.balance > 0}
        onBack={() => setOpenId(null)}
        onMarkPaid={() => scope.markJobPaid(openRow.id)}
      />
    )
  }

  return (
    <section className="flex flex-col gap-4" data-testid="payments-list">
      <QuickBooksSync />
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
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {language === "es" ? "Todavía no hay facturas." : "No invoices yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const paidOff = row.balance <= 0
            return (
              <li key={row.id}>
                <button
                  type="button"
                  data-testid={`payment-row-${row.id}`}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
                  onClick={() => setOpenId(row.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{row.clientName}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{row.title}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={
                        paidOff
                          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
                          : "inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                      }
                    >
                      {paidOff ? "Paid" : row.depositPaid > 0 ? "Deposit paid" : "Due"}
                    </span>
                    <span className="mt-1 block text-lg font-semibold tabular-nums">{moneyExact(row.balance)}</span>
                    <span className="block text-xs text-muted-foreground">Balance due</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
