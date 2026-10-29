import { readCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { pdfLogoFromUrl } from "@/lib/brand/logo-pdf"
import { sendProposalEmail } from "@/lib/proposals/send"
import { proposalMail } from "@/lib/proposals/mail"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, reason: "Sign in before emailing a proposal." }, { status: 401 })
  const { id } = await context.params
  if (!/^[a-z0-9-]{6,80}$/i.test(id)) {
    return Response.json({ ok: false, reason: "This proposal is not on file." }, { status: 404 })
  }
  const book = await readCompanyBook(session.companyId)
  const estimate = book?.state.estimates.find((item) => item.id === id)
  if (!book || !estimate) return Response.json({ ok: false, reason: "This proposal is not on file." }, { status: 404 })
  const client = book.state.clients.find((item) => item.id === estimate.clientId)
  const origin = new URL(request.url).origin
  const mail = proposalMail({
    estimate,
    clientName: client?.name ?? "",
    clientEmail: client?.email ?? "",
    language: client?.language === "es" ? "es" : "en",
    companyName: book.state.estimateSettings.companyName,
    paymentMethods: book.state.paymentMethods,
    origin,
    logo: await pdfLogoFromUrl(book.state.estimateSettings.logoUrl),
  })
  if ("error" in mail) return Response.json({ ok: false, reason: mail.error }, { status: 400 })
  const result = await sendProposalEmail({ to: mail.to, subject: mail.subject, body: mail.text, pdf: mail.pdf })
  return Response.json({ ok: result.delivery === "sent" || result.delivery === "logged", ...result })
}
