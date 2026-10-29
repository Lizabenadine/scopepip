import type { FollowUpEnrollment, FollowUpMessage } from "./follow-ups/types.ts"

export const STAGE_SLUGS = [
  "lead",
  "estimate_sent",
  "scheduled",
  "completed",
] as const

export type StageSlug = (typeof STAGE_SLUGS)[number]

export type RateBasis =
  | "sqft_per_hour"
  | "lnft_per_hour"
  | "hours_per_item"
  | "dollars_per_sqft"
  | "dollars_per_lnft"
  | "dollars_per_item"

export type SurfaceMeasure =
  | "walls"
  | "ceiling"
  | "trim"
  | "items"
  | "siding"
  | "fascia"
  | "soffit"
  | "shutters"
  | "deck"
  | "crown"
  | "wainscot"
  | "accent"
export type AreaType = "room" | "surface"
export type EstimateKind = "interior" | "exterior" | "cabinets"
export type HourRounding = 0 | 0.25 | 0.5 | 1
export type PriceRounding = "none" | "nearest" | "up"
export type LinePricingMode = "hourly" | "quantity" | "custom"
export type LineItemType = "wall" | "ceiling" | "trim" | "cabinet_door" | "door" | "prep"
export type PrepLevel = "none" | "light" | "medium" | "heavy"
export type TaxBasis = "materials_only" | "total_job"

/** Production rate or unit price for that many full coats. */
export interface CoatRate {
  coats: number
  value: number
}

export interface ProductionRate {
  id: string
  category: string
  internalLabel: string
  clientLabel: string
  basis: RateBasis
  measure: SurfaceMeasure
  coatRates: CoatRate[]
  /** sqft/gal, lnft/gal, or gal/item, entered for one coat. */
  coveragePerCoat: number
  primerRate: number
  primerCoveragePerCoat: number
  productName: string
  productCostPerGallon: number
  clientDescription: string
  crewNote: string
  hideFromCustomer: boolean
  showCoats: boolean
  showPrice: boolean
  customHourlyRate: number | null
  /** Empty uses the rate's category. A rate can belong to more than one type. */
  estimateKinds?: EstimateKind[]
  /** True prices this estimate only. The company rate book never receives it. */
  oneOff?: boolean
}

export interface PaymentMethod {
  id: string
  label: string
  surchargePercent: number
}

export interface EstimateSettings {
  hourlyRate: number
  /** Company rate before a type override. Missing uses hourlyRate. */
  generalHourlyRate?: number
  /** Blank type uses the general hourly rate. */
  typeHourlyRates?: Partial<Record<EstimateKind, number>>
  hourRounding: HourRounding
  priceRounding: PriceRounding
  materialRounding: PriceRounding
  taxPercent: number
  discountKind: "percent" | "amount"
  discountValue: number
  paymentMethodId: string
  surchargePercent: number
  expiryDays: number
  materialMarkup: number
  taxBasis: TaxBasis
  minimumJobCharge: number
  depositPercent: number
  /** Blank uses the ScopePipe fallback. */
  companyName?: string
  companyEmail?: string
  /** Number customers text. Blank until the office saves one. */
  businessPhone?: string
  /** Missing means the proposal shows a payment estimate. */
  financingEnabled?: boolean
  /** Annual percentage rate. Missing uses 9.99. */
  financingApr?: number
  /** Term in months. Missing uses 12. */
  financingMonths?: number
  financingLender?: string
  financingApplyUrl?: string
  /** Cover, photos, testimonials, contract, and signature wording. Missing uses the built-in pages. */
  proposalPages?: ProposalPages
  zapierWebhookUrl?: string
  /** Zapier ignores events that happened before this instant. */
  zapierSince?: string
  calendarFeedToken?: string
}

export type DepositMethod = "card" | "apple_pay" | "google_pay"
export type PaymentStatus = "unpaid" | "deposit_paid"

export interface DepositReceipt {
  paymentIntentId: string
  amount: number
  currency: "usd"
  depositPercent: number
  method: DepositMethod
  paidAt: string
}

/** Company speeds. Area hours are quantity ÷ production rate. Doors and cabinet doors are hours each. */
export interface RateCard {
  wallSqFtPerHour: number
  ceilingSqFtPerHour: number
  trimLnFtPerHour: number
  doorHours: number
  cabinetDoorHours: number
  sqFtPerGallon: number
  primerSqFtPerHour: number
  primerSqFtPerGallon: number
  secondCoatLaborFactor: number
  laborRatePerHour: number
  materialMarkup: number
  costPerGallon: number
  minimumJobCharge: number
}

export interface AreaScope {
  id: string
  name: string
  lengthFt: number
  widthFt: number
  heightFt: number
  coatCount: number
  primerCoats: number
  doorCount: number
  cabinetDoorCount: number
  prepLevel: PrepLevel
  prepHours: number | null
  accessFactor: number
}

export interface EstimateLineItem {
  id: string
  lineItemType: LineItemType
  label: string
  quantity: number
  coatCount: number
  productionRate: number
  allocatedHours: number
  paintGallons: number
  laborCost: number
  materialCost: number
}

export interface EstimateCalculationResult {
  wallSqFt: number
  ceilingSqFt: number
  trimLnFt: number
  paintGallons: number
  allocatedHours: number
  laborCost: number
  materialCost: number
  totalPrice: number
  grossProfit: number
  grossProfitMargin: number
  laborCostPerSqFt: number
  lineItems: EstimateLineItem[]
}

export interface SurfaceInput {
  id: string
  rateId: string
  coatCount: number
  itemCount: number
  quantityOverride: number | null
  hoursOverride?: number | null
  hideFromCustomer?: boolean
  crewNote: string
  primerCoats?: number
  finishCoats?: number
}

/** A named section of rooms, such as Upstairs or Front of the house. */
export interface AreaGroup {
  id: string
  name: string
}

export interface AreaInput {
  id: string
  name: string
  areaType: AreaType
  lengthFt: number
  widthFt: number
  heightFt: number
  crewNote: string
  surfaces: SurfaceInput[]
  prepLevel?: PrepLevel
  prepHours?: number | null
  accessFactor?: number
  /** Missing means the area is not in a group. */
  groupId?: string
}

export interface LineMaterial {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

export interface LineItemInput {
  id: string
  label: string
  clientNote: string
  crewNote: string
  mode: LinePricingMode
  hours: number
  units: number
  pricePerUnit: number
  customPrice: number
  workOrderHours: number
  hiddenOnWorkOrder: boolean
  materials: LineMaterial[]
  optional?: boolean
  selected?: boolean
  /** Held off the invoice until the customer signs it. A negative price becomes a credit. */
  pending?: boolean
}

export type ClientStatus = "draft" | "sent" | "accepted" | "declined"

export interface ProposalPhoto {
  id: string
  caption: string
  src: string
}

export interface ProposalTestimonial {
  id: string
  quote: string
  name: string
  detail: string
}

/** Company pages around the quote. Blank contract or wording uses the built-in text. */
export interface ProposalPages {
  coverLine?: string
  photos?: ProposalPhoto[]
  testimonials?: ProposalTestimonial[]
  contractTerms?: string
  acceptWording?: string
  declineWording?: string
}

export const INBOUND_LEAD_SOURCES = ["website", "thumbtack", "angi", "google_lsa", "facebook"] as const

export type InboundLeadSource = (typeof INBOUND_LEAD_SOURCES)[number]

export const LEAD_SOURCES = [
  "website",
  "thumbtack",
  "angi",
  "google_lsa",
  "facebook",
  "yelp",
  "google",
  "referral",
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

export const SALES_STAGES = [
  "cold",
  "warm",
  "estimate_requested",
  "estimate_scheduled",
  "proposal_sent",
] as const

export type SalesStage = (typeof SALES_STAGES)[number]

export const JOB_PIPELINE_STAGES = [
  "project_accepted",
  "project_scheduled",
  "project_in_progress",
  "project_completed",
] as const

export type JobPipelineStage = (typeof JOB_PIPELINE_STAGES)[number]

export interface CustomColumn {
  id: string
  kind: "sales" | "jobs"
  label: string
  /** Built-in column this one sits after. Blank places it at the end. */
  after: string
}

export interface ClientSignature {
  signedName: string
  signaturePayload: string
  signedAt: string
  selectedLineIds: string[]
}

export interface PipelineStage {
  id: string
  slug: StageSlug
  name: string
  sortOrder: number
}

export interface TextMessage {
  id: string
  direction: "in" | "out"
  body: string
  mediaUrls: string[]
  createdAt: string
  estimateId: string | null
  from?: string
  delivery: "sent" | "logged" | "received" | "failed"
}

export interface StageChange {
  id: string
  at: string
  label: string
}

export interface ProposalOpen {
  id: string
  at: string
  kind: "open" | "revisit"
}

export interface NoteEntry {
  id: string
  at: string
  body: string
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  address: string
  notes: string
  createdAt: string
  updatedAt: string
  messages?: TextMessage[]
}

/** Production inputs plus the rate snapshot used to price them. */
export interface Estimate {
  id: string
  clientId: string
  stageId: string
  title: string
  jobAddress: string
  /** Missing estimates stay interior. */
  estimateKind?: EstimateKind
  areas: AreaInput[]
  /** Missing means every area is ungrouped. */
  areaGroups?: AreaGroup[]
  lineItems: LineItemInput[]
  rates: ProductionRate[]
  settings: EstimateSettings
  scheduledOn: string | null
  notes: string
  crewNote: string
  acceptedAt: string | null
  /** Set when the customer declines. Missing means the proposal is still open. */
  declinedAt?: string | null
  publicToken: string
  clientStatus: ClientStatus
  signature: ClientSignature | null
  paymentStatus?: PaymentStatus
  depositReceipt?: DepositReceipt | null
  leadSource?: LeadSource | null
  inboundLeadId?: string | null
  tags?: string[]
  salesperson?: string
  salesStage?: SalesStage | null
  /** When set, the card sits in that office column instead of the stage column. */
  boardColumnId?: string | null
  archived?: boolean
  /** Day of the estimate visit, YYYY-MM-DD. */
  estimateVisitOn?: string | null
  /** UTC ISO instant of the visit start, built from the local day and HH:MM at booking. */
  estimateVisitAt?: string | null
  followUp?: FollowUpEnrollment | null
  followUpLog?: FollowUpMessage[]
  stageChanges?: StageChange[]
  proposalOpens?: ProposalOpen[]
  noteLog?: NoteEntry[]
  changeOrders?: ChangeOrder[]
  /** Signed reductions. Each amount is positive and comes off the balance. */
  credits?: JobCredit[]
  quickbooksInvoiceId?: string
  quickbooksSyncedAt?: string
  googleEventId?: string
  createdAt: string
  updatedAt: string
}

export interface ChangeOrderItem {
  id: string
  label: string
  amount: number
}

/** A signed reduction. QuickBooks receives the amount as a credit memo. */
export interface JobCredit {
  id: string
  label: string
  amount: number
  clientSignatureUrl: string
  createdAt: string
  quickbooksCreditId?: string
}

/** Signed extra work. The amount is a custom line on the estimate, so the invoice reprices through calculateEstimate. */
export interface ChangeOrder {
  id: string
  estimateId: string
  items: ChangeOrderItem[]
  subtotal: number
  clientSignatureUrl: string
  createdAt: string
}

export interface EstimateDraft {
  id: string | null
  clientId: string | null
  clientName: string
  stageId: string
  title: string
  jobAddress: string
  estimateKind?: EstimateKind
  areas: AreaInput[]
  areaGroups?: AreaGroup[]
  lineItems: LineItemInput[]
  rates: ProductionRate[]
  settings: EstimateSettings
  scheduledOn: string | null
  notes: string
  crewNote: string
  acceptedAt: string | null
  publicToken: string
  clientStatus: ClientStatus
  signature: ClientSignature | null
  paymentStatus?: PaymentStatus
  depositReceipt?: DepositReceipt | null
  createdAt: string | null
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export const PHOTO_TAGS = ["before", "in_progress", "after", "prep_concern", "touch_up"] as const

export type PhotoTag = (typeof PHOTO_TAGS)[number]

export type PhotoLinkKind = "area" | "line" | "prep"

export interface SitePhoto {
  id: string
  estimateId: string
  caption: string
  tag: PhotoTag
  linkKind: PhotoLinkKind | null
  linkId: string | null
  storagePath: string
  url: string
  createdAt: string
}

export type DispatchStatus = "unscheduled" | "scheduled" | "in_progress" | "complete"

export interface CrewLead {
  id: string
  name: string
  phone: string
  color: string
}

/** Field packet. Holds no prices. */
export interface WorkOrder {
  estimateId: string
  prepNotes: string
  hourDisplay: "all" | "hide-item" | "hide-all"
  checklist: ChecklistItem[]
  photos: SitePhoto[]
  status: DispatchStatus
  assignedCrewId: string | null
  scheduledStartDate: string | null
  notifiedAt: string | null
  subSignature?: string
  subSignedDate?: string
  companyCamUrl?: string
  companyCamProjectId?: string
  companyCamProjectUrl?: string
  companyCamSyncedAt?: string
  googleEventId?: string
  exclusions?: string[]
}
