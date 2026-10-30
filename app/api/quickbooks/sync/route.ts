import { syncQuickBooks, syncQuickBooksCredits } from "@/lib/quickbooks/sync"
import { quickBooksCredit, quickBooksInvoice, type QuickBooksCreditDraft, type QuickBooksInvoiceDraft } from "@/lib/quickbooks/invoice"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const rows = body && typeof body === "object" && Array.isArray((body as { invoices?: unknown }).invoices)
      ? (body as { invoices: unknown[] }).invoices
      : []
    const invoices = rows.map(draftOf).filter((invoice): invoice is QuickBooksInvoiceDraft => invoice !== null).slice(0, 30)
    const creditRows = body && typeof body === "object" && Array.isArray((body as { credits?: unknown }).credits)
      ? (body as { credits: unknown[] }).credits
      : []
    const credits = creditRows.map(creditOf).filter((credit): credit is QuickBooksCreditDraft => credit !== null).slice(0, 30)
    const result = await syncQuickBooks(invoices)
    const creditResult = await syncQuickBooksCredits(credits)
    const detail = [result.detail, creditResult.detail].filter(Boolean).join(" ")
    return Response.json({ ...result, detail, credits: creditResult.credits })
  } catch {
    return Response.json({
      connected: false,
      detail: "The books could not be reached.",
      invoices: [],
    })
  }
}

function draftOf(value: unknown): QuickBooksInvoiceDraft | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.estimateId !== "string" || typeof row.customerName !== "string" || typeof row.amount !== "number") return null
  return quickBooksInvoice({
    estimateId: row.estimateId,
    customerName: row.customerName,
    email: typeof row.email === "string" ? row.email : "",
    description: typeof row.description === "string" ? row.description : "",
    amount: row.amount,
    quickbooksInvoiceId: typeof row.quickbooksInvoiceId === "string" ? row.quickbooksInvoiceId : undefined,
  })
}

function creditOf(value: unknown): QuickBooksCreditDraft | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.estimateId !== "string" || typeof row.creditId !== "string" || typeof row.customerName !== "string" || typeof row.amount !== "number") {
    return null
  }
  return quickBooksCredit({
    estimateId: row.estimateId,
    creditId: row.creditId,
    customerName: row.customerName,
    email: typeof row.email === "string" ? row.email : "",
    description: typeof row.description === "string" ? row.description : "",
    amount: row.amount,
    quickbooksCreditId: typeof row.quickbooksCreditId === "string" ? row.quickbooksCreditId : undefined,
  })
}
