import type { EstimateSettings, ProposalPages, ProposalPhoto, ProposalTestimonial } from "../types.ts"

export const DEFAULT_CONTRACT_TERMS = [
  "This proposal covers the rooms, surfaces, and add-ons you leave selected. Anything outside that scope is a change order.",
  "The price stays firm until the date on the cover. After that, the painter can reprice materials and labor.",
  "You provide clear access to the work areas. Furniture and floors are protected before paint starts.",
  "Payment follows the methods listed. A card surcharge is added only when that method is chosen.",
  "Signing accepts this price and authorizes the painter to open the crew work order.",
]

export const DEFAULT_ACCEPT_WORDING =
  "By signing, I accept this proposal, the price, and the contract terms, and I authorize the work to be scheduled."

export const DEFAULT_DECLINE_WORDING =
  "I decline this proposal. No work will be scheduled, and this price is not accepted."

export interface ResolvedProposalPages {
  coverLine: string
  photos: ProposalPhoto[]
  testimonials: ProposalTestimonial[]
  contractTerms: string[]
  acceptWording: string
  declineWording: string
}

export interface ProposalPageRef {
  id: string
  label: string
}

const MAX_TEXT = 4000
const MAX_SRC = 700_000

export function proposalDocument(settings: EstimateSettings | undefined): ResolvedProposalPages {
  const pages = settings?.proposalPages
  return {
    coverLine: clip(pages?.coverLine, 240),
    photos: photosOf(pages),
    testimonials: testimonialsOf(pages),
    contractTerms: termsOf(pages?.contractTerms),
    acceptWording: clip(pages?.acceptWording, 500) || DEFAULT_ACCEPT_WORDING,
    declineWording: clip(pages?.declineWording, 500) || DEFAULT_DECLINE_WORDING,
  }
}

export function proposalPageList(document: ResolvedProposalPages): ProposalPageRef[] {
  const pages: ProposalPageRef[] = [
    { id: "proposal-page-cover", label: "Cover" },
    { id: "proposal-page-scope", label: "Scope" },
  ]
  if (document.photos.length > 0) pages.push({ id: "proposal-page-photos", label: "Photos" })
  if (document.testimonials.length > 0) pages.push({ id: "proposal-page-testimonials", label: "Testimonials" })
  pages.push({ id: "proposal-page-terms", label: "Terms" }, { id: "proposal-page-sign", label: "Signature" })
  return pages
}

export function contractTermsText(terms: string[]): string {
  return terms.join("\n\n")
}

function termsOf(value: string | undefined): string[] {
  const paragraphs = clip(value, MAX_TEXT)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  return paragraphs.length > 0 ? paragraphs.slice(0, 40) : DEFAULT_CONTRACT_TERMS
}

function photosOf(pages: ProposalPages | undefined): ProposalPhoto[] {
  if (!Array.isArray(pages?.photos)) return []
  const photos: ProposalPhoto[] = []
  for (const photo of pages.photos) {
    if (photos.length >= 8) break
    const src = photoSrc(photo?.src)
    const id = clip(photo?.id, 80)
    if (!src || !id) continue
    photos.push({ id, caption: clip(photo?.caption, 160), src })
  }
  return photos
}

function testimonialsOf(pages: ProposalPages | undefined): ProposalTestimonial[] {
  if (!Array.isArray(pages?.testimonials)) return []
  const rows: ProposalTestimonial[] = []
  for (const row of pages.testimonials) {
    if (rows.length >= 8) break
    const quote = clip(row?.quote, 500)
    const name = clip(row?.name, 80)
    const id = clip(row?.id, 80)
    if (!quote || !name || !id) continue
    rows.push({ id, quote, name, detail: clip(row?.detail, 80) })
  }
  return rows
}

function photoSrc(value: string | undefined): string | null {
  const src = value?.trim() ?? ""
  if (!src || src.length > MAX_SRC) return null
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(src)) return src.replace(/\s/g, "")
  try {
    const url = new URL(src)
    if (url.protocol !== "https:") return null
    return url.toString()
  } catch {
    return null
  }
}

function clip(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max)
}
