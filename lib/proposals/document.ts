import type {
  EstimateKind,
  EstimateSettings,
  ProposalKindTemplate,
  ProposalPages,
  ProposalPhoto,
  ProposalTestimonial,
} from "../types.ts"

export const PROPOSAL_TEMPLATE_KINDS: EstimateKind[] = ["interior", "exterior", "cabinets"]

export const PROPOSAL_TEMPLATE_LABELS: Record<EstimateKind, string> = {
  interior: "Interior Painting",
  exterior: "Exterior Painting",
  cabinets: "Cabinets & Specialty Painting",
}

export interface ResolvedProposalKindTemplate {
  kind: EstimateKind
  label: string
  scopeOverview: string
  preparation: string[]
  materials: string[]
  exclusions: string[]
  warranty: string
  paymentTerms: string
}

export const DEFAULT_PROPOSAL_TEMPLATES: Record<EstimateKind, ResolvedProposalKindTemplate> = {
  interior: {
    kind: "interior",
    label: PROPOSAL_TEMPLATE_LABELS.interior,
    scopeOverview:
      "Supply labor, surface protection, and specified interior coatings to prepare and paint the rooms, surfaces, and items detailed in the Project Scope below.",
    preparation: [
      "Protect floors, walkways, countertops, and adjacent furnishings with drop cloths and masking film.",
      "Mask hardware, light fixtures, hinges, and unpainted edges; remove and reinstall switch and outlet cover plates.",
      "Fill minor nail holes, hairline cracks, and surface blemishes on scheduled drywall and trim; sand smooth.",
      "Caulk open seams along scheduled baseboards, door casings, and window trim for clean paint lines.",
      "Spot-prime patched areas, bare substrates, and stain areas before applying finish coats.",
    ],
    materials: [
      "Apply the paint products, sheens, and coat counts listed for each room and surface in the Project Scope.",
      "Provide professional-grade primers, spackle, painter's caulk, masking supplies, and application sundries matched to each substrate.",
    ],
    exclusions: [
      "Rooms, closets, ceilings, trim, doors, or surfaces not explicitly listed in the Project Scope.",
      "Structural drywall replacement, full-wall skim coating, wallpaper removal, or moisture remediation unless itemized.",
      "Moving heavy appliances, pianos, or fragile electronics unless arranged prior to start.",
    ],
    warranty:
      "Editable example warranty: Workmanship is covered against peeling, blistering, or defective application on scheduled interior surfaces under normal conditions according to your contractor's stated warranty policy.",
    paymentTerms:
      "Editable example payment terms: The deposit listed in the Investment Summary reserves your schedule date, with the remaining balance due upon completion walkthrough.",
  },
  exterior: {
    kind: "exterior",
    label: PROPOSAL_TEMPLATE_LABELS.exterior,
    scopeOverview:
      "Supply labor, access equipment, protection, and specified exterior coatings for the elevations, siding, trim, and exterior features detailed in the Project Scope below.",
    preparation: [
      "Wash scheduled exterior surfaces to remove surface chalk, dirt, cobwebs, and loose debris; allow surfaces to dry before coating.",
      "Protect landscaping, walkways, patios, decking, roofing, light fixtures, and window glass with drop cloths and masking.",
      "Scrape and feather-sand loose, peeling, or flaking paint on scheduled siding and trim to a sound substrate.",
      "Spot-prime bare wood, weathered areas, and exposed fasteners with exterior bonding primer.",
      "Caulk open joints around scheduled window trim, door frames, fascia seams, and siding penetrations where needed.",
    ],
    materials: [
      "Apply the exterior paint or stain products, sheens, and coat counts listed for each elevation and surface in the Project Scope.",
      "Provide exterior-grade primers, elastomeric/siliconized sealants, masking materials, and weather-resistant sundries.",
    ],
    exclusions: [
      "Elevations, outbuildings, fences, decks, gutters, foundations, or roofs not explicitly listed in the Project Scope.",
      "Carpentry replacement of rotted wood, siding boards, or structural framing unless itemized as a line item or change order.",
      "Full mechanical stripping to bare wood or lead-paint abatement unless specifically itemized.",
    ],
    warranty:
      "Editable example warranty: Workmanship is covered against peeling, blistering, or defective application on properly prepared vertical exterior substrates according to your contractor's stated warranty policy (horizontal walking decks and moisture intrusion excluded).",
    paymentTerms:
      "Editable example payment terms: The deposit listed in the Investment Summary reserves your exterior schedule window, with the remaining balance due upon final exterior walkthrough.",
  },
  cabinets: {
    kind: "cabinets",
    label: PROPOSAL_TEMPLATE_LABELS.cabinets,
    scopeOverview:
      "Supply labor, containment/masking protection, and specialty cabinet coatings to refinish the cabinet boxes, doors, drawer fronts, and built-in woodwork detailed in the Project Scope below.",
    preparation: [
      "Mask and protect countertops, backsplashes, appliances, floors, and cabinet interiors within the work area.",
      "Label and remove scheduled cabinet doors, drawer fronts, hinges, and hardware; reinstall after curing.",
      "Degrease and clean all scheduled cabinet boxes, doors, and drawer fronts to remove oils and household residue.",
      "Scuff-sand and degloss scheduled surfaces to create a uniform mechanical profile for primer adhesion.",
      "Apply stain-blocking bonding primer and fine-sand between coats before applying cabinet enamel finish coats.",
    ],
    materials: [
      "Apply the cabinet enamel or urethane coatings, sheens, and coat counts listed in the Project Scope.",
      "Provide specialty degreasers, bonding primers, fine abrasives, masking film, and precision application supplies.",
    ],
    exclusions: [
      "Interior cabinet shelving, inside of cabinet boxes, or drawer boxes unless explicitly listed in the Project Scope.",
      "New pulls, knobs, soft-close hinges, or carpentry modifications unless itemized.",
      "Heavy wood-grain filling (such as open-grain oak) to a glass-smooth finish unless specifically itemized as an upgrade.",
    ],
    warranty:
      "Editable example warranty: Workmanship is covered against peeling or adhesion failure under normal household use according to your contractor's stated warranty policy (impact chips, steam/water damage, and abrasive cleaners excluded).",
    paymentTerms:
      "Editable example payment terms: The deposit listed in the Investment Summary reserves your cabinet prep and finish dates, with the remaining balance due upon door reinstallation and walkthrough.",
  },
}

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
  kind: EstimateKind
  template: ResolvedProposalKindTemplate
  templates: Record<EstimateKind, ResolvedProposalKindTemplate>
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

export interface ScheduledProposalProduct {
  productName: string
  details: string[]
}

const MAX_TEXT = 4000
const MAX_SRC = 700_000

function normalizeKind(kind: EstimateKind | undefined): EstimateKind {
  if (kind === "exterior" || kind === "cabinets") return kind
  return "interior"
}

export function proposalKindTemplate(
  settings: EstimateSettings | undefined,
  kind: EstimateKind = "interior",
): ResolvedProposalKindTemplate {
  const safeKind = normalizeKind(kind)
  const fallback = DEFAULT_PROPOSAL_TEMPLATES[safeKind]
  const raw: ProposalKindTemplate | undefined = settings?.proposalPages?.templates?.[safeKind]
  return {
    kind: safeKind,
    label: fallback.label,
    scopeOverview: clip(raw?.scopeOverview, MAX_TEXT) || fallback.scopeOverview,
    preparation: listOf(raw?.preparation, fallback.preparation),
    materials: listOf(raw?.materials, fallback.materials),
    exclusions: listOf(raw?.exclusions, fallback.exclusions),
    warranty: clip(raw?.warranty, MAX_TEXT) || fallback.warranty,
    paymentTerms: clip(raw?.paymentTerms, MAX_TEXT) || fallback.paymentTerms,
  }
}

export function proposalDocument(
  settings: EstimateSettings | undefined,
  kind: EstimateKind = "interior",
): ResolvedProposalPages {
  const safeKind = normalizeKind(kind)
  const pages = settings?.proposalPages
  const templates: Record<EstimateKind, ResolvedProposalKindTemplate> = {
    interior: proposalKindTemplate(settings, "interior"),
    exterior: proposalKindTemplate(settings, "exterior"),
    cabinets: proposalKindTemplate(settings, "cabinets"),
  }
  return {
    kind: safeKind,
    template: templates[safeKind],
    templates,
    coverLine: clip(pages?.coverLine, 240),
    photos: photosOf(pages),
    testimonials: testimonialsOf(pages),
    contractTerms: termsOf(pages?.contractTerms),
    acceptWording: clip(pages?.acceptWording, 500) || DEFAULT_ACCEPT_WORDING,
    declineWording: clip(pages?.declineWording, 500) || DEFAULT_DECLINE_WORDING,
  }
}

export function scheduledProductsFromAreas(
  areas: ReadonlyArray<{
    name: string
    surfaces: ReadonlyArray<{
      hideFromCustomer?: boolean
      clientLabel: string
      productName: string
      coatCount: number
      showCoats?: boolean
    }>
  }>,
): ScheduledProposalProduct[] {
  const byProduct = new Map<string, string[]>()
  for (const area of areas) {
    for (const surface of area.surfaces) {
      if (surface.hideFromCustomer) continue
      const product = surface.productName.trim()
      if (!product || product.toLowerCase() === "prep") continue
      const coats = surface.showCoats !== false && surface.coatCount > 0 ? ` (${surface.coatCount} coats)` : ""
      const entry = `${area.name}: ${surface.clientLabel}${coats}`
      const existing = byProduct.get(product) ?? []
      if (!existing.includes(entry)) existing.push(entry)
      byProduct.set(product, existing)
    }
  }
  return [...byProduct.entries()].map(([productName, details]) => ({
    productName,
    details,
  }))
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

export function templateLinesText(lines: string[]): string {
  return lines.join("\n")
}

function listOf(value: string | undefined, fallback: string[]): string[] {
  const lines = clip(value, MAX_TEXT)
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
  return lines.length > 0 ? lines.slice(0, 40) : fallback
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
