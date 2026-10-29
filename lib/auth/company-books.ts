import path from "node:path"
import { listJsonNames } from "./account-store.ts"
import { readCompanyBook, type BookFile } from "./directory.ts"

function booksDir(): string {
  return process.env.BOOKS_DIR || path.join(process.cwd(), "data", "books")
}

export async function listCompanyBooks(): Promise<{ companyId: string; book: BookFile }[]> {
  const names = await listJsonNames(booksDir(), "books")
  const rows: { companyId: string; book: BookFile }[] = []
  for (const name of names) {
    if (!name.endsWith(".json")) continue
    const companyId = name.slice(0, -5)
    const book = await readCompanyBook(companyId)
    if (book) rows.push({ companyId, book })
  }
  return rows
}
