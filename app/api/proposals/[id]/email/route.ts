import { readCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { pdfLogoFromUrl } from "@/lib/brand/logo-pdf"
import { sendProposalEmail } from "@/lib/proposals/send"
import { proposalMail } from "@/lib/proposals/mail"
import type { Estimate } from "@/lib/types"

export const runtime = "nodejs"

function isEstimateMatch(value: unknown, expectedId: string): value is Estimate {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<Estimate>
  return (
    candidate.id === expectedId &&
    Array.isArray(candidate.areas) &&
    Array.isArray(candidate.lineItems) &&
    typeof candidate.settings === "object" &&
    candidate.settings !== null
  )
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, reason: "Sign in before emailing a proposal." }, { status: 401 })
  const { id } = await context.params
  if (!/^[a-z0-9-]{6,80}$/i.test(id)) {
    return Response.json({ ok: false, reason: "This proposal is not on file." }, { status: 404 })
  }
  const body = (await request.json().catch(() => null)) as {
    email?: unknown
    clientName?: unknown
    estimate?: unknown
  } | null
  const book = await readCompanyBook(session.companyId)
  const storedEstimate = book?.state.estimates.find((item) => item.id === id)
  const fallbackEstimate = isEstimateMatch(body?.estimate, id) ? body.estimate : undefined
  const estimate = storedEstimate ?? fallbackEstimate
  if (!book || !estimate) {
    console.error("[proposal-email] Proposal not found", {
      companyId: session.companyId,
      estimateId: id,
      hasBook: Boolean(book),
    })
    return Response.json({ ok: false, reason: "This proposal is not on file." }, { status: 404 })
  }
  const client = book.state.clients.find((item) => item.id === estimate.clientId)
  const posted = typeof body?.email === "string" ? body.email.trim() : ""
  const postedName = typeof body?.clientName === "string" ? body.clientName.trim() : ""
  const originHeader = request.headers.get("origin")
  const origin = originHeader?.replace(/\/$/, "") || new URL(request.url).origin
  const mail = proposalMail({
    estimate,
    clientName: client?.name || postedName,
    clientEmail: posted.includes("@") ? posted : (client?.email ?? ""),
    language: client?.language === "es" ? "es" : "en",
    companyName: book.state.estimateSettings.companyName,
    paymentMethods: book.state.paymentMethods,
    origin,
    logo: await pdfLogoFromUrl(book.state.estimateSettings.logoUrl),
  })
  if ("error" in mail) {
    console.error("[proposal-email] Invalid mail parameters", { estimateId: id, reason: mail.error })
    return Response.json({ ok: false, reason: mail.error }, { status: 400 })
  }
  const result = await sendProposalEmail({
    to: mail.to,
    subject: mail.subject,
    body: mail.text,
    pdf: mail.pdf,
    filename: mail.filename,
    companyName: book.state.estimateSettings.companyName,
    replyTo: book.state.estimateSettings.companyEmail,
  })
  if (result.delivery !== "sent") {
    console.error("[proposal-email] Delivery failed", {
      estimateId: id,
      delivery: result.delivery,
      detail: result.detail,
    })
    return Response.json(
      { ok: false, reason: result.detail, ...result },
      { status: result.delivery === "logged" ? 503 : 502 },
    )
  }
  return Response.json({ ok: true, ...result })
}
