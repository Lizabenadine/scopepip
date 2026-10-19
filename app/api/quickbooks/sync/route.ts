import { syncQuickBooks } from "@/lib/quickbooks/sync"
import { quickBooksInvoice, type QuickBooksInvoiceDraft } from "@/lib/quickbooks/invoice"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const rows = body && typeof body === "object" && Array.isArray((body as { invoices?: unknown }).invoices)
      ? (body as { invoices: unknown[] }).invoices
      : []
    const invoices = rows.map(draftOf).filter((invoice): invoice is QuickBooksInvoiceDraft => invoice !== null).slice(0, 30)
    const result = await syncQuickBooks(invoices)
    return Response.json(result)
  } catch {
    return Response.json({
      connected: false,
      detail: "QuickBooks could not be reached.",
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
