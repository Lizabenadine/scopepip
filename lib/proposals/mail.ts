import { displayCompanyName } from "../brand/company.ts"
import { moneyExact } from "../format.ts"
import { paintingText, translatePainting } from "../field/terms.ts"
import type { Estimate, PaymentMethod } from "../types.ts"
import { proposalDocument } from "./document.ts"
import { proposalFigures } from "./figures.ts"
import { textPdf } from "./pdf.ts"

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

export function proposalMail(input: {
  estimate: Estimate
  clientName: string
  clientEmail: string
  language: "en" | "es"
  companyName: string | undefined
  paymentMethods: PaymentMethod[]
  origin: string
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
  const subject = input.language === "es" ? `Propuesta para ${place}` : `Proposal for ${place}`
  const text =
    input.language === "es"
      ? `Hola ${client},\n\nSu propuesta de ${company} para ${place} está lista.\n\nÁbrala aquí:\n${link}\n\nEl PDF de esta propuesta va adjunto. Responda si quiere un cambio, o abra el enlace para aceptarla.\n\nTotal: ${total}\n\n${company}`
      : `Hi ${client},\n\nYour proposal from ${company} for ${place} is ready.\n\nOpen it here:\n${link}\n\nThe PDF of this proposal is attached. Reply if you want a change, or open the link to accept it.\n\nTotal: ${total}\n\n${company}`
  const say = (value: string) => translatePainting(value, input.language)
  const lines: string[] = [
    company,
    "",
    input.language === "es" ? "Propuesta" : "Proposal",
    input.estimate.title.trim() || (input.language === "es" ? "Estimado" : "Estimate"),
    input.language === "es" ? `Preparado para ${client}` : `Prepared for ${client}`,
    address,
    "",
    input.language === "es" ? `Abrir la propuesta: ${link}` : `Open the proposal: ${link}`,
    "",
  ]
  for (const area of figures.quote.areas) {
    const visible = area.surfaces.filter((surface) => !surface.hideFromCustomer)
    if (visible.length === 0) continue
    lines.push(say(area.name), moneyExact(area.clientPrice))
    for (const surface of visible) {
      const coats = surface.showCoats ? ` · ${say(`${surface.coatCount} coats`)}` : ""
      const price = surface.showPrice ? `  ${moneyExact(surface.price)}` : ""
      lines.push(...wrap(`${say(surface.clientLabel)}${coats}${price}`))
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
  lines.push(input.language === "es" ? `Total ${total}` : `Total ${total}`)
  if (figures.deposit > 0) {
    const deposit = moneyExact(figures.deposit)
    lines.push(input.language === "es" ? `Depósito a pagar ${deposit}` : `Deposit due ${deposit}`)
  }
  const terms = proposalDocument(input.estimate.settings).contractTerms
  if (terms.length > 0) {
    lines.push("", input.language === "es" ? "Términos" : "Terms")
    for (const term of terms.slice(0, 12)) lines.push(...wrap(say(term)))
  }
  return {
    to,
    subject: subject.slice(0, 180),
    text,
    filename: "proposal.pdf",
    pdf: textPdf(lines.flatMap((line) => wrap(line))),
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
