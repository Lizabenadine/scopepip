import { readCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { htmlPdf } from "@/lib/proposals/htmlPdf"

export const runtime = "nodejs"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, reason: "Sign in before opening this PDF." }, { status: 401 })
  const { id } = await context.params
  if (!/^[a-z0-9-]{6,80}$/i.test(id)) {
    return Response.json({ ok: false, reason: "This proposal is not on file." }, { status: 404 })
  }
  const book = await readCompanyBook(session.companyId)
  const estimate = book?.state.estimates.find((item) => item.id === id)
  if (!book || !estimate) return Response.json({ ok: false, reason: "This proposal is not on file." }, { status: 404 })
  const client = book.state.clients.find((item) => item.id === estimate.clientId)
  const language = client?.language === "es" ? "es" : "en"

  const styledPdf = await htmlPdf({
    estimate,
    clientName: client?.name ?? "",
    clientEmail: client?.email ?? "",
    clientPhone: client?.phone ?? "",
    language,
    companyName: book.state.estimateSettings.companyName,
    companyEmail: book.state.estimateSettings.companyEmail || session.email,
    paymentMethods: book.state.paymentMethods,
    estimateSettings: book.state.estimateSettings,
  })
  return new Response(Buffer.from(styledPdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="proposal.pdf"',
    },
  })
}
