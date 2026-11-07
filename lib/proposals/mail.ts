import { displayCompanyName } from "../brand/company.ts"
import { moneyExact } from "../format.ts"
import { paintingText, translatePainting } from "../field/terms.ts"
import { balanceAfterDeposit } from "../payments/deposit.ts"
import type { Estimate, EstimateSettings, PaymentMethod } from "../types.ts"
import { proposalDocument, scheduledProductsFromAreas } from "./document.ts"
import { proposalFigures } from "./figures.ts"
import { textPdf } from "./pdf.ts"
import type { PdfLogo } from "../brand/logo-pdf.ts"

export interface ProposalMail {
  to: string
  subject: string
  text: string
  filename: string
  pdf: Uint8Array
}

const WIDTH = 86

export function customerLineIds(estimate: Estimate): string[] {
  if (estimate.signature?.selectedLineIds) return estimate.signature.selectedLineIds
  return estimate.lineItems
    .filter((item) => item.optional && item.pending !== true && item.selected !== false)
    .map((item) => item.id)
}

function areaDimensionsLabel(area: {
  areaType: "room" | "surface"
  lengthFt: number
  widthFt: number
  heightFt: number
}): string {
  if (area.areaType === "room" && area.lengthFt > 0 && area.widthFt > 0) {
    return `${area.lengthFt} x ${area.widthFt} x ${area.heightFt} ft`
  }
  if (area.lengthFt > 0 && area.heightFt > 0) {
    return `${area.lengthFt} x ${area.heightFt} ft`
  }
  if (area.lengthFt > 0 && area.widthFt > 0) {
    return `${area.lengthFt} x ${area.widthFt} ft`
  }
  if (area.lengthFt > 0) {
    return `${area.lengthFt} ln ft`
  }
  return ""
}

export function proposalMail(input: {
  estimate: Estimate
  clientName: string
  clientEmail: string
  language: "en" | "es"
  companyName: string | undefined
  paymentMethods: PaymentMethod[]
  origin: string
  logo?: PdfLogo | null
  estimateSettings?: EstimateSettings
}): ProposalMail | { error: string } {
  const to = input.clientEmail.trim()
  if (!to.includes("@") || /\s/.test(to)) return { error: "Add an email on the client before this proposal can go to an inbox." }
  const token = input.estimate.publicToken.trim()
  if (!/^[a-z0-9]{6,40}$/i.test(token)) return { error: "This proposal has no client link." }
  const origin = input.origin.replace(/\/$/, "")
  const english = `${origin}/p/${token}`
  const spanish = `${english}?lang=es`
  const link = input.language === "es" ? spanish : english
  const company = displayCompanyName(input.companyName)
  const client = input.clientName.trim() || (input.language === "es" ? "cliente" : "there")
  const address = input.estimate.jobAddress.trim()
  const place = address || (input.language === "es" ? "su proyecto" : "your project")
  const figures = proposalFigures(input.estimate, input.paymentMethods, customerLineIds(input.estimate))
  const total = moneyExact(figures.quote.total)
  const effectiveSettings: EstimateSettings = {
    ...input.estimate.settings,
    ...(input.estimateSettings
      ? {
          companyName: input.estimateSettings.companyName ?? input.estimate.settings.companyName,
          companyEmail: input.estimateSettings.companyEmail ?? input.estimate.settings.companyEmail,
          businessPhone: input.estimateSettings.businessPhone ?? input.estimate.settings.businessPhone,
          companyLicense: input.estimateSettings.companyLicense ?? input.estimate.settings.companyLicense,
          logoUrl: input.estimateSettings.logoUrl ?? input.estimate.settings.logoUrl,
        }
      : {}),
    ...(input.estimateSettings?.proposalPages
      ? {
          proposalPages: {
            ...input.estimate.settings.proposalPages,
            ...input.estimateSettings.proposalPages,
            templates: {
              ...input.estimate.settings.proposalPages?.templates,
              ...input.estimateSettings.proposalPages.templates,
            },
          },
        }
      : {}),
  }
  const companyDetails = [
    effectiveSettings.companyLicense?.trim(),
    effectiveSettings.businessPhone?.trim(),
    effectiveSettings.companyEmail?.trim(),
  ]
    .filter(Boolean)
    .join(" · ")
  const document = proposalDocument(effectiveSettings, input.estimate.estimateKind)
  const scheduledProducts = scheduledProductsFromAreas(figures.quote.areas)
  const subject = input.language === "es" ? `Propuesta para ${place}` : `Proposal for ${place}`
  const text =
    input.language === "es"
      ? `Hola ${client},\n\nSu propuesta de ${company} para ${place} está lista.\n\nÁbrala aquí:\n${link}\n\nEl PDF de esta propuesta va adjunto. Responda si quiere un cambio, o abra el enlace para aceptarla.\n\nTotal: ${total}\n\n${company}`
      : `Hi ${client},\n\nYour proposal from ${company} for ${place} is ready.\n\nOpen it here:\n${link}\n\nThe PDF of this proposal is attached. Reply if you want a change, or open the link to accept it.\n\nTotal: ${total}\n\n${company}`
  const say = (value: string) => translatePainting(value, input.language)
  const lines: string[] = [
    company,
    ...(companyDetails ? [companyDetails] : []),
    "",
    input.language === "es" ? `Propuesta · ${say(document.template.label)}` : `Proposal · ${document.template.label}`,
    input.estimate.title.trim() || (input.language === "es" ? "Estimado" : "Estimate"),
    input.language === "es" ? `Preparado para ${client}` : `Prepared for ${client}`,
    address,
    ...(document.coverLine ? [document.coverLine] : []),
    "",
    input.language === "es" ? `Abrir la propuesta: ${link}` : `Open the proposal: ${link}`,
    "",
    input.language === "es" ? "Alcance del Trabajo" : "Scope of Work",
    ...wrap(say(document.template.scopeOverview)),
    "",
  ]
  for (const area of figures.quote.areas) {
    const visible = area.surfaces.filter((surface) => !surface.hideFromCustomer)
    if (visible.length === 0) continue
    const rawArea = input.estimate.areas.find((item) => item.id === area.id)
    const dims = areaDimensionsLabel(area)
    lines.push(dims ? `${say(area.name)} (${dims})` : say(area.name), moneyExact(area.clientPrice))
    const colorSpec = [rawArea?.colorName, rawArea?.colorCode, rawArea?.sheen].filter(Boolean).join(" · ")
    if (colorSpec) {
      lines.push(...wrap(input.language === "es" ? `Color y brillo: ${colorSpec}` : `Color & sheen: ${colorSpec}`))
    }
    for (const surface of visible) {
      const coats = surface.showCoats ? ` · ${say(`${surface.coatCount} coats`)}` : ""
      const product =
        surface.productName.trim() && surface.productName.trim().toLowerCase() !== "prep"
          ? ` · ${say(surface.productName.trim())}`
          : ""
      const price = surface.showPrice ? `  ${moneyExact(surface.price)}` : ""
      lines.push(...wrap(`${say(surface.clientLabel)}${coats}${product}${price}`))
      if (surface.clientDescription.trim()) lines.push(...wrap(say(surface.clientDescription)))
    }
    lines.push("")
  }
  if (figures.quote.lineItems.length > 0) {
    lines.push(say("Additional items"))
    for (const line of figures.quote.lineItems) {
      const label = paintingText(line.label, line.labelEs, input.language)
      lines.push(...wrap(`${label}  ${moneyExact(line.price)}`))
      if (line.clientNote.trim()) lines.push(...wrap(paintingText(line.clientNote, line.clientNoteEs, input.language)))
    }
    lines.push("")
  }
  if (document.template.preparation.length > 0) {
    lines.push(input.language === "es" ? "Procedimientos de Preparación" : "Preparation Procedures")
    for (const step of document.template.preparation) {
      lines.push(...wrap(`- ${say(step)}`))
    }
    lines.push("")
  }
  if (scheduledProducts.length > 0 || document.template.materials.length > 0) {
    lines.push(input.language === "es" ? "Materiales y Pinturas" : "Materials & Paint System")
    for (const product of scheduledProducts) {
      lines.push(...wrap(`- ${say(product.productName)}: ${product.details.join("; ")}`))
    }
    for (const mat of document.template.materials) {
      lines.push(...wrap(`- ${say(mat)}`))
    }
    lines.push("")
  }
  if (document.template.exclusions.length > 0) {
    lines.push(input.language === "es" ? "Exclusiones" : "Exclusions")
    for (const item of document.template.exclusions) {
      lines.push(...wrap(`- ${say(item)}`))
    }
    lines.push("")
  }
  if (document.template.warranty) {
    lines.push(input.language === "es" ? "Garantía" : "Warranty")
    lines.push(...wrap(say(document.template.warranty)))
    lines.push("")
  }
  lines.push(input.language === "es" ? `Total ${total}` : `Total ${total}`)
  if (figures.deposit > 0) {
    const deposit = moneyExact(figures.deposit)
    const balance = moneyExact(balanceAfterDeposit(figures.quote.total, figures.depositPercent))
    lines.push(
      input.language === "es"
        ? `Depósito a pagar (${figures.depositPercent}%) ${deposit}`
        : `Deposit due (${figures.depositPercent}%) ${deposit}`,
    )
    if (figures.deposit < figures.quote.total) {
      lines.push(input.language === "es" ? `Saldo al finalizar ${balance}` : `Balance after the job ${balance}`)
    }
  }
  if (document.template.paymentTerms) {
    lines.push("", input.language === "es" ? "Condiciones de Pago" : "Payment Terms")
    lines.push(...wrap(say(document.template.paymentTerms)))
  }
  const terms = document.contractTerms
  if (terms.length > 0) {
    lines.push("", input.language === "es" ? "Términos" : "Terms")
    for (const term of terms.slice(0, 12)) lines.push(...wrap(say(term)))
  }
  return {
    to,
    subject: subject.slice(0, 180),
    text,
    filename: "proposal.pdf",
    pdf: textPdf(lines.flatMap((line) => wrap(line)), input.logo),
  }
}

function wrap(value: string): string[] {
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) return [""]
  const words = text.split(" ")
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const pieces = word.length > WIDTH ? word.match(new RegExp(`.{1,${WIDTH}}`, "g")) ?? [word] : [word]
    for (const piece of pieces) {
      const next = line ? `${line} ${piece}` : piece
      if (line && next.length > WIDTH) {
        lines.push(line)
        line = piece
      } else {
        line = next
      }
    }
  }
  if (line) lines.push(line)
  return lines
}
