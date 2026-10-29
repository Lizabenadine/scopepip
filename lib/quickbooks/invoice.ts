export interface QuickBooksInvoiceDraft {
  estimateId: string
  docNumber: string
  customerName: string
  email: string
  description: string
  amount: number
  quickbooksInvoiceId?: string
}

export function quickBooksInvoice(input: {
  estimateId: string
  customerName: string
  email: string
  description: string
  amount: number
  quickbooksInvoiceId?: string
}): QuickBooksInvoiceDraft | null {
  const amount = Math.round(input.amount * 100) / 100
  const customerName = input.customerName.trim()
  if (!input.estimateId || !customerName || !Number.isFinite(amount) || amount <= 0) return null
  return {
    estimateId: input.estimateId,
    docNumber: input.estimateId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 21),
    customerName: customerName.slice(0, 500),
    email: input.email.trim(),
    description: input.description.trim().slice(0, 4000) || "Painting",
    amount,
    quickbooksInvoiceId: input.quickbooksInvoiceId,
  }
}

export interface QuickBooksCreditDraft {
  estimateId: string
  creditId: string
  docNumber: string
  customerName: string
  email: string
  description: string
  amount: number
  quickbooksCreditId?: string
}

export function quickBooksCredit(input: {
  estimateId: string
  creditId: string
  customerName: string
  email: string
  description: string
  amount: number
  quickbooksCreditId?: string
}): QuickBooksCreditDraft | null {
  const amount = Math.round(input.amount * 100) / 100
  const customerName = input.customerName.trim()
  if (!input.estimateId || !input.creditId || !customerName || !Number.isFinite(amount) || amount <= 0) return null
  return {
    estimateId: input.estimateId,
    creditId: input.creditId,
    docNumber: input.creditId.replace(/[^a-zA-Z0-9-]/g, "").slice(-21),
    customerName: customerName.slice(0, 500),
    email: input.email.trim(),
    description: input.description.trim().slice(0, 4000) || "Credit",
    amount,
    quickbooksCreditId: input.quickbooksCreditId,
  }
}

export function quickBooksConfigured(): boolean {
  return Boolean(
    process.env.QUICKBOOKS_CLIENT_ID &&
      process.env.QUICKBOOKS_CLIENT_SECRET &&
      process.env.QUICKBOOKS_REFRESH_TOKEN &&
      process.env.QUICKBOOKS_REALM_ID,
  )
}
