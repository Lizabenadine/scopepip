import fs from "node:fs"
import path from "node:path"
import type { Estimate, EstimateSettings, PaymentMethod } from "../types.ts"
import { renderProposalHtml } from "./renderHtml.ts"

const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.x64.tar"

function resolveLocalChromiumBinDir(): string | undefined {
  const candidates = [
    path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin"),
    "/var/task/node_modules/@sparticuz/chromium/bin",
  ]
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(path.join(candidate, "chromium.br"))) {
        return candidate
      }
    } catch {
      // Ignore permission or missing directory errors
    }
  }
  return undefined
}

async function inlineLogoDataUrl(logoUrl: string | undefined): Promise<string | undefined> {
  const trimmed = logoUrl?.trim() ?? ""
  if (!trimmed) return undefined
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(trimmed)) return trimmed
  if (!/^https?:\/\//i.test(trimmed)) return undefined
  try {
    const response = await fetch(trimmed, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return trimmed
    const contentType = (response.headers.get("content-type") || "image/png").split(";")[0].trim()
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(contentType)) return trimmed
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > 2 * 1024 * 1024) return trimmed
    return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`
  } catch {
    return trimmed
  }
}

async function launchBrowser() {
  const isServerlessLinux = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.platform === "linux",
  )
  if (isServerlessLinux) {
    const chromium = (await import("@sparticuz/chromium")).default
    const puppeteerCore = (await import("puppeteer-core")).default
    chromium.setGraphicsMode = false
    const localBinDir = resolveLocalChromiumBinDir()
    const executablePath = await chromium.executablePath(localBinDir ?? CHROMIUM_PACK_URL)
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: { width: 1024, height: 1320 },
      executablePath,
      headless: true,
    })
  }
  const puppeteer = (await import("puppeteer")).default
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
}

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
  const rawLogoUrl = input.estimateSettings?.logoUrl ?? input.estimate.settings.logoUrl
  const resolvedLogoUrl = await inlineLogoDataUrl(rawLogoUrl)
  const effectiveSettings: EstimateSettings = {
    ...input.estimate.settings,
    ...(input.estimateSettings ?? {}),
    ...(resolvedLogoUrl ? { logoUrl: resolvedLogoUrl } : {}),
  }

  const htmlContent =
    input.html ??
    renderProposalHtml({
      estimate: { ...input.estimate, settings: effectiveSettings },
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      language: input.language,
      companyName: input.companyName,
      companyEmail: input.companyEmail,
      paymentMethods: input.paymentMethods,
      estimateSettings: effectiveSettings,
    })

  // Guard against rendering an error or invalid-link page
  if (htmlContent.includes("This proposal link is not valid") || !htmlContent.includes("proposal-page-cover")) {
    throw new Error("Refusing to generate PDF: proposal HTML is missing required proposal content.")
  }

  const browser = await launchBrowser()
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
