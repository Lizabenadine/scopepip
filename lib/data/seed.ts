import {
  DEFAULT_ESTIMATE_SETTINGS,
  DEFAULT_PRODUCTION_RATES,
  documentedBedroom,
} from "../defaults.ts"
import { createWorkOrder } from "../work-orders/defaults.ts"
import type { FollowUpSequence } from "../follow-ups/types.ts"
import type {
  AreaInput,
  Client,
  CrewLead,
  CustomColumn,
  Estimate,
  EstimateSettings,
  LeadSource,
  LineItemInput,
  PaymentMethod,
  PipelineStage,
  ProductionRate,
  SalesStage,
  TextMessage,
  WorkOrder,
} from "../types.ts"
import { PAYMENT_METHODS } from "../defaults.ts"
import type { AreaName } from "../estimate/area-names.ts"
import type { SavedEstimateTemplate } from "../estimate/saved-templates.ts"

export const SCOPE_VERSION = 9 as const

export interface ScopeState {
  version: typeof SCOPE_VERSION
  clients: Client[]
  stages: PipelineStage[]
  estimates: Estimate[]
  workOrders: WorkOrder[]
  crews: CrewLead[]
  productionRates: ProductionRate[]
  estimateSettings: EstimateSettings
  paymentMethods: PaymentMethod[]
  followUpSequences?: FollowUpSequence[]
  unmatchedTexts?: TextMessage[]
  zapierDelivered?: string[]
  customColumns?: CustomColumn[]
  /** Labels for the built-in stage columns. The stage id stays put. */
  columnLabels?: Record<string, string>
  /** Company templates. Surfaces keep rate ids, so the current production rate prices them. */
  savedTemplates?: SavedEstimateTemplate[]
  /** Reusable area labels. Missing uses the starter list. */
  areaNames?: AreaName[]
}

export const CREWS: CrewLead[] = [
  { id: "crew-north", name: "Avery Cole", phone: "(503) 555-0101", color: "#dbeafe" },
  { id: "crew-south", name: "Priya Shah", phone: "(503) 555-0144", color: "#fde68a" },
  { id: "crew-east", name: "Luis Ortega", phone: "(971) 555-0166", color: "#bbf7d0" },
]

export const STAGES: PipelineStage[] = [
  { id: "stage-lead", slug: "lead", name: "Lead", sortOrder: 0 },
  { id: "stage-sent", slug: "estimate_sent", name: "Estimate Sent", sortOrder: 1 },
  { id: "stage-scheduled", slug: "scheduled", name: "Scheduled", sortOrder: 2 },
  { id: "stage-completed", slug: "completed", name: "Completed", sortOrder: 3 },
]

function client(
  id: string,
  name: string,
  phone: string,
  email: string,
  address: string,
  createdAt: string,
): Client {
  return { id, name, phone, email, address, notes: "", createdAt, updatedAt: createdAt }
}

function room(
  id: string,
  name: string,
  lengthFt: number,
  widthFt: number,
  heightFt: number,
  surfaceIds: string[],
): AreaInput {
  const bedroom = documentedBedroom()
  return {
    id,
    name,
    areaType: "room",
    lengthFt,
    widthFt,
    heightFt,
    crewNote: "",
    surfaces: bedroom.surfaces
      .filter((surface) => surfaceIds.includes(surface.rateId))
      .map((surface) => ({ ...surface, id: `${id}-${surface.rateId}` })),
  }
}

function estimate(
  input: Omit<Estimate, "rates" | "settings"> & {
    rates?: ProductionRate[]
    settings?: EstimateSettings
  },
): Estimate {
  return {
    rates: DEFAULT_PRODUCTION_RATES.map((rate) => ({ ...rate, coatRates: [...rate.coatRates] })),
    settings: { ...DEFAULT_ESTIMATE_SETTINGS },
    ...input,
  }
}

const materials: LineItemInput = {
  id: "materials",
  label: "Materials",
  clientNote: "Paint and sundries for this room.",
  crewNote: "",
  mode: "custom",
  hours: 0,
  units: 0,
  pricePerUnit: 0,
  customPrice: 155.71,
  workOrderHours: 0,
  hiddenOnWorkOrder: false,
  materials: [],
}

export function createSeedState(): ScopeState {
  const clients = [
    client("client-maya", "Maya Chen", "(503) 555-0148", "maya@birchstudio.test", "1842 Birch St, Portland", "2026-09-28T15:00:00.000Z"),
    client("client-ortiz", "Ortiz Property Group", "(503) 555-0190", "units@ortizpg.test", "900 Harbor Ave, Portland", "2026-09-20T15:00:00.000Z"),
    client("client-lena", "Lena Brooks", "(971) 555-0162", "lena.brooks@email.test", "22 Cedar Court, Lake Oswego", "2026-09-12T15:00:00.000Z"),
    client("client-jim", "Jim Patel", "(503) 555-0177", "jim@patel.test", "410 Elm Street, Portland", "2026-08-30T15:00:00.000Z"),
    client("client-dental", "Harbor Dental", "(503) 555-0133", "office@harbordental.test", "18 Market Street, Portland", "2026-09-26T15:00:00.000Z"),
    client("client-rosa", "Rosa Nguyen", "(971) 555-0114", "rosa.nguyen@email.test", "77 Alder Lane, Portland", "2026-10-01T15:00:00.000Z"),
    client("client-sam", "Sam Whitaker", "(503) 555-0188", "sam@whitaker.test", "5 Oak Street, Portland", "2026-06-01T15:00:00.000Z"),
    client("client-wade", "Wade Ellis", "(971) 555-0194", "wade.ellis@email.test", "640 Division St, Portland", "2026-09-30T15:00:00.000Z"),
    client("client-nina", "Nina Alvarez", "(503) 555-0120", "nina.alvarez@email.test", "88 Belmont Ave, Portland", "2026-10-01T15:00:00.000Z"),
    client("client-cole", "Cole Brennan", "(503) 555-0155", "cole.brennan@email.test", "12 Hawthorne Blvd, Portland", "2026-09-27T15:00:00.000Z"),
  ]
  const estimates = [
    estimate({
      id: "est-jim",
      clientId: "client-jim",
      stageId: "stage-completed",
      title: "Primary bedroom",
      jobAddress: "410 Elm Street, Portland",
      areas: [{ ...documentedBedroom(), id: "jim-bedroom" }],
      lineItems: [{ ...materials, id: "jim-materials" }],
      scheduledOn: "2026-09-18",
      notes: "Two coats. No patching.",
      crewNote: "Skip the closet ceiling.",
      acceptedAt: "2026-09-04T15:00:00.000Z",
      publicToken: "a4c8e1b7d092",
      clientStatus: "accepted",
      signature: {
        signedName: "Jim Patel",
        signaturePayload: "typed:Jim Patel",
        signedAt: "2026-09-04T15:00:00.000Z",
        selectedLineIds: ["jim-materials"],
      },
      createdAt: "2026-09-02T15:00:00.000Z",
      updatedAt: "2026-09-18T23:00:00.000Z",
    }),
    estimate({
      id: "est-maya",
      clientId: "client-maya",
      stageId: "stage-lead",
      title: "Main floor",
      jobAddress: "1842 Birch St, Portland",
      areas: [room("maya-living", "Living room", 18, 14, 9, ["walls", "ceiling", "baseboards"])],
      lineItems: [],
      scheduledOn: null,
      notes: "Ceilings stay eggshell.",
      crewNote: "",
      acceptedAt: null,
      publicToken: "b19f6d3e8c45",
      clientStatus: "draft",
      signature: null,
      createdAt: "2026-09-28T16:10:00.000Z",
      updatedAt: "2026-10-01T18:00:00.000Z",
    }),
    estimate({
      id: "est-rosa",
      clientId: "client-rosa",
      stageId: "stage-scheduled",
      title: "Hall wall",
      jobAddress: "77 Alder Lane, Portland",
      areas: [
        {
          id: "rosa-hall",
          name: "Hall wall",
          areaType: "surface",
          lengthFt: 16,
          widthFt: 0,
          heightFt: 9,
          crewNote: "",
          surfaces: room("rosa-hall", "Hall wall", 16, 0, 9, ["walls"]).surfaces,
        },
      ],
      lineItems: [],
      scheduledOn: "2026-10-02",
      notes: "",
      crewNote: "",
      acceptedAt: "2026-10-02T14:00:00.000Z",
      publicToken: "e6a2c0d58f71",
      clientStatus: "accepted",
      signature: {
        signedName: "Rosa Nguyen",
        signaturePayload: "typed:Rosa Nguyen",
        signedAt: "2026-10-02T14:00:00.000Z",
        selectedLineIds: [],
      },
      createdAt: "2026-10-01T19:20:00.000Z",
      updatedAt: "2026-10-02T14:00:00.000Z",
    }),
    estimate({
      id: "est-ortiz",
      clientId: "client-ortiz",
      stageId: "stage-sent",
      title: "Unit 4 turnover",
      jobAddress: "900 Harbor Ave #4, Portland",
      areas: [room("ortiz-unit", "Unit 4", 22, 18, 8, ["walls", "baseboards", "door-frame"])],
      lineItems: [
        {
          id: "ortiz-trim",
          label: "Trim package",
          clientNote: "Baseboards, casings, and doors painted in a semi-gloss enamel.",
          crewNote: "Semi-gloss enamel on all trim.",
          mode: "custom",
          hours: 0,
          units: 0,
          pricePerUnit: 0,
          customPrice: 240,
          workOrderHours: 3,
          hiddenOnWorkOrder: false,
          materials: [],
          optional: true,
          selected: true,
        },
        {
          id: "ortiz-wash",
          label: "Pressure washing",
          clientNote: "Wash the exterior entry, walkway, and siding before paint.",
          crewNote: "Wash the entry and walk before setup.",
          mode: "custom",
          hours: 0,
          units: 0,
          pricePerUnit: 0,
          customPrice: 180,
          workOrderHours: 2,
          hiddenOnWorkOrder: false,
          materials: [],
          optional: true,
          selected: true,
        },
        {
          id: "ortiz-accent",
          label: "Accent wall",
          clientNote: "One accent wall in a deeper color, two finish coats.",
          crewNote: "Accent wall: two finish coats.",
          mode: "custom",
          hours: 0,
          units: 0,
          pricePerUnit: 0,
          customPrice: 185,
          workOrderHours: 2,
          hiddenOnWorkOrder: false,
          materials: [],
          optional: true,
          selected: false,
        },
      ],
      scheduledOn: null,
      notes: "Vacant. Keys in the lockbox.",
      crewNote: "Lockbox code is on the estimator note.",
      acceptedAt: null,
      publicToken: "k7m2p9qx4n",
      clientStatus: "sent",
      signature: null,
      createdAt: "2026-09-22T17:00:00.000Z",
      updatedAt: "2026-09-29T16:30:00.000Z",
    }),
    estimate({
      id: "est-dental",
      clientId: "client-dental",
      stageId: "stage-sent",
      title: "Waiting room",
      jobAddress: "18 Market Street, Portland",
      areas: [room("dental-wait", "Waiting room", 20, 16, 10, ["walls", "ceiling"])],
      lineItems: [],
      scheduledOn: null,
      notes: "After hours only.",
      crewNote: "Enter from the alley.",
      acceptedAt: "2026-09-30T15:10:00.000Z",
      publicToken: "d3f7a1c64e80",
      clientStatus: "accepted",
      signature: {
        signedName: "Harbor Dental",
        signaturePayload: "typed:Harbor Dental",
        signedAt: "2026-09-30T15:10:00.000Z",
        selectedLineIds: [],
      },
      createdAt: "2026-09-26T20:00:00.000Z",
      updatedAt: "2026-09-30T15:10:00.000Z",
    }),
    estimate({
      id: "est-lena",
      clientId: "client-lena",
      stageId: "stage-scheduled",
      title: "Whole interior",
      jobAddress: "22 Cedar Court, Lake Oswego",
      areas: [
        room("lena-bed", "Primary bedroom", 12, 15, 8, ["walls", "ceiling", "baseboards", "window-frames", "door-frame"]),
        room("lena-living", "Living room", 20, 16, 9, ["walls", "baseboards"]),
      ],
      lineItems: [],
      scheduledOn: "2026-10-08",
      notes: "House empty Wednesday through Friday.",
      crewNote: "Skip ceilings in the living room.",
      acceptedAt: "2026-09-20T18:00:00.000Z",
      publicToken: "f0c5b8e21a67",
      clientStatus: "accepted",
      signature: {
        signedName: "Lena Brooks",
        signaturePayload: "typed:Lena Brooks",
        signedAt: "2026-09-20T18:00:00.000Z",
        selectedLineIds: [],
      },
      createdAt: "2026-09-14T18:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    }),
    estimate({
      id: "est-sam",
      clientId: "client-sam",
      stageId: "stage-lead",
      title: "Exterior trim",
      jobAddress: "5 Oak Street, Portland",
      areas: [room("sam-trim", "Front trim", 12, 0, 8, ["baseboards"])],
      lineItems: [],
      scheduledOn: null,
      notes: "",
      crewNote: "",
      acceptedAt: null,
      publicToken: "s1a0m9w7h3",
      clientStatus: "draft",
      signature: null,
      createdAt: "2026-06-01T16:00:00.000Z",
      updatedAt: "2026-06-01T16:00:00.000Z",
    }),
    estimate({
      id: "est-wade",
      clientId: "client-wade",
      stageId: "stage-lead",
      title: "Dining room",
      jobAddress: "640 Division St, Portland",
      areas: [room("wade-dining", "Dining room", 14, 12, 9, ["walls"])],
      lineItems: [],
      scheduledOn: null,
      notes: "",
      crewNote: "",
      acceptedAt: null,
      publicToken: "w4e2d8e1l5",
      clientStatus: "draft",
      signature: null,
      createdAt: "2026-09-30T18:00:00.000Z",
      updatedAt: "2026-10-01T15:00:00.000Z",
    }),
    estimate({
      id: "est-nina",
      clientId: "client-nina",
      stageId: "stage-lead",
      title: "Kitchen and bath",
      jobAddress: "88 Belmont Ave, Portland",
      areas: [room("nina-kitchen", "Kitchen", 12, 10, 8, ["walls", "ceiling"])],
      lineItems: [],
      scheduledOn: null,
      notes: "Wants a walkthrough before a number.",
      crewNote: "",
      acceptedAt: null,
      publicToken: "n6i3a1v0z8",
      clientStatus: "draft",
      signature: null,
      createdAt: "2026-10-01T17:00:00.000Z",
      updatedAt: "2026-10-02T11:00:00.000Z",
    }),
    estimate({
      id: "est-cole",
      clientId: "client-cole",
      stageId: "stage-lead",
      title: "Office repaint",
      jobAddress: "12 Hawthorne Blvd, Portland",
      areas: [room("cole-office", "Office", 16, 12, 9, ["walls", "baseboards"])],
      lineItems: [],
      scheduledOn: null,
      notes: "On site Thursday morning.",
      crewNote: "",
      acceptedAt: null,
      publicToken: "c5o2l7b4r9",
      clientStatus: "draft",
      signature: null,
      createdAt: "2026-09-27T16:00:00.000Z",
      updatedAt: "2026-10-01T09:00:00.000Z",
    }),
  ]
  const withSales = estimates.map((item) => ({ ...item, ...(SALES_META[item.id] ?? {}) }))
  return {
    version: SCOPE_VERSION,
    productionRates: DEFAULT_PRODUCTION_RATES.map((rate) => ({
      ...rate,
      coatRates: rate.coatRates.map((entry) => ({ ...entry })),
    })),
    estimateSettings: { ...DEFAULT_ESTIMATE_SETTINGS },
    paymentMethods: PAYMENT_METHODS.map((method) => ({ ...method })),
    stages: STAGES.map((stage) => ({ ...stage })),
    crews: CREWS.map((crew) => ({ ...crew })),
    clients,
    estimates: withSales,
    workOrders: withSales.map((item) => seedDispatch(item, createWorkOrder(item))),
  }
}

function salesMeta(
  leadSource: LeadSource,
  salesperson: string,
  salesStage: SalesStage | null,
  tags: string[] = [],
): Pick<Estimate, "leadSource" | "salesperson" | "salesStage" | "tags"> {
  return { leadSource, salesperson, salesStage, tags }
}

const SALES_META: Record<string, ReturnType<typeof salesMeta>> = {
  "est-maya": salesMeta("thumbtack", "Jordan Hale", "cold", ["Below min."]),
  "est-sam": salesMeta("google", "Riley Cho", "cold"),
  "est-wade": salesMeta("google", "Jordan Hale", "warm", ["Not a lead"]),
  "est-nina": salesMeta("yelp", "Riley Cho", "estimate_requested"),
  "est-cole": salesMeta("thumbtack", "Jordan Hale", "estimate_scheduled"),
  "est-ortiz": salesMeta("yelp", "Riley Cho", "proposal_sent"),
  "est-dental": salesMeta("google", "Riley Cho", null),
  "est-lena": salesMeta("thumbtack", "Jordan Hale", null),
  "est-rosa": salesMeta("yelp", "Jordan Hale", null),
  "est-jim": salesMeta("referral", "Riley Cho", null),
}

function seedDispatch(estimate: Estimate, order: WorkOrder): WorkOrder {
  if (estimate.id === "est-jim") {
    return {
      ...order,
      status: "complete",
      assignedCrewId: "crew-north",
      scheduledStartDate: "2026-09-18",
      notifiedAt: "2026-09-17T15:00:00.000Z",
    }
  }
  if (estimate.id === "est-lena") {
    return {
      ...order,
      status: "scheduled",
      assignedCrewId: "crew-south",
      scheduledStartDate: "2026-10-08",
      notifiedAt: "2026-10-01T12:00:00.000Z",
    }
  }
  if (estimate.id === "est-rosa") {
    return {
      ...order,
      status: "in_progress",
      assignedCrewId: "crew-east",
      scheduledStartDate: "2026-10-02",
      notifiedAt: "2026-10-02T14:00:00.000Z",
    }
  }
  return order
}

export function isScopeState(value: unknown): value is ScopeState {
  if (!value || typeof value !== "object") return false
  const state = value as ScopeState
  return (
    state.version === SCOPE_VERSION &&
    Array.isArray(state.clients) &&
    Array.isArray(state.stages) &&
    Array.isArray(state.estimates) &&
    Array.isArray(state.workOrders) &&
    Array.isArray(state.crews) &&
    Array.isArray(state.productionRates) &&
    typeof state.estimateSettings?.hourlyRate === "number" &&
    Array.isArray(state.paymentMethods) &&
    (state.savedTemplates === undefined || Array.isArray(state.savedTemplates)) &&
    (state.areaNames === undefined || Array.isArray(state.areaNames))
  )
}
