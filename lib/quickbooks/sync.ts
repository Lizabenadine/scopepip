import { quickBooksConfigured, type QuickBooksCreditDraft, type QuickBooksInvoiceDraft } from "./invoice.ts"

export interface QuickBooksSyncResult {
  connected: boolean
  detail: string
  invoices: { estimateId: string; quickbooksInvoiceId?: string; delivery: "synced" | "failed" | "skipped" }[]
}

export async function syncQuickBooks(invoices: QuickBooksInvoiceDraft[]): Promise<QuickBooksSyncResult> {
  if (!quickBooksConfigured()) {
    return {
      connected: false,
      detail: "The books are not connected. Add the bookkeeping keys on the host.",
      invoices: invoices.map((invoice) => ({ estimateId: invoice.estimateId, delivery: "skipped" })),
    }
  }
  try {
    const token = await accessToken()
    const realm = process.env.QUICKBOOKS_REALM_ID || ""
    const host = process.env.QUICKBOOKS_ENVIRONMENT === "sandbox" ? "https://sandbox-quickbooks.api.intuit.com" : "https://quickbooks.api.intuit.com"
    const results: QuickBooksSyncResult["invoices"] = []
    for (const invoice of invoices.slice(0, 30)) {
      try {
        const existing = invoice.quickbooksInvoiceId || (await findInvoice(host, realm, token, invoice.docNumber))
        if (existing) {
          results.push({ estimateId: invoice.estimateId, quickbooksInvoiceId: existing, delivery: "synced" })
          continue
        }
        const customerId = await findOrCreateCustomer(host, realm, token, invoice)
        if (!customerId) {
          results.push({ estimateId: invoice.estimateId, delivery: "failed" })
          continue
        }
        const created = await createInvoice(host, realm, token, invoice, customerId)
        results.push(created
          ? { estimateId: invoice.estimateId, quickbooksInvoiceId: created, delivery: "synced" }
          : { estimateId: invoice.estimateId, delivery: "failed" })
      } catch {
        results.push({ estimateId: invoice.estimateId, delivery: "failed" })
      }
    }
    const synced = results.filter((row) => row.delivery === "synced").length
    return { connected: true, detail: synced > 0 ? `Synced ${synced} invoices.` : "The books did not accept the invoices.", invoices: results }
  } catch {
    return {
      connected: true,
      detail: "The books could not be reached.",
      invoices: invoices.map((invoice) => ({ estimateId: invoice.estimateId, delivery: "failed" })),
    }
  }
}

async function accessToken(): Promise<string> {
  const key = Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString("base64")
  const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: { authorization: `Basic ${key}`, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.QUICKBOOKS_REFRESH_TOKEN || "",
    }),
  })
  if (!response.ok) throw new Error("token")
  const payload = (await response.json()) as { access_token?: string }
  if (!payload.access_token) throw new Error("token")
  return payload.access_token
}

async function qbo(host: string, realm: string, token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${host}/v3/company/${encodeURIComponent(realm)}/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, accept: "application/json", "content-type": "application/json", ...(init?.headers ?? {}) },
  })
}

async function findInvoice(host: string, realm: string, token: string, docNumber: string): Promise<string | null> {
  const query = `select Id from Invoice where DocNumber = '${docNumber.replace(/'/g, "\\'")}'`
  const response = await qbo(host, realm, token, `query?query=${encodeURIComponent(query)}&minorversion=73`, { method: "GET" })
  if (!response.ok) return null
  const payload = (await response.json()) as { QueryResponse?: { Invoice?: { Id?: string }[] } }
  return payload.QueryResponse?.Invoice?.[0]?.Id ?? null
}

async function findOrCreateCustomer(
  host: string,
  realm: string,
  token: string,
  person: { customerName: string; email: string },
): Promise<string | null> {
  const query = `select Id from Customer where DisplayName = '${person.customerName.replace(/'/g, "\\'")}'`
  const found = await qbo(host, realm, token, `query?query=${encodeURIComponent(query)}&minorversion=73`, { method: "GET" })
  if (found.ok) {
    const payload = (await found.json()) as { QueryResponse?: { Customer?: { Id?: string }[] } }
    const id = payload.QueryResponse?.Customer?.[0]?.Id
    if (id) return id
  }
  const created = await qbo(host, realm, token, "customer?minorversion=73", {
    method: "POST",
    body: JSON.stringify({
      DisplayName: person.customerName,
      PrimaryEmailAddr: person.email.includes("@") ? { Address: person.email } : undefined,
    }),
  })
  if (!created.ok) return null
  const payload = (await created.json()) as { Customer?: { Id?: string } }
  return payload.Customer?.Id ?? null
}

async function createInvoice(host: string, realm: string, token: string, invoice: QuickBooksInvoiceDraft, customerId: string): Promise<string | null> {
  const response = await qbo(host, realm, token, "invoice?minorversion=73", {
    method: "POST",
    body: JSON.stringify({
      DocNumber: invoice.docNumber,
      CustomerRef: { value: customerId },
      BillEmail: invoice.email.includes("@") ? { Address: invoice.email } : undefined,
      Line: [
        {
          DetailType: "SalesItemLineDetail",
          Amount: invoice.amount,
          Description: invoice.description,
          SalesItemLineDetail: { Qty: 1, UnitPrice: invoice.amount },
        },
      ],
    }),
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { Invoice?: { Id?: string } }
  return payload.Invoice?.Id ?? null
}

export interface QuickBooksCreditSync {
  credits: { estimateId: string; creditId: string; quickbooksCreditId?: string; delivery: "synced" | "failed" | "skipped" }[]
  detail: string
}

export async function syncQuickBooksCredits(credits: QuickBooksCreditDraft[]): Promise<QuickBooksCreditSync> {
  if (credits.length === 0 || !quickBooksConfigured()) {
    return {
      credits: credits.map((credit) => ({ estimateId: credit.estimateId, creditId: credit.creditId, delivery: "skipped" })),
      detail: "",
    }
  }
  try {
    const token = await accessToken()
    const realm = process.env.QUICKBOOKS_REALM_ID || ""
    const host = process.env.QUICKBOOKS_ENVIRONMENT === "sandbox" ? "https://sandbox-quickbooks.api.intuit.com" : "https://quickbooks.api.intuit.com"
    const results: QuickBooksCreditSync["credits"] = []
    for (const credit of credits.slice(0, 30)) {
      try {
        const existing = credit.quickbooksCreditId || (await findCredit(host, realm, token, credit.docNumber))
        if (existing) {
          results.push({ estimateId: credit.estimateId, creditId: credit.creditId, quickbooksCreditId: existing, delivery: "synced" })
          continue
        }
        const customerId = await findOrCreateCustomer(host, realm, token, credit)
        if (!customerId) {
          results.push({ estimateId: credit.estimateId, creditId: credit.creditId, delivery: "failed" })
          continue
        }
        const created = await createCreditMemo(host, realm, token, credit, customerId)
        results.push(
          created
            ? { estimateId: credit.estimateId, creditId: credit.creditId, quickbooksCreditId: created, delivery: "synced" }
            : { estimateId: credit.estimateId, creditId: credit.creditId, delivery: "failed" },
        )
      } catch {
        results.push({ estimateId: credit.estimateId, creditId: credit.creditId, delivery: "failed" })
      }
    }
    const synced = results.filter((row) => row.delivery === "synced").length
    return { credits: results, detail: synced > 0 ? `Synced ${synced} credits.` : "The books did not accept the credits." }
  } catch {
    return {
      credits: credits.map((credit) => ({ estimateId: credit.estimateId, creditId: credit.creditId, delivery: "failed" })),
      detail: "The books could not be reached.",
    }
  }
}

async function findCredit(host: string, realm: string, token: string, docNumber: string): Promise<string | null> {
  const query = `select Id from CreditMemo where DocNumber = '${docNumber.replace(/'/g, "\\'")}'`
  const response = await qbo(host, realm, token, `query?query=${encodeURIComponent(query)}&minorversion=73`, { method: "GET" })
  if (!response.ok) return null
  const payload = (await response.json()) as { QueryResponse?: { CreditMemo?: { Id?: string }[] } }
  return payload.QueryResponse?.CreditMemo?.[0]?.Id ?? null
}

async function createCreditMemo(
  host: string,
  realm: string,
  token: string,
  credit: QuickBooksCreditDraft,
  customerId: string,
): Promise<string | null> {
  const response = await qbo(host, realm, token, "creditmemo?minorversion=73", {
    method: "POST",
    body: JSON.stringify({
      DocNumber: credit.docNumber,
      CustomerRef: { value: customerId },
      BillEmail: credit.email.includes("@") ? { Address: credit.email } : undefined,
      Line: [
        {
          DetailType: "SalesItemLineDetail",
          Amount: credit.amount,
          Description: credit.description,
          SalesItemLineDetail: { Qty: 1, UnitPrice: credit.amount },
        },
      ],
    }),
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { CreditMemo?: { Id?: string } }
  return payload.CreditMemo?.Id ?? null
}
