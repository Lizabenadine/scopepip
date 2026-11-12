import { readCompanyBook } from "../../../../lib/auth/directory.ts"
import { sessionFromRequest } from "../../../../lib/auth/request.ts"
import { exportScopeCsv } from "../../../../lib/export/csv.ts"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const book = await readCompanyBook(session.companyId)
  if (!book) return Response.json({ ok: false, error: "Contractor account not found" }, { status: 404 })

  const url = new URL(request.url)
  const typeParam = url.searchParams.get("type") || "jobs"
  const type = (["leads", "customers", "estimates", "jobs"].includes(typeParam)
    ? typeParam
    : "jobs") as "leads" | "customers" | "estimates" | "jobs"

  const { filename, content } = exportScopeCsv(type, book.state)

  return new Response(content, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  })
}
