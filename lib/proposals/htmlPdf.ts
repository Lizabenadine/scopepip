import puppeteer from "puppeteer"
import type { Estimate, EstimateSettings, PaymentMethod } from "../types.ts"
import { renderProposalHtml } from "./renderHtml.ts"

/**
 * Render a proposal to PDF using the approved Standard Interior Proposal HTML/CSS design.
 * Never navigates to an unverified `/p/[token]` error page; always renders the actual
 * proposal content and verifies the cover and scope sections exist before printing.
 */
export async function htmlPdf(input: {
  estimate: Estimate
  clientName: string
  clientEmail: string
  clientPhone?: string
  language: "en" | "es"
  companyName?: string
  companyEmail?: string
  estimateSettings?: EstimateSettings
  paymentMethods: PaymentMethod[]
  origin?: string
  html?: string
}): Promise<Uint8Array> {
  const htmlContent =
    input.html ??
    renderProposalHtml({
      estimate: input.estimate,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      language: input.language,
      companyName: input.companyName,
      companyEmail: input.companyEmail,
      paymentMethods: input.paymentMethods,
      estimateSettings: input.estimateSettings,
    })

  // Guard against rendering an error or invalid-link page
  if (htmlContent.includes("This proposal link is not valid") || !htmlContent.includes("proposal-page-cover")) {
    throw new Error("Refusing to generate PDF: proposal HTML is missing required proposal content.")
  }

  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1024, height: 1320 })

    await page.setContent(htmlContent, { waitUntil: "load", timeout: 15000 })

    // Wait for fonts to finish loading
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready
      }
    })

    // Verify the cover and scope elements exist and no invalid link text is present
    const verified = await page.evaluate(() => {
      const cover = document.querySelector('[data-testid="proposal-page-cover"]')
      const scope = document.querySelector('[data-testid="proposal-page-scope"]')
      const bodyText = document.body.innerText || ""
      return Boolean(cover && scope && !bodyText.includes("This proposal link is not valid"))
    })

    if (!verified) {
      throw new Error("Proposal verification failed before PDF generation.")
    }

    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    })

    return new Uint8Array(pdfBuffer)
  } finally {
    await browser.close()
  }
}
