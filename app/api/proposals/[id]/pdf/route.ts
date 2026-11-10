import { readCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { pdfLogoFromUrl } from "@/lib/brand/logo-pdf"
import { htmlPdf, resolveCompanyBrand } from "@/lib/proposals/htmlPdf"
import { proposalMail } from "@/lib/proposals/mail"

export const runtime = "nodejs"
export const maxDuration = 60

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
  const origin = request.headers.get("origin")?.replace(/\/$/, "") || new URL(request.url).origin
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

  try {
    const styledPdf = await htmlPdf({
      estimate,
      clientName: client?.name ?? "",
      clientEmail: client?.email ?? "",
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
    return new Response(Buffer.from(styledPdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="proposal.pdf"',
        "x-pdf-renderer": "styled",
      },
    })
  } catch (err) {
    const pdfError = err instanceof Error ? err.message : String(err)
    console.error("[proposal-pdf] Styled PDF generation failed; using fallback PDF", {
      estimateId: id,
      error: pdfError,
    })
    const mail = proposalMail({
      estimate,
      clientName: client?.name ?? "",
      clientEmail: client?.email?.includes("@") ? client.email : "preview@scopepipe.invalid",
      language,
      companyName: effectiveSettings.companyName,
      paymentMethods: book.state.paymentMethods,
      origin,
      logo: await pdfLogoFromUrl(brand.logoUrl),
      estimateSettings: effectiveSettings,
    })
    if ("error" in mail) return Response.json({ ok: false, reason: mail.error }, { status: 400 })
    return new Response(Buffer.from(mail.pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="proposal.pdf"',
        "x-pdf-renderer": "fallback",
      },
    })
  }
}
