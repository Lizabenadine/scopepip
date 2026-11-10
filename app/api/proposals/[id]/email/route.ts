import { readCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { pdfLogoFromUrl } from "@/lib/brand/logo-pdf"
import { htmlPdf, resolveCompanyBrand } from "@/lib/proposals/htmlPdf"
import { sendProposalEmail } from "@/lib/proposals/send"
import { proposalMail } from "@/lib/proposals/mail"
import type { Estimate } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 60

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
    to?: unknown
    clientName?: unknown
    name?: unknown
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
  const postedRaw = typeof body?.email === "string" ? body.email : typeof body?.to === "string" ? body.to : ""
  const posted = postedRaw.trim()
  const postedNameRaw = typeof body?.clientName === "string" ? body.clientName : typeof body?.name === "string" ? body.name : ""
  const postedName = postedNameRaw.trim()
  const originHeader = request.headers.get("origin")
  const origin = originHeader?.replace(/\/$/, "") || new URL(request.url).origin
  const language = client?.language === "es" ? "es" : "en"
  const resolvedClientName = client?.name || postedName
  const resolvedClientEmail = posted.includes("@") ? posted : (client?.email ?? "")
  const brand = await resolveCompanyBrand({
    estimateSettings: book.state.estimateSettings,
    estimate,
    companyId: session.companyId,
    authUserId: session.authUserId,
    sessionCompanyName: session.companyName,
    sessionCompanyEmail: session.email,
  })
  const effectiveSettings = {
    ...book.state.estimateSettings,
    companyName: brand.companyName,
    companyEmail: brand.companyEmail || book.state.estimateSettings.companyEmail,
    logoUrl: brand.logoUrl ?? "",
  }
  const mail = proposalMail({
    estimate,
    clientName: resolvedClientName,
    clientEmail: resolvedClientEmail,
    language,
    companyName: effectiveSettings.companyName,
    paymentMethods: book.state.paymentMethods,
    origin,
    logo: await pdfLogoFromUrl(brand.logoUrl),
    estimateSettings: effectiveSettings,
  })
  if ("error" in mail) {
    console.error("[proposal-email] Invalid mail parameters", { estimateId: id, reason: mail.error })
    return Response.json({ ok: false, reason: mail.error }, { status: 400 })
  }

  let pdfAttachment = mail.pdf
  let pdfRenderer: "styled" | "fallback" = "styled"
  let pdfError: string | undefined
  try {
    pdfAttachment = await htmlPdf({
      estimate,
      clientName: resolvedClientName,
      clientEmail: mail.to,
      clientPhone: client?.phone ?? "",
      language,
      companyName: effectiveSettings.companyName,
      companyEmail: effectiveSettings.companyEmail || session.email,
      paymentMethods: book.state.paymentMethods,
      estimateSettings: effectiveSettings,
      origin,
      companyId: session.companyId,
      authUserId: session.authUserId,
    })
  } catch (err) {
    pdfRenderer = "fallback"
    pdfError = err instanceof Error ? err.message : String(err)
    console.error("[proposal-email] Styled PDF generation failed; using fallback PDF", {
      estimateId: id,
      error: pdfError,
    })
  }

  const result = await sendProposalEmail({
    to: mail.to,
    subject: mail.subject,
    body: mail.text,
    pdf: pdfAttachment,
    filename: mail.filename,
    companyName: effectiveSettings.companyName,
    replyTo: effectiveSettings.companyEmail || session.email,
  })
  if (result.delivery !== "sent") {
    console.error("[proposal-email] Delivery failed", {
      estimateId: id,
      to: mail.to,
      delivery: result.delivery,
      detail: result.detail,
    })
    return Response.json(
      { ok: false, to: mail.to, reason: result.detail, ...result, pdfRenderer, ...(pdfError ? { pdfError } : {}) },
      { status: result.delivery === "logged" ? 503 : 502 },
    )
  }
  console.log("[proposal-email] Proposal emailed successfully", {
    estimateId: id,
    to: mail.to,
    clientName: resolvedClientName,
    companyName: effectiveSettings.companyName,
    replyTo: effectiveSettings.companyEmail || session.email,
    pdfRenderer,
    pdfBytes: pdfAttachment.byteLength,
  })
  return Response.json({
    ok: true,
    to: mail.to,
    detail: `Emailed proposal to ${mail.to}.`,
    delivery: result.delivery,
    pdfRenderer,
    ...(pdfError ? { pdfError } : {}),
  })
}
