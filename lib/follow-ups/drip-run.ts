import { listCompanyBooks } from "../auth/company-books.ts"
import { readCompanyBook, writeCompanyBook } from "../auth/directory.ts"
import type { BookFile } from "../auth/directory.ts"
import { runQuoteDrip } from "./drip.ts"
import { sendWebhook } from "../webhooks/send.ts"

let running = false

/** Walk every company book, or one company, and send quote notes that are due. */
export async function runAllQuoteDrips(origin?: string, companyId?: string): Promise<number> {
  if (running) return 0
  running = true
  try {
    const rows = await listCompanyBooks()
    const now = Date.now()
    let delivered = 0
    for (const row of rows) {
      if (companyId && row.companyId !== companyId) continue
      delivered += await persistCompanyDrip(row.companyId, row.book, now, origin)
    }
    return delivered
  } finally {
    running = false
  }
}

async function persistCompanyDrip(companyId: string, book: BookFile, nowMs: number, origin?: string): Promise<number> {
  let current = book
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const dripped = await runQuoteDrip(current.state, nowMs, origin)
    if (dripped.state === current.state) return dripped.delivered
    const saved = await writeCompanyBook(companyId, current.revision, dripped.state)
    if (saved.ok) {
      if (dripped.delivered > 0) void sendWebhook("quote.followed_up", { delivered: dripped.delivered }, companyId)
      return dripped.delivered
    }
    if (!("state" in saved)) return 0
    const fresh = await readCompanyBook(companyId)
    if (!fresh) return 0
    current = fresh
  }
  return 0
}
