import type { AreaInput, Client, Estimate, ProductionRate } from "@/lib/types"
import { quickRoom } from "@/lib/estimate/quick-room"
import type { LeadReach } from "@/lib/leads/office-lead"
import type { AddRoomAction, CreateLeadAction, AddCustomerNoteAction, ScheduleAppointmentAction, UpdateCrmRecordAction, GenerateDocumentAction, NavigateAction, VoiceAction } from "./voice-parser"

export interface VoiceExecutionContext {
  sessionRole?: string
  clients: Client[]
  estimates: Estimate[]
  productionRates?: ProductionRate[]
  createLead: (input: {
    name: string
    phone: string
    email: string
    address: string
    reachedBy: LeadReach
    service?: string
  }) => { ok: boolean; estimateId?: string; reason?: string }
  addEstimateNote?: (id: string, text: string) => void
  updateClient?: (id: string, patch: Partial<Client>) => void
  scheduleSalesVisit?: (id: string, date: string, time: string, address?: string) => void
  advanceSalesStage?: (id: string) => void
  navigate: (href: string) => void
  onAddRoom?: (room: AreaInput) => void
}

export interface VoiceExecutionResult {
  ok: boolean
  message: string
  redirect?: string
  roomAdded?: AreaInput
}

/**
 * Creates an AreaInput room object from a parsed AddRoomAction.
 */
export function buildAreaFromVoiceAction(action: AddRoomAction): AreaInput {
  const base = quickRoom(action.roomName, "interior") || {
    id: crypto.randomUUID(),
    name: action.roomName,
    areaType: "room" as const,
    lengthFt: 0,
    widthFt: 0,
    heightFt: 8,
    crewNote: "",
    surfaces: [],
  }

  const surfaces = action.surfaces.map((s) => ({
    id: crypto.randomUUID(),
    rateId: s.rateId,
    coatCount: s.coatCount,
    itemCount: s.rateId.includes("door") || s.rateId.includes("window") ? 1 : 0,
    quantityOverride: null,
    crewNote: "",
  }))

  const openings = action.openings.map((o) => ({
    id: crypto.randomUUID(),
    kind: o.kind,
    widthFt: 3,
    heightFt: o.kind === "door" ? 7 : 4,
    count: o.count,
    excludeFromWalls: true,
  }))

  return {
    ...base,
    id: crypto.randomUUID(),
    name: action.roomName,
    lengthFt: action.lengthFt,
    widthFt: action.widthFt,
    heightFt: action.heightFt > 0 ? action.heightFt : 8,
    surfaces: surfaces.length > 0 ? surfaces : base.surfaces,
    openings: openings.length > 0 ? openings : base.openings,
  }
}

/**
 * Executes a parsed voice action against the Scopepipe store and navigation.
 */
export function executeVoiceAction(action: VoiceAction, ctx: VoiceExecutionContext): VoiceExecutionResult {
  switch (action.type) {
    case "ADD_ROOM": {
      const room = buildAreaFromVoiceAction(action)
      if (ctx.onAddRoom) {
        ctx.onAddRoom(room)
        return {
          ok: true,
          message: `Added ${action.roomName} (${action.lengthFt}' × ${action.widthFt}') with ${action.surfaces.length} surfaces to current estimate.`,
          roomAdded: room,
        }
      }
      // If not in active estimator, navigate to estimator
      ctx.navigate("/estimate")
      return {
        ok: true,
        message: `Opening Estimator to add ${action.roomName} (${action.lengthFt}' × ${action.widthFt}').`,
        redirect: "/estimate",
        roomAdded: room,
      }
    }

    case "CREATE_LEAD": {
      const res = ctx.createLead({
        name: action.name,
        phone: action.phone || "",
        email: action.email || "",
        address: action.address || "",
        service: action.service || undefined,
        reachedBy: "call",
      })
      if (!res.ok) {
        return { ok: false, message: res.reason || "Failed to create lead." }
      }
      return {
        ok: true,
        message: `Lead for ${action.name} created successfully in Sales Pipeline.`,
        redirect: "/sales-pipeline",
      }
    }

    case "ADD_CUSTOMER_NOTE": {
      const targetLower = action.targetName.toLowerCase()
      const client = ctx.clients.find((c) => c.name.toLowerCase().includes(targetLower))
      const estimate = client ? ctx.estimates.find((e) => e.clientId === client.id) : undefined

      if (!estimate && !client) {
        return { ok: false, message: `Could not find customer matching "${action.targetName}".` }
      }

      if (estimate && ctx.addEstimateNote) {
        ctx.addEstimateNote(estimate.id, action.note)
      } else if (client && ctx.updateClient) {
        const currentNotes = client.notes || ""
        const updated = currentNotes.trim() ? `${currentNotes.trim()}\n${action.note}` : action.note
        ctx.updateClient(client.id, { notes: updated })
      }

      return {
        ok: true,
        message: `Note added to ${client?.name || action.targetName}: "${action.note}".`,
      }
    }

    case "SCHEDULE_APPOINTMENT": {
      const targetLower = action.clientName.toLowerCase()
      const client = ctx.clients.find((c) => c.name.toLowerCase().includes(targetLower))
      const estimate = client ? ctx.estimates.find((e) => e.clientId === client.id) : undefined

      if (!estimate) {
        return { ok: false, message: `Could not find estimate or lead for "${action.clientName}". Create a lead first.` }
      }

      if (ctx.scheduleSalesVisit) {
        ctx.scheduleSalesVisit(estimate.id, action.date, action.time, action.address)
      }

      return {
        ok: true,
        message: `Estimate visit scheduled with ${client?.name || action.clientName} on ${action.displayDateTime}.`,
      }
    }

    case "UPDATE_CRM_RECORD": {
      const targetLower = action.clientName.toLowerCase()
      const client = ctx.clients.find((c) => c.name.toLowerCase().includes(targetLower))
      const estimate = client ? ctx.estimates.find((e) => e.clientId === client.id) : undefined

      if (!estimate) {
        return { ok: false, message: `Could not find record for "${action.clientName}".` }
      }

      if (action.action === "advance_stage" && ctx.advanceSalesStage) {
        ctx.advanceSalesStage(estimate.id)
        return { ok: true, message: `Advanced pipeline stage for ${client?.name || action.clientName}.` }
      }

      return { ok: true, message: `Updated CRM record for ${client?.name || action.clientName}.` }
    }

    case "GENERATE_DOCUMENT": {
      if (action.documentType === "estimate") {
        ctx.navigate("/estimate")
        return { ok: true, message: "Opening Estimator to create a new proposal.", redirect: "/estimate" }
      }
      if (action.documentType === "work_order") {
        ctx.navigate("/work-orders")
        return { ok: true, message: "Opening Work Orders & Crew Sheets.", redirect: "/work-orders" }
      }
      if (action.documentType === "paint_list") {
        ctx.navigate("/estimate")
        return { ok: true, message: "Opening Materials Buy List.", redirect: "/estimate" }
      }
      return { ok: false, message: "Unknown document request." }
    }

    case "NAVIGATE": {
      // Role checking
      if (ctx.sessionRole === "estimator") {
        if (action.destination === "/payments" || action.destination === "/dispatch") {
          return {
            ok: false,
            message: "Estimator login is restricted to proposals, estimates, and daily sketches. Access to Invoices or Dispatch is not permitted.",
          }
        }
      }
      ctx.navigate(action.destination)
      return { ok: true, message: `Navigating to ${action.label}.`, redirect: action.destination }
    }

    case "DICTATE_TEXT": {
      return {
        ok: true,
        message: `Recognized: "${action.text}"`,
      }
    }
  }
}
