import fs from "node:fs"
import path from "node:path"
import { supabaseAdmin } from "../supabase/admin.ts"
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

function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.byteLength < 8 || bytes.byteLength > 5 * 1024 * 1024) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png"
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif"
  if (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp"
  }
  return null
}

function bytesToDataUrl(bytes: Uint8Array): string | undefined {
  const mime = detectImageMime(bytes)
  if (!mime) return undefined
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`
}

async function downloadCompanyAsset(objectKey: string): Promise<string | undefined> {
  const admin = supabaseAdmin()
  if (!admin || !objectKey) return undefined
  try {
    const { data, error } = await admin.storage.from("company-assets").download(objectKey)
    if (error || !data) return undefined
    const bytes = new Uint8Array(await data.arrayBuffer())
    return bytesToDataUrl(bytes)
  } catch {
    return undefined
  }
}

async function inlineLogoDataUrl(logoUrl: string | undefined): Promise<string | undefined> {
  const trimmed = logoUrl?.trim() ?? ""
  if (!trimmed) return undefined
  const dataMatch = /^data:image\/(png|jpeg|webp|gif);base64,([a-z0-9+/=\s]+)$/i.exec(trimmed)
  if (dataMatch) {
    const bytes = new Uint8Array(Buffer.from(dataMatch[2].replace(/\s/g, ""), "base64"))
    return bytesToDataUrl(bytes)
  }
  if (!/^https?:\/\//i.test(trimmed)) return undefined
  try {
    const response = await fetch(trimmed, { signal: AbortSignal.timeout(5000) })
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer())
      const inlined = bytesToDataUrl(bytes)
      if (inlined) return inlined
    }
  } catch {
    // Fall through to Supabase Storage check if applicable
  }
  const assetMatch = /\/company-assets\/([^?#]+)/i.exec(trimmed)
  if (assetMatch?.[1]) {
    return downloadCompanyAsset(decodeURIComponent(assetMatch[1]))
  }
  return undefined
}

export interface ResolvedCompanyBrand {
  companyName: string
  logoUrl?: string
  companyEmail?: string
}

export async function resolveCompanyBrand(input: {
  estimateSettings?: EstimateSettings
  estimate?: Estimate
  companyId?: string
  authUserId?: string
  sessionCompanyName?: string
  sessionCompanyEmail?: string
}): Promise<ResolvedCompanyBrand> {
  let profileCompanyName: string | undefined
  let profileCompanyEmail: string | undefined
  let profileLogoUrl: string | undefined

  const admin = supabaseAdmin()
  if (admin && input.authUserId) {
    try {
      const { data } = await admin
        .from("profiles")
        .select("company_name, company_email, logo_url")
        .eq("user_id", input.authUserId)
        .maybeSingle()
      if (typeof data?.company_name === "string" && data.company_name.trim()) {
        profileCompanyName = data.company_name.trim()
      }
      if (typeof data?.company_email === "string" && data.company_email.trim()) {
        profileCompanyEmail = data.company_email.trim()
      }
      if (typeof data?.logo_url === "string" && data.logo_url.trim()) {
        profileLogoUrl = data.logo_url.trim()
      }
    } catch {
      // Ignore profile lookup errors
    }
  }

  const resolvedCompanyName =
    profileCompanyName ||
    input.estimateSettings?.companyName?.trim() ||
    input.sessionCompanyName?.trim() ||
    input.estimate?.settings?.companyName?.trim() ||
    "ScopePipe"

  const resolvedCompanyEmail =
    profileCompanyEmail ||
    input.estimateSettings?.companyEmail?.trim() ||
    input.sessionCompanyEmail?.trim() ||
    input.estimate?.settings?.companyEmail?.trim() ||
    ""

  const candidates = [
    input.estimateSettings?.logoUrl?.trim(),
    input.estimate?.settings?.logoUrl?.trim(),
    profileLogoUrl?.trim(),
  ].filter((c): c is string => Boolean(c))

  for (const candidate of candidates) {
    const inlined = await inlineLogoDataUrl(candidate)
    if (inlined) {
      return {
        companyName: resolvedCompanyName,
        logoUrl: inlined,
        companyEmail: resolvedCompanyEmail,
      }
    }
  }

  if (input.companyId) {
    const fromCompanyAsset = await downloadCompanyAsset(`${input.companyId}/logo`)
    if (fromCompanyAsset) {
      return {
        companyName: resolvedCompanyName,
        logoUrl: fromCompanyAsset,
        companyEmail: resolvedCompanyEmail,
      }
    }
  }

  if (input.authUserId) {
    const fromUserAsset = await downloadCompanyAsset(`${input.authUserId}/logo`)
    if (fromUserAsset) {
      return {
        companyName: resolvedCompanyName,
        logoUrl: fromUserAsset,
        companyEmail: resolvedCompanyEmail,
      }
    }
  }

  return {
    companyName: resolvedCompanyName,
    logoUrl: undefined,
    companyEmail: resolvedCompanyEmail,
  }
}

export async function resolveCompanyLogoDataUrl(input: {
  estimateSettings?: EstimateSettings
  estimate?: Estimate
  companyId?: string
  authUserId?: string
}): Promise<string | undefined> {
  const brand = await resolveCompanyBrand(input)
  return brand.logoUrl
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
  companyId?: string
  authUserId?: string
  html?: string
}): Promise<Uint8Array> {
  const brand = await resolveCompanyBrand({
    estimateSettings: input.estimateSettings,
    estimate: input.estimate,
    companyId: input.companyId,
    authUserId: input.authUserId,
    sessionCompanyName: input.companyName,
    sessionCompanyEmail: input.companyEmail,
  })
  const resolvedCompanyName = input.companyName?.trim() || brand.companyName
  const resolvedCompanyEmail = input.companyEmail?.trim() || brand.companyEmail || ""
  const effectiveSettings: EstimateSettings = {
    ...input.estimate.settings,
    ...(input.estimateSettings ?? {}),
    companyName: resolvedCompanyName,
    companyEmail: resolvedCompanyEmail,
    logoUrl: brand.logoUrl ?? "",
  }

  const htmlContent =
    input.html ??
    renderProposalHtml({
      estimate: { ...input.estimate, settings: effectiveSettings },
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      language: input.language,
      companyName: resolvedCompanyName,
      companyEmail: resolvedCompanyEmail,
      paymentMethods: input.paymentMethods,
      estimateSettings: effectiveSettings,
      origin: input.origin,
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
