import type { EstimateQuote } from "../estimate/calculate.ts"
import { createWorkOrder } from "../work-orders/defaults.ts"
import type { ScopeState } from "../data/seed.ts"
import type { AreaInput, ChecklistItem, Client, ClientStatus, DispatchStatus, Estimate, LineItemInput, WorkOrder } from "../types.ts"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface EstimateSyncInput {
  companyId: string
  client: Pick<Client, "id" | "name" | "phone" | "email" | "address">
  estimate: Pick<Estimate, "id" | "title" | "clientStatus" | "areas">
  quote: Pick<EstimateQuote, "wallSqFt" | "paintGallons" | "allocatedHours" | "total">
  workOrder?: CloudWorkOrder | null
}

export interface CloudWorkOrder {
  estimateId: string
  prepNotes: string
  hourDisplay: WorkOrder["hourDisplay"]
  status: DispatchStatus
  assignedCrewId: string | null
  scheduledStartDate: string | null
  notifiedAt: string | null
  checklist: ChecklistItem[]
}

export interface CloudSnapshot {
  clients: Array<{
    id: string
    name: string | null
    email: string | null
    phone: string | null
    address: string | null
    created_at: string
  }>
  estimates: Array<{
    id: string
    client_id: string | null
    room_name: string | null
    length: number | string | null
    width: number | string | null
    height: number | string | null
    wall_sqft: number | string | null
    labor_hours: number | string | null
    gallons_needed: number | string | null
    total_price: number | string | null
    status: string | null
    created_at: string
  }>
  areas: Array<{
    id: string
    project_id: string | null
    name: string | null
    length: number | string | null
    width: number | string | null
    height: number | string | null
  }>
  workOrders: CloudWorkOrder[]
}

export interface ClientRow {
  id: string
  name: string
  email: string
  phone: string
  address: string
}

export interface EstimateRow {
  id: string
  client_id: string
  room_name: string
  length: number
  width: number
  height: number
  wall_sqft: number
  labor_hours: number
  gallons_needed: number
  total_price: number
  status: string
}

export interface AreaRow {
  id: string
  project_id: string
  name: string
  length: number
  width: number
  height: number
}

export interface EstimateSyncPayload {
  client: ClientRow
  estimate: EstimateRow
  areas: AreaRow[]
}

const lanes = new Map<string, Promise<void>>()

function configured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function lane(key: string, job: () => Promise<void>): Promise<void> {
  const previous = lanes.get(key) ?? Promise.resolve()
  const next = previous.then(job, job)
  lanes.set(key, next)
  return next
}

function amount(value: number, places: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  const scale = 10 ** places
  return Math.round(value * scale) / scale
}

/** Local ids such as est-jim-ab12 stay one remote row. UUIDs are already keys. */
export async function stableRemoteId(companyId: string, kind: string, id: string): Promise<string> {
  if (UUID_PATTERN.test(id)) return id.toLowerCase()
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(`scopepipe.${companyId}.${kind}.${id}`),
  )
  const bytes = new Uint8Array(digest).subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/**
 * The live estimates row stores one room's dimensions plus the whole-job
 * totals from calculateEstimate. Area square footage is generated in the
 * database from length, width, and height, so those columns are not written.
 */
export async function estimateSyncPayload(input: EstimateSyncInput): Promise<EstimateSyncPayload> {
  const primary = input.estimate.areas[0]
  const clientId = await stableRemoteId(input.companyId, "client", input.client.id)
  const estimateId = await stableRemoteId(input.companyId, "estimate", input.estimate.id)
  const areas = await Promise.all(input.estimate.areas.map((area) => areaRow(input.companyId, estimateId, area)))
  return {
    client: {
      id: clientId,
      name: input.client.name.trim() || "Client",
      email: input.client.email.trim(),
      phone: input.client.phone.trim(),
      address: input.client.address.trim(),
    },
    estimate: {
      id: estimateId,
      client_id: clientId,
      room_name: input.estimate.title.trim() || primary?.name.trim() || "Interior repaint",
      length: amount(primary?.lengthFt ?? 0, 2),
      width: amount(primary?.widthFt ?? 0, 2),
      height: amount(primary?.heightFt ?? 0, 2),
      wall_sqft: amount(input.quote.wallSqFt, 2),
      labor_hours: amount(input.quote.allocatedHours, 3),
      gallons_needed: amount(input.quote.paintGallons, 3),
      total_price: amount(input.quote.total, 2),
      status: input.estimate.clientStatus || "draft",
    },
    areas,
  }
}

async function areaRow(companyId: string, estimateId: string, area: AreaInput): Promise<AreaRow> {
  return {
    id: await stableRemoteId(companyId, `area.${estimateId}`, area.id),
    project_id: estimateId,
    name: area.name.trim() || "Area",
    length: amount(area.lengthFt, 2),
    width: amount(area.widthFt, 2),
    height: amount(area.heightFt, 2),
  }
}

const DISPATCH_STATUSES = new Set<DispatchStatus>(["unscheduled", "scheduled", "in_progress", "complete"])

export function cloudWorkOrder(order: WorkOrder): CloudWorkOrder {
  return {
    estimateId: order.estimateId,
    prepNotes: order.prepNotes,
    hourDisplay: order.hourDisplay,
    status: order.status,
    assignedCrewId: order.assignedCrewId,
    scheduledStartDate: order.scheduledStartDate,
    notifiedAt: order.notifiedAt,
    checklist: order.checklist.map((item) => ({ id: item.id, label: item.label, done: item.done })),
  }
}

function measure(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

function text(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

function asClientStatus(value: string | null): ClientStatus {
  if (value === "sent" || value === "accepted" || value === "declined") return value
  return "draft"
}

function importedLine(estimateId: string, total: number): LineItemInput {
  return {
    id: `${estimateId}-imported`,
    label: "Scope",
    clientNote: "",
    crewNote: "",
    mode: "custom",
    hours: 0,
    units: 0,
    pricePerUnit: 0,
    customPrice: total,
    workOrderHours: 0,
    hiddenOnWorkOrder: false,
    materials: [],
  }
}

function areaFromCloud(area: CloudSnapshot["areas"][number]): AreaInput | null {
  if (!area.id) return null
  return {
    id: area.id,
    name: text(area.name) || "Area",
    areaType: "room",
    lengthFt: measure(area.length),
    widthFt: measure(area.width),
    heightFt: measure(area.height),
    crewNote: "",
    surfaces: [],
  }
}

/**
 * Rows that already exist stay as saved. Cloud copies fill clients, estimates,
 * and work orders this book has not seen yet.
 */
export function mergeCloud(state: ScopeState, cloud: CloudSnapshot): { state: ScopeState; changed: boolean } {
  let changed = false
  const clients = [...state.clients]
  for (const row of cloud.clients) {
    if (!row.id || clients.some((client) => client.id === row.id)) continue
    const createdAt = row.created_at || new Date().toISOString()
    clients.push({
      id: row.id,
      name: text(row.name) || "Client",
      phone: text(row.phone),
      email: text(row.email),
      address: text(row.address),
      notes: "",
      createdAt,
      updatedAt: createdAt,
    })
    changed = true
  }

  const estimates = [...state.estimates]
  const stageId = state.stages.find((stage) => stage.slug === "lead")?.id ?? state.stages[0]?.id
  if (stageId) {
    for (const row of cloud.estimates) {
      if (!row.id || !row.client_id || estimates.some((estimate) => estimate.id === row.id)) continue
      if (!clients.some((client) => client.id === row.client_id)) {
        const createdAt = row.created_at || new Date().toISOString()
        clients.push({
          id: row.client_id,
          name: "Client",
          phone: "",
          email: "",
          address: "",
          notes: "",
          createdAt,
          updatedAt: createdAt,
        })
      }
      const roomsFromCloud = cloud.areas.flatMap((area) => {
        if (area.project_id !== row.id) return []
        const room = areaFromCloud(area)
        return room ? [room] : []
      })
      const rooms = roomsFromCloud.length > 0
        ? roomsFromCloud
        : measure(row.length) + measure(row.width) + measure(row.height) > 0
          ? [{
              id: `${row.id}-room`,
              name: text(row.room_name) || "Room",
              areaType: "room" as const,
              lengthFt: measure(row.length),
              widthFt: measure(row.width),
              heightFt: measure(row.height),
              crewNote: "",
              surfaces: [],
            }]
          : []
      const total = measure(row.total_price)
      const createdAt = row.created_at || new Date().toISOString()
      const client = clients.find((item) => item.id === row.client_id)
      estimates.push({
        id: row.id,
        clientId: row.client_id,
        stageId,
        title: text(row.room_name) || "Interior repaint",
        jobAddress: client?.address ?? "",
        areas: rooms,
        lineItems: total > 0 ? [importedLine(row.id, total)] : [],
        rates: state.productionRates,
        settings: state.estimateSettings,
        scheduledOn: null,
        notes: "",
        crewNote: "",
        acceptedAt: null,
        publicToken: row.id.replace(/-/g, "").slice(0, 12),
        clientStatus: asClientStatus(row.status),
        signature: null,
        paymentStatus: "unpaid",
        createdAt,
        updatedAt: createdAt,
      })
      changed = true
    }
  }

  const workOrders = [...state.workOrders]
  for (const row of cloud.workOrders) {
    if (!DISPATCH_STATUSES.has(row.status)) continue
    if (!estimates.some((estimate) => estimate.id === row.estimateId)) continue
    if (workOrders.some((order) => order.estimateId === row.estimateId)) continue
    const estimate = estimates.find((item) => item.id === row.estimateId)
    if (!estimate) continue
    const created = createWorkOrder(estimate)
    workOrders.push({
      ...created,
      prepNotes: row.prepNotes,
      hourDisplay: row.hourDisplay === "hide-item" || row.hourDisplay === "hide-all" ? row.hourDisplay : "all",
      status: row.status,
      assignedCrewId: row.assignedCrewId,
      scheduledStartDate: row.scheduledStartDate,
      notifiedAt: row.notifiedAt,
      checklist: row.checklist.length > 0 ? row.checklist : created.checklist,
    })
    changed = true
  }

  if (!changed) return { state, changed: false }
  return { state: { ...state, clients, estimates, workOrders }, changed: true }
}

async function postEstimate(input: EstimateSyncInput): Promise<void> {
  const payload = await estimateSyncPayload(input)
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload, workOrder: input.workOrder ?? null }),
  })
  if (!response.ok) throw new Error("Supabase did not take this estimate.")
}

export function syncSavedEstimate(input: EstimateSyncInput): Promise<void> {
  if (!configured()) return Promise.resolve()
  return lane(`${input.companyId}:${input.estimate.id}`, () => postEstimate(input))
}

export function deleteSyncedEstimate(companyId: string, estimateId: string): Promise<void> {
  if (!configured()) return Promise.resolve()
  return lane(`${companyId}:${estimateId}`, async () => {
    const remoteId = await stableRemoteId(companyId, "estimate", estimateId)
    const response = await fetch(`/api/sync?estimateId=${encodeURIComponent(remoteId)}`, { method: "DELETE" })
    if (!response.ok) throw new Error("Supabase did not remove this estimate.")
  })
}

export async function pullCloud(): Promise<CloudSnapshot | null> {
  if (!configured()) return null
  const response = await fetch("/api/sync")
  if (!response.ok) return null
  const body = (await response.json()) as CloudSnapshot
  if (!Array.isArray(body.clients) || !Array.isArray(body.estimates) || !Array.isArray(body.areas)) return null
  return {
    clients: body.clients,
    estimates: body.estimates,
    areas: body.areas,
    workOrders: Array.isArray(body.workOrders) ? body.workOrders : [],
  }
}
