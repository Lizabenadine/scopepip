import { displayCompanyName, DEFAULT_COMPANY_NAME } from "../brand/company.ts"
import { displayLogoUrl } from "../brand/logo.ts"
import { jobDate, money, moneyExact } from "../format.ts"
import { paintingText, translatePainting } from "../field/terms.ts"
import { balanceAfterDeposit } from "../payments/deposit.ts"
import { financingTerms, monthlyPayment } from "../financing/offer.ts"
import type { Estimate, EstimateSettings, PaymentMethod } from "../types.ts"
import { paintMaterialsInclusionLabel, proposalDocument, scheduledProductsFromAreas } from "./document.ts"
import { proposalFigures } from "./figures.ts"
import { customerLineIds } from "./mail.ts"

export interface RenderProposalHtmlInput {
  estimate: Estimate
  clientName: string
  clientEmail?: string
  clientPhone?: string
  language?: "en" | "es"
  companyName?: string
  companyEmail?: string
  paymentMethods: PaymentMethod[]
  estimateSettings?: EstimateSettings
  origin?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function parseBrandPalette(rawColor: string | undefined): {
  brand: string
  brandSoft: string
  emerald: string
  barBg: string
  barAccent: string
} {
  const trimmed = rawColor?.trim() ?? ""
  const hex = /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : "#1f4d3d"
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const brandSoft = `rgba(${r}, ${g}, ${b}, 0.11)`
  const isScopePipeBlue = hex === "#0284c7" || hex === "#0099db" || hex === "#00bfff" || hex === "#00a8e8"
  const barAccent = isScopePipeBlue
    ? "#00c2ff"
    : hex === "#1f4d3d"
      ? "#34d399"
      : `rgb(${Math.min(255, Math.round(r + (255 - r) * 0.48))}, ${Math.min(255, Math.round(g + (255 - g) * 0.48))}, ${Math.min(255, Math.round(b + (255 - b) * 0.48))})`
  const barBg = isScopePipeBlue ? "#0f1724" : "#17191c"
  return {
    brand: hex,
    brandSoft,
    emerald: hex,
    barBg,
    barAccent,
  }
}

function swatchHex(colorName: string | undefined): string {
  const lower = (colorName ?? "").toLowerCase()
  if (lower.includes("alabaster") || lower.includes("white") || lower.includes("ivory")) return "#f2efe9"
  if (lower.includes("gray") || lower.includes("grey") || lower.includes("repose")) return "#ccc9c0"
  if (lower.includes("naval") || lower.includes("navy") || lower.includes("blue")) return "#1e3a5f"
  if (lower.includes("green") || lower.includes("sage") || lower.includes("emerald")) return "#4a6b5b"
  if (lower.includes("beige") || lower.includes("tan") || lower.includes("sand")) return "#dcd2c0"
  return "#e5e0d5"
}

/**
 * Renders the approved November 6 Standard Interior Proposal design as a standalone
 * print-ready HTML document with embedded styles, typography, cream background,
 * rounded cards, and dynamic contractor/estimate data.
 */
export function renderProposalHtml(input?: RenderProposalHtmlInput): string {
  if (!input) {
    throw new Error("renderProposalHtml requires estimate and contractor input.")
  }

  const language = input.language ?? "en"
  const say = (text: string) => translatePainting(text, language)
  const resolvedLogoCandidate =
    input.estimateSettings?.logoUrl?.trim() ||
    input.estimate.settings.logoUrl?.trim() ||
    ""
  const safeLogoCandidate = resolvedLogoCandidate
  const effectiveSettings: EstimateSettings = {
    ...input.estimate.settings,
    ...(input.estimateSettings ?? {}),
    logoUrl: safeLogoCandidate,
    proposalPages: {
      ...input.estimate.settings.proposalPages,
      ...(input.estimateSettings?.proposalPages ?? {}),
      templates: {
        ...input.estimate.settings.proposalPages?.templates,
        ...(input.estimateSettings?.proposalPages?.templates ?? {}),
      },
    },
  }

  const company = displayCompanyName(input.companyName ?? effectiveSettings.companyName)
  const logoUrl = displayLogoUrl(effectiveSettings.logoUrl)
  const companyLicense = effectiveSettings.companyLicense?.trim() ?? ""
  const companyPhone = effectiveSettings.businessPhone?.trim() ?? ""
  const companyEmail = (input.companyEmail ?? effectiveSettings.companyEmail)?.trim() ?? ""
  const credParts = [companyLicense, companyPhone, companyEmail].filter(Boolean)
  const credLine = credParts.join(" · ")

  const selectedIds = customerLineIds(input.estimate)
  const figures = proposalFigures(input.estimate, input.paymentMethods, selectedIds)
  const quote = figures.quote
  const document = proposalDocument(effectiveSettings, input.estimate.estimateKind)
  const scheduledProducts = scheduledProductsFromAreas(quote.areas)
  const materialsStatus = paintMaterialsInclusionLabel(effectiveSettings.excludeMaterials, input.language ?? "en")
  const deposit = figures.deposit
  const depositPercent = figures.depositPercent
  const balance = balanceAfterDeposit(quote.total, depositPercent)
  const balancePercent = Math.max(0, 100 - depositPercent)

  const preparedOn = jobDate(input.estimate.createdAt.slice(0, 10))
  const expiresDays = effectiveSettings.expiryDays > 0 ? effectiveSettings.expiryDays : 30
  const expiresDate =
    effectiveSettings.expiryDays > 0
      ? jobDate(new Date(new Date(input.estimate.createdAt).getTime() + effectiveSettings.expiryDays * 86400000).toISOString().slice(0, 10))
      : null

  const visibleAreas = quote.areas.filter((area) => area.surfaces.some((s) => !s.hideFromCustomer))
  const optionalLines = input.estimate.lineItems.filter((item) => item.optional && item.pending !== true)
  const includedLines = quote.lineItems.filter((line) => !optionalLines.some((opt) => opt.id === line.id))

  // Calculate prices for optional lines from catalog or customPrice
  const optionalLineRows = optionalLines.map((line) => {
    const priced = quote.lineItems.find((item) => item.id === line.id)
    const amount = priced ? priced.price : line.customPrice
    const checked = selectedIds.includes(line.id)
    return { line, amount, checked }
  })

  const totalAdditionalCount = includedLines.length + optionalLines.length
  const roomSummaryParts: string[] = []
  if (visibleAreas.length > 0) {
    roomSummaryParts.push(`${visibleAreas.length} ${visibleAreas.length === 1 ? "Room" : "Rooms"}`)
  }
  if (totalAdditionalCount > 0) {
    roomSummaryParts.push(`${totalAdditionalCount} Additional ${totalAdditionalCount === 1 ? "Item" : "Items"}`)
  }
  roomSummaryParts.push("2-Coat System")

  const salesperson = input.estimate.salesperson?.trim() || company
  const validityLabel = `Valid for ${expiresDays} days`
  const estimatorSub = [companyPhone, validityLabel].filter(Boolean).join(" · ")

  const financing = financingTerms(effectiveSettings)
  const monthly = financing.enabled ? monthlyPayment(quote.total, financing.aprPercent, financing.months) : 0

  const accepted = Boolean(
    input.estimate.clientStatus === "accepted" &&
      input.estimate.signature &&
      input.estimate.signature.signedName.trim().length > 0 &&
      input.estimate.signature.signaturePayload.trim().length > 0,
  )
  const signerDisplay = accepted ? input.estimate.signature!.signedName : ""
  const baseOrigin = (input.origin?.trim() || "https://www.scopepipe.com").replace(/\/$/, "")
  const publicToken = input.estimate.publicToken?.trim() || input.estimate.id
  const proposalUrl = `${baseOrigin}/p/${publicToken}${language === "es" ? "?lang=es" : ""}`
  const signatureBoxHtml =
    accepted && input.estimate.signature
      ? input.estimate.signature.signaturePayload.startsWith("data:image/")
        ? `<div style="min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid var(--line); margin: 10px 0; padding: 6px 0;" data-testid="signature-accepted">
            <img src="${escapeHtml(input.estimate.signature.signaturePayload)}" alt="Signature of ${escapeHtml(input.estimate.signature.signedName)}" style="max-height: 52px; width: auto; object-fit: contain;" />
            <span style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">Signed by ${escapeHtml(input.estimate.signature.signedName)}${input.estimate.signature.signedAt ? ` · ${escapeHtml(jobDate(input.estimate.signature.signedAt.slice(0, 10)))}` : ""}</span>
          </div>`
        : `<div style="min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid var(--line); margin: 10px 0; padding: 6px 0;" data-testid="signature-accepted">
            <div class="signature-cursive" style="margin: 0; border-bottom: none;">${escapeHtml(input.estimate.signature.signedName)}</div>
            <span style="font-size: 11px; color: var(--ink-soft); margin-top: 2px;">Signed by ${escapeHtml(input.estimate.signature.signedName)}${input.estimate.signature.signedAt ? ` · ${escapeHtml(jobDate(input.estimate.signature.signedAt.slice(0, 10)))}` : ""}</span>
          </div>`
      : `<div style="min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border-bottom: 1px solid var(--line); margin: 10px 0; padding: 8px 0;" data-testid="signature-online-prompt">
          <p style="font-size: 15px; font-weight: 700; color: var(--brand);">Review and sign online</p>
          <a href="${escapeHtml(proposalUrl)}" style="font-family: var(--mono); font-size: 12px; color: var(--brand); text-decoration: underline; word-break: break-all;" data-testid="proposal-sign-link">${escapeHtml(proposalUrl)}</a>
        </div>`

  const preferredMethod =
    input.paymentMethods.find((m) => m.id === effectiveSettings.paymentMethodId)?.label ??
    input.paymentMethods[0]?.label ??
    "Check"

  const roomsHtml = visibleAreas
    .map((area) => {
      const rawArea = input.estimate.areas.find((a) => a.id === area.id)
      const surfaces = area.surfaces.filter((s) => !s.hideFromCustomer)
      const isRoom = area.areaType === "room" && area.lengthFt > 0 && area.widthFt > 0
      const floorSqFt = isRoom ? Math.round(area.lengthFt * area.widthFt) : 0
      const wallSqFt = isRoom ? Math.round(2 * (area.lengthFt + area.widthFt) * area.heightFt) : 0
      const dimsText = isRoom
        ? `Measurements: <strong>${area.lengthFt} ft L × ${area.widthFt} ft W × ${area.heightFt} ft H</strong> (${floorSqFt} sq ft floor · ${wallSqFt} sq ft wall area)`
        : area.lengthFt > 0 && area.heightFt > 0
          ? `Measurements: <strong>${area.lengthFt} ft × ${area.heightFt} ft</strong>`
          : ""

      const colorParts = [rawArea?.colorName?.trim(), rawArea?.colorCode?.trim(), rawArea?.sheen?.trim()].filter(Boolean)
      const colorPillHtml =
        colorParts.length > 0
          ? `<div class="room-color-pill">
              <span class="swatch" style="background: ${swatchHex(rawArea?.colorName)};"></span>
              <span>Wall Color &amp; Sheen: <strong>${escapeHtml(colorParts.join(" · "))}</strong></span>
            </div>`
          : ""

      const surfacesHtml = surfaces
        .map((surface) => {
          const isPrep = surface.productName.trim().toLowerCase() === "prep" || surface.id.endsWith("-prep")
          const coatsLabel =
            surface.showCoats && surface.coatCount > 0 ? `${surface.coatCount} ${surface.coatCount === 1 ? "coat" : "coats"}` : ""
          const prodLabel = !isPrep && surface.productName.trim() ? surface.productName.trim() : ""
          const specText = isPrep
            ? "Included Standard Prep"
            : [coatsLabel, prodLabel].filter(Boolean).join(" · ") || "Scheduled Finish"

          let baseLabel = say(surface.clientLabel)
          if (surface.quantityUnit === "items" && surface.quantity > 0 && !/\(\d+/.test(baseLabel)) {
            const lower = baseLabel.toLowerCase()
            if (lower.includes("door")) {
              baseLabel = `${baseLabel} (${surface.quantity} ${surface.quantity === 1 ? "door" : "doors"})`
            } else if (lower.includes("window")) {
              baseLabel = `${baseLabel} (${surface.quantity} ${surface.quantity === 1 ? "window" : "windows"})`
            } else {
              baseLabel = `${baseLabel} (${surface.quantity})`
            }
          }

          const descText = surface.clientDescription?.trim() || ""
          return `<div class="surface-item">
            <div class="surface-top">
              <span class="surface-name">${escapeHtml(baseLabel)}</span>
              <span class="surface-spec">${escapeHtml(specText)}</span>
            </div>
            ${descText ? `<p class="surface-desc">${escapeHtml(say(descText))}</p>` : ""}
          </div>`
        })
        .join("\n")

      return `<div class="room-card">
        <div class="room-header">
          <div>
            <p class="room-name">${escapeHtml(say(area.name))}</p>
            ${dimsText ? `<p class="room-dims">${dimsText}</p>` : ""}
            ${colorPillHtml}
          </div>
          <div style="text-align: right;">
            <p class="eyebrow">Room Price</p>
            <p class="room-price">${escapeHtml(moneyExact(area.clientPrice))}</p>
          </div>
        </div>
        <div class="surface-list">
          ${surfacesHtml}
        </div>
      </div>`
    })
    .join("\n")

  const includedLinesHtml = includedLines
    .map((line) => {
      const label = paintingText(line.label, line.labelEs, language)
      const note = line.clientNote ? paintingText(line.clientNote, line.clientNoteEs, language) : ""
      return `<div class="surface-item" style="background: rgba(246, 242, 234, 0.7); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 14px;">
        <div style="flex: 1; min-width: 0;">
          <span class="eyebrow">Included Carpentry &amp; Millwork Line</span>
          <p style="font-size: 15px; font-weight: 700; margin-top: 2px;">${escapeHtml(label)}</p>
          ${note ? `<p class="surface-desc">${escapeHtml(note)}</p>` : ""}
        </div>
        <p class="room-price" style="font-size: 24px; flex-shrink: 0;">${escapeHtml(moneyExact(line.price))}</p>
      </div>`
    })
    .join("\n")

  const optionalLinesHtml = optionalLineRows
    .map(({ line, amount, checked }) => {
      const label = paintingText(line.label, line.labelEs, language)
      const note = line.clientNote ? paintingText(line.clientNote, line.clientNoteEs, language) : ""
      return `<div class="surface-item" style="background: #fff; border: 2px solid var(--brand); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 14px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
          <span style="display: inline-flex; width: 18px; height: 18px; margin-top: 4px; border-radius: 4px; background: ${checked ? "var(--brand)" : "#fff"}; border: 2px solid var(--brand); color: #fff; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">${checked ? "✓" : ""}</span>
          <div style="flex: 1; min-width: 0;">
            <span class="eyebrow" style="color: var(--brand);">${checked ? "Selected Homeowner Add-On" : "Optional Homeowner Add-On"}</span>
            <p style="font-size: 15px; font-weight: 700; margin-top: 2px;">${escapeHtml(label)}</p>
            ${note ? `<p class="surface-desc">${escapeHtml(note)}</p>` : ""}
          </div>
        </div>
        <p class="room-price" style="font-size: 24px; flex-shrink: 0;">+${escapeHtml(moneyExact(amount))}</p>
      </div>`
    })
    .join("\n")

  const additionalBlockHtml =
    includedLinesHtml || optionalLinesHtml
      ? `<div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
          ${includedLinesHtml}
          ${optionalLinesHtml}
        </div>`
      : ""

  const prepBulletsHtml = document.template.preparation
    .map((item) => `<li><span class="bullet-dot"></span><span>${escapeHtml(say(item))}</span></li>`)
    .join("\n")

  const scheduledCardsHtml = scheduledProducts
    .map(
      (prod) => `<div class="scheduled-card">
        <p class="scheduled-prod">${escapeHtml(say(prod.productName))}</p>
        <p class="scheduled-where">${escapeHtml(prod.details.join(" · "))}</p>
      </div>`,
    )
    .join("\n")

  const materialBulletsHtml = document.template.materials
    .map((item) => `<li><span class="bullet-dot"></span><span>${escapeHtml(say(item))}</span></li>`)
    .join("\n")

  const exclusionBulletsHtml = document.template.exclusions
    .map((item) => `<li><span class="bullet-dot muted"></span><span>${escapeHtml(say(item))}</span></li>`)
    .join("\n")

  const rawWarranty = document.template.warranty?.trim() ?? ""
  const hasCustomWarranty = rawWarranty.length > 0 && !/^editable example/i.test(rawWarranty)
  const rawPaymentTerms = document.template.paymentTerms?.trim() ?? ""
  const hasCustomPaymentTerms = rawPaymentTerms.length > 0 && !/^editable example/i.test(rawPaymentTerms)
  const hasFinancing = Boolean(
    effectiveSettings.financingEnabled === true &&
      (effectiveSettings.financingLender || effectiveSettings.financingApplyUrl) &&
      monthly > 0,
  )

  const hasWarrantyOrPaymentSection = hasCustomWarranty || hasCustomPaymentTerms || hasFinancing

  const warrantySectionHtml = hasWarrantyOrPaymentSection
    ? `<section class="proposal-section" data-testid="proposal-section-warranty">
        ${
          hasCustomWarranty
            ? `<p class="eyebrow">Warranty</p>
        <h2 class="section-title" style="font-size: 25px;">Workmanship Warranty</h2>
        <div style="margin-top: 14px; background: rgba(246, 242, 234, 0.68); border: 1px solid var(--line); border-radius: 16px; padding: 15px; font-size: 13px;">
          ${(() => {
            const wText = say(rawWarranty)
            const colonIdx = wText.indexOf(":")
            if (colonIdx > 0 && colonIdx < 65) {
              return `<strong>${escapeHtml(wText.slice(0, colonIdx + 1))}</strong>${escapeHtml(wText.slice(colonIdx + 1))}`
            }
            return escapeHtml(wText)
          })()}
        </div>`
            : ""
        }
        ${
          hasCustomPaymentTerms || hasFinancing
            ? `<p class="eyebrow" style="${hasCustomWarranty ? "margin-top: 16px;" : ""}">Payment Terms</p>
        <div data-testid="proposal-section-payment-terms" style="margin-top: 8px; background: rgba(246, 242, 234, 0.68); border: 1px solid var(--line); border-radius: 16px; padding: 14px; font-size: 13px;">
          ${hasCustomPaymentTerms ? escapeHtml(say(rawPaymentTerms)) : ""}
          ${hasFinancing ? `<div style="${hasCustomPaymentTerms ? "margin-top: 8px; " : ""}font-weight: 600; color: var(--brand);">Financing available: as low as ${escapeHtml(moneyExact(monthly))}/mo for ${financing.months} months (${financing.aprPercent}% APR).</div>` : ""}
        </div>`
            : ""
        }
      </section>`
    : ""

  const exclusionsSectionHtml = `<section class="proposal-section" data-testid="proposal-section-exclusions">
        <p class="eyebrow">Exclusions</p>
        <h2 class="section-title" style="font-size: 25px;">What Is Not Included</h2>
        <ul class="bullet-list">
          ${exclusionBulletsHtml}
        </ul>
      </section>`

  const exclusionsAndWarrantyRowHtml = hasWarrantyOrPaymentSection
    ? `<div class="two-col-sections">
      ${exclusionsSectionHtml}
      ${warrantySectionHtml}
    </div>`
    : exclusionsSectionHtml

  const contractTermsHtml = document.contractTerms
    .map((term) => `<li><span class="bullet-dot"></span><span>${escapeHtml(say(term))}</span></li>`)
    .join("\n")

  const palette = parseBrandPalette(effectiveSettings.brandColor)

  const brandHeaderHtml = logoUrl
    ? `<div class="brand-row">
        <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(company)}" data-testid="proposal-brand" style="height: 54px; width: auto; max-width: 240px; object-fit: contain; border-radius: 8px; flex-shrink: 0;" />
        <div>
          <p class="eyebrow">Proposal · ${escapeHtml(say(document.template.label))}</p>
          ${credLine ? `<p style="font-size: 12px; color: var(--ink-soft); margin-top: 2px;" data-testid="proposal-company-license">${escapeHtml(credLine)}</p>` : ""}
        </div>
      </div>`
    : `<div class="brand-row" style="border-left: 4px solid var(--brand); padding-left: 14px;">
        <div data-testid="proposal-brand">
          <p class="eyebrow" style="color: var(--brand);">Proposal · ${escapeHtml(say(document.template.label))}</p>
          <p class="company-title" style="font-family: var(--serif); font-size: 28px; font-weight: 400; line-height: 1.05; margin-top: 2px;">${escapeHtml(company)}</p>
          ${credLine ? `<p style="font-size: 12px; color: var(--ink-soft); margin-top: 4px;" data-testid="proposal-company-license">${escapeHtml(credLine)}</p>` : ""}
        </div>
      </div>`

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(company)} — ${escapeHtml(input.estimate.title || "Painting Proposal")}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --paper: #f6f2ea;
      --paper-card: rgba(255, 255, 255, 0.88);
      --ink: #17191c;
      --ink-soft: #525866;
      --line: rgba(23, 25, 28, 0.12);
      --brand: ${palette.brand};
      --brand-soft: ${palette.brandSoft};
      --accent: #b85d27;
      --emerald: ${palette.emerald};
      --bar-bg: ${palette.barBg};
      --bar-accent: ${palette.barAccent};
      --serif: 'Instrument Serif', Georgia, 'Times New Roman', serif;
      --sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --mono: 'JetBrains Mono', ui-monospace, monospace;
    }

    @page {
      size: letter;
      margin: 0.22in 0.3in;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      background: #ebe5d9 !important;
      color: var(--ink);
      font-family: var(--sans);
      line-height: 1.42;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 940px;
      margin: 0 auto;
      padding: 4px 8px;
    }

    .proposal-section {
      background: var(--paper-card);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 14px 20px;
      margin-bottom: 10px;
      box-shadow: 0 10px 26px -16px rgba(23, 25, 28, 0.08);
      break-inside: auto;
      page-break-inside: auto;
    }

    .proposal-section.allow-break {
      break-inside: auto;
      page-break-inside: auto;
    }

    .cover-card,
    .investment-bar,
    #proposal-page-sign {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .cover-card {
      background: linear-gradient(155deg, rgba(255,255,255,0.96) 0%, rgba(246,242,234,0.94) 100%);
      border: 2px solid var(--brand);
      position: relative;
      overflow: hidden;
    }

    .cover-top {
      display: flex;
      flex-wrap: nowrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      min-width: 0;
    }

    .brand-logo {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: var(--brand);
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: var(--serif);
      font-size: 25px;
      line-height: 1;
      border: 1px solid rgba(255,255,255,0.2);
      box-shadow: 0 6px 16px rgba(31, 77, 61, 0.22);
      flex-shrink: 0;
    }

    .brand-logo small {
      font-family: var(--sans);
      font-size: 8px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .eyebrow {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--ink-soft);
    }

    .company-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
      margin-top: 2px;
    }

    .price-pill-box {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 10px 16px;
      text-align: right;
      flex-shrink: 0;
    }

    .big-price {
      font-family: var(--serif);
      font-size: 34px;
      line-height: 1.05;
      color: var(--ink);
      margin-top: 2px;
    }

    .cover-headline {
      font-family: var(--serif);
      font-size: 34px;
      line-height: 1.05;
      margin-top: 10px;
      color: var(--ink);
      font-weight: 400;
    }

    .cover-tagline {
      font-size: 13.5px;
      color: var(--ink-soft);
      max-width: 660px;
      margin-top: 4px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 10px;
    }

    .meta-box {
      background: rgba(246, 242, 234, 0.78);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 9px 12px;
    }

    .meta-title {
      font-size: 13px;
      font-weight: 700;
      margin-top: 3px;
      color: var(--ink);
    }

    .meta-sub {
      font-size: 11px;
      color: var(--ink-soft);
      margin-top: 2px;
    }

    /* Investment & Deposit Bar */
    .investment-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: var(--bar-bg);
      color: #fff;
      border-radius: 18px;
      padding: 12px 16px;
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .inv-item {
      border-right: 1px solid rgba(255, 255, 255, 0.14);
      padding-right: 12px;
    }

    .inv-item:last-child {
      border-right: none;
      padding-right: 0;
    }

    .inv-label {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: rgba(255, 255, 255, 0.65);
      font-weight: 600;
    }

    .inv-amount {
      font-family: var(--serif);
      font-size: 26px;
      line-height: 1.05;
      margin-top: 2px;
    }

    .inv-amount.emerald {
      color: var(--bar-accent);
    }

    .inv-note {
      font-size: 10.5px;
      color: rgba(255, 255, 255, 0.72);
      margin-top: 2px;
    }

    /* Section Headings */
    .section-title {
      font-family: var(--serif);
      font-size: 25px;
      line-height: 1.08;
      margin-top: 2px;
      font-weight: 400;
      color: var(--ink);
    }

    .scope-overview-banner {
      margin-top: 8px;
      background: rgba(246, 242, 234, 0.78);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 7px 12px;
      font-size: 12px;
      color: var(--ink-soft);
    }

    /* Room Cards */
    .room-card {
      background: rgba(246, 242, 234, 0.58);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 12px 14px;
      margin-top: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .room-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }

    .room-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--ink);
    }

    .room-dims {
      font-size: 11px;
      color: var(--ink-soft);
      margin-top: 1px;
    }

    .room-color-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-top: 4px;
      background: #fff;
      border: 1px solid var(--line);
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }

    .swatch {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.2);
    }

    .room-price {
      font-family: var(--serif);
      font-size: 24px;
      line-height: 1;
      color: var(--ink);
    }

    .surface-list {
      margin-top: 7px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .surface-item {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid var(--line);
      border-radius: 11px;
      padding: 6px 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .surface-top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .surface-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
    }

    .surface-spec {
      font-size: 11px;
      font-weight: 600;
      color: var(--brand);
      background: var(--brand-soft);
      padding: 2px 9px;
      border-radius: 999px;
    }

    .surface-desc {
      font-size: 11.5px;
      color: var(--ink-soft);
      margin-top: 2px;
    }

    /* Bullet Lists for Template Sections */
    .bullet-list {
      list-style: none;
      margin-top: 14px;
      display: grid;
      gap: 8px;
    }

    .bullet-list li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(246, 242, 234, 0.58);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 10px 14px;
      font-size: 13px;
      color: var(--ink);
    }

    .bullet-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--brand);
      margin-top: 6px;
      flex-shrink: 0;
    }

    .bullet-dot.muted {
      background: var(--ink-soft);
    }

    .scheduled-box {
      margin-top: 14px;
      background: rgba(246, 242, 234, 0.68);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px;
    }

    .scheduled-grid {
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .scheduled-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px 12px;
    }

    .scheduled-prod {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
    }

    .scheduled-where {
      font-size: 11.5px;
      color: var(--ink-soft);
      margin-top: 2px;
    }

    .two-col-sections {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 18px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .two-col-sections .proposal-section {
      margin-bottom: 0;
    }

    /* Signature Section */
    .signature-pad {
      margin-top: 16px;
      background: #fff;
      border: 2px dashed rgba(23, 25, 28, 0.25);
      border-radius: 16px;
      padding: 18px;
      text-align: center;
    }

    .signature-field-box {
      width: 100%;
      border: 1px solid var(--line);
      background: var(--paper);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
      margin-top: 6px;
    }

    .signature-cursive {
      font-family: var(--serif);
      font-style: italic;
      font-size: 36px;
      color: #1e293b;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid var(--line);
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <main class="container">
    <!-- 1. BRANDED PROPOSAL COVER SECTION -->
    <section class="proposal-section cover-card" id="proposal-page-cover" data-testid="proposal-page-cover">
      <div class="cover-top">
        ${brandHeaderHtml}
        <div class="price-pill-box">
          <p class="eyebrow">Total Investment</p>
          <p class="big-price" data-testid="proposal-cover-total">${escapeHtml(moneyExact(quote.total))}</p>
          ${deposit > 0 ? `<p style="font-size: 11.5px; color: var(--emerald); font-weight: 600; margin-top: 2px;">${depositPercent}% Deposit (${escapeHtml(moneyExact(deposit))}) reserves start date</p>` : ""}
        </div>
      </div>

      <h1 class="cover-headline">${escapeHtml(input.estimate.title || "Interior Painting Proposal")}</h1>
      <p class="cover-tagline" data-testid="proposal-cover-line">${escapeHtml(document.coverLine || "Complete preparation and finish schedule, tailored for your home.")}</p>

      <div class="meta-grid">
        <div class="meta-box">
          <p class="eyebrow">Prepared for</p>
          <p class="meta-title">${escapeHtml(input.clientName || "Valued Homeowner")}</p>
          <p class="meta-sub">${escapeHtml(input.estimate.jobAddress || "Project Address")}</p>
        </div>
        <div class="meta-box">
          <p class="eyebrow">Painter &amp; Estimator</p>
          <p class="meta-title">${escapeHtml(salesperson)}</p>
          <p class="meta-sub">${escapeHtml(estimatorSub || `Prepared ${preparedOn}`)}</p>
        </div>
        <div class="meta-box">
          <p class="eyebrow">Proposal Template</p>
          <p class="meta-title">${escapeHtml(say(document.template.label))} Standard</p>
          <p class="meta-sub">${escapeHtml(roomSummaryParts.join(" · "))}</p>
        </div>
      </div>
    </section>

    <!-- 2. TOTAL INVESTMENT & DEPOSIT SUMMARY BANNER -->
    <div class="investment-bar" data-testid="proposal-investment-summary">
      <div class="inv-item">
        <p class="inv-label">Total Project Investment</p>
        <p class="inv-amount" data-testid="proposal-total">${escapeHtml(moneyExact(quote.total))}</p>
        <p class="inv-note" data-testid="proposal-materials-status-summary">${escapeHtml(materialsStatus.badge)}</p>
      </div>
      <div class="inv-item">
        <p class="inv-label">Deposit Required (${depositPercent}%)</p>
        <p class="inv-amount emerald" data-testid="proposal-deposit">${escapeHtml(moneyExact(deposit))}</p>
        <p class="inv-note">Due upon acceptance to lock in your schedule</p>
      </div>
      <div class="inv-item">
        <p class="inv-label">Balance Upon Completion (${balancePercent}%)</p>
        <p class="inv-amount" data-testid="proposal-balance">${escapeHtml(moneyExact(balance))}</p>
        <p class="inv-note">Due after final walkthrough &amp; touch-up sign-off</p>
      </div>
    </div>

    <!-- 3. ROOM-BY-ROOM PAINTING DETAILS & PRICING -->
    <section class="proposal-section allow-break" id="proposal-page-scope" data-testid="proposal-page-scope">
      <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 10px;">
        <div>
          <p class="eyebrow">Itemized Work Order · ${escapeHtml(say(document.template.label))}</p>
          <h2 class="section-title">Scope of Work by Room</h2>
        </div>
      </div>

      <div class="scope-overview-banner" data-testid="proposal-scope-overview">
        <strong>Standard Scope Overview:</strong> ${escapeHtml(say(document.template.scopeOverview))}
      </div>

      ${roomsHtml}
      ${additionalBlockHtml}
    </section>

    <!-- 4. PREPARATION PROCEDURES -->
    <section class="proposal-section" data-testid="proposal-section-preparation">
      <p class="eyebrow">Preparation · ${escapeHtml(say(document.template.label))}</p>
      <h2 class="section-title">Preparation Procedures</h2>
      <ul class="bullet-list">
        ${prepBulletsHtml}
      </ul>
    </section>

    <!-- 5. MATERIALS & PAINT SYSTEM -->
    <section class="proposal-section" data-testid="proposal-section-materials">
      <p class="eyebrow">Materials</p>
      <h2 class="section-title">Materials &amp; Paint System</h2>
      <p style="font-size: 13px; font-weight: 600; color: var(--brand); margin: 8px 0 10px;" data-testid="proposal-materials-status">${escapeHtml(materialsStatus.detail)}</p>

      ${
        scheduledProducts.length > 0
          ? `<div class="scheduled-box">
              <p class="eyebrow" style="color: var(--brand);">Scheduled Products on This Job (Auto-Extracted from Room Specs)</p>
              <div class="scheduled-grid" data-testid="proposal-scheduled-products">
                ${scheduledCardsHtml}
              </div>
            </div>`
          : ""
      }

      <ul class="bullet-list">
        ${materialBulletsHtml}
      </ul>
    </section>

    <!-- 6. EXCLUSIONS, WARRANTY & PAYMENT TERMS -->
    ${exclusionsAndWarrantyRowHtml}

    <!-- 7. CONTRACT TERMS -->
    <section class="proposal-section" id="proposal-page-terms" data-testid="proposal-page-terms">
      <p class="eyebrow">Agreement</p>
      <h2 class="section-title" style="font-size: 25px;">Contract Terms</h2>
      <ul class="bullet-list">
        ${contractTermsHtml}
      </ul>
    </section>

    <!-- 8. HOMEOWNER ACCEPTANCE & SIGNATURE SECTION -->
    <section class="proposal-section" id="proposal-page-sign" data-testid="proposal-page-sign" style="border: 2px solid var(--brand);">
      <div>
        <p class="eyebrow">Sign &amp; Accept Proposal</p>
        <h2 class="section-title">Approve Scope &amp; Lock In Your Price</h2>
        <p style="font-size: 13.5px; color: var(--ink-soft); margin-top: 4px;">
          Signing accepts the <strong>${escapeHtml(moneyExact(quote.total))}</strong> investment (<strong>${escapeHtml(moneyExact(deposit))}</strong> deposit due now) and authorizes ${escapeHtml(company)} to schedule your project.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px;">
        <div>
          <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-soft);">Full Legal Name</p>
          <div class="signature-field-box" style="${accepted ? "" : "color: var(--ink-soft); font-style: italic;"}">${escapeHtml(accepted ? signerDisplay : "Awaiting signature upon online acceptance")}</div>
        </div>
        <div>
          <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-soft);">Preferred Payment Method</p>
          <div class="signature-field-box">${escapeHtml(preferredMethod)}${deposit > 0 ? ` (${escapeHtml(moneyExact(deposit))} deposit)` : ""}</div>
        </div>
      </div>

      <div class="signature-pad">
        <p class="eyebrow">Electronic Signature</p>
        ${signatureBoxHtml}
        <p style="font-size: 12px; color: var(--ink-soft);" data-testid="accept-wording">
          ${escapeHtml(say(document.acceptWording))}
        </p>
      </div>
    </section>
  </main>
</body>
</html>`
}
