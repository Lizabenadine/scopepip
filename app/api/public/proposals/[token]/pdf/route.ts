import { publicProposalPdfData } from "@/lib/auth/directory"
import { pdfLogoFromUrl } from "@/lib/brand/logo-pdf"
import { htmlPdf } from "@/lib/proposals/htmlPdf"
import { proposalMail } from "@/lib/proposals/mail"
import { isProposalToken } from "@/lib/proposals/token"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!isProposalToken(token)) {
    return Response.json({ ok: false, reason: "This proposal link is not valid." }, { status: 404 })
  }
  const data = await publicProposalPdfData(token)
  if (!data) {
    return Response.json({ ok: false, reason: "This proposal link is not valid." }, { status: 404 })
  }

  const origin = request.headers.get("origin")?.replace(/\/$/, "") || new URL(request.url).origin
  try {
    const styledPdf = await htmlPdf({
      estimate: data.estimate,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      language: data.language,
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      paymentMethods: data.paymentMethods,
      estimateSettings: data.estimateSettings,
      origin,
      companyId: data.companyId,
    })
    return new Response(Buffer.from(styledPdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="proposal.pdf"',
        "cache-control": "no-store",
        "x-pdf-renderer": "styled",
      },
    })
  } catch (err) {
    const pdfError = err instanceof Error ? err.message : String(err)
    console.error("[public-proposal-pdf] Styled PDF generation failed; using fallback PDF", {
      estimateId: data.estimate.id,
      error: pdfError,
    })
    const mail = proposalMail({
      estimate: data.estimate,
      clientName: data.clientName,
      clientEmail: data.clientEmail.includes("@") ? data.clientEmail : "preview@scopepipe.invalid",
      language: data.language,
      companyName: data.companyName,
      paymentMethods: data.paymentMethods,
      origin,
      logo: await pdfLogoFromUrl(data.logoUrl),
      estimateSettings: data.estimateSettings,
    })
    if ("error" in mail) return Response.json({ ok: false, reason: mail.error }, { status: 400 })
    return new Response(Buffer.from(mail.pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="proposal.pdf"',
        "cache-control": "no-store",
        "x-pdf-renderer": "fallback",
      },
    })
  }
}
