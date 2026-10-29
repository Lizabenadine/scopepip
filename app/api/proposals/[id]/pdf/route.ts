import { readCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { proposalMail } from "@/lib/proposals/mail"

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
  const mail = proposalMail({
    estimate,
    clientName: client?.name ?? "",
    clientEmail: client?.email?.includes("@") ? client.email : "preview@scopepipe.invalid",
    language: client?.language === "es" ? "es" : "en",
    companyName: book.state.estimateSettings.companyName,
    paymentMethods: book.state.paymentMethods,
    origin: new URL(request.url).origin,
  })
  if ("error" in mail) return Response.json({ ok: false, reason: mail.error }, { status: 400 })
  return new Response(Buffer.from(mail.pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="proposal.pdf"',
    },
  })
}
