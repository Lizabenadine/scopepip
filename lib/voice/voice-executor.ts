import type { AreaInput, Client, Estimate, ProductionRate } from "@/lib/types"
import { quickRoom } from "@/lib/estimate/quick-room"
import type { LeadReach } from "@/lib/leads/office-lead"
import type {
  AddRoomAction,
  UpdateRoomAction,
  AddJobNoteAction,
  CreateLeadAction,
  AddCustomerNoteAction,
  ScheduleAppointmentAction,
  UpdateCrmRecordAction,
  GenerateDocumentAction,
  NavigateAction,
  VoiceAction,
} from "./voice-parser"

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
  onUpdateRoom?: (update: UpdateRoomAction) => { updated: boolean; message?: string }
  onAddJobNote?: (note: AddJobNoteAction) => { ok: boolean; message?: string }
}

export interface VoiceExecutionResult {
  ok: boolean
  message: string
  redirect?: string
  roomAdded?: AreaInput
  needsClarification?: boolean
  clarificationPrompt?: string
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
    itemCount: s.itemCount ?? (s.rateId.includes("door") || s.rateId.includes("window") ? 1 : 0),
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
    openings: openings.length > 0 ? openings : (base.openings ?? []),
  }
}

/**
 * Updates an existing room's openings, surfaces, or measurements without creating duplicates.
 * If no room with the target name exists, creates it so contractor input is never lost.
 */
export function applyRoomUpdateToAreas(
  areas: AreaInput[],
  update: UpdateRoomAction,
  defaultCeilingHeight = 8,
): { updated: boolean; areas: AreaInput[]; matchedRoomName: string; isNewRoom: boolean } {
  const targetLower = update.roomName.trim().toLowerCase()

  // 1. Exact match
  let targetIndex = areas.findIndex((a) => a.name.trim().toLowerCase() === targetLower)
  // 2. Substring match
  if (targetIndex === -1) {
    targetIndex = areas.findIndex((a) => {
      const aLower = a.name.trim().toLowerCase()
      return aLower.includes(targetLower) || targetLower.includes(aLower)
    })
  }
  // 3. Single room fallback if only one room exists
  if (targetIndex === -1 && areas.length === 1 && areas[0].areaType === "room") {
    targetIndex = 0
  }

  if (targetIndex !== -1) {
    const existing = areas[targetIndex]
    const updatedRoom: AreaInput = {
      ...existing,
      openings: existing.openings ? existing.openings.map((o) => ({ ...o })) : [],
      surfaces: existing.surfaces.map((s) => ({ ...s })),
    }

    // Apply openings
    if (update.openingsToAdd && update.openingsToAdd.length > 0) {
      for (const opening of update.openingsToAdd) {
        const existingOpening = updatedRoom.openings?.find((o) => o.kind === opening.kind)
        if (existingOpening) {
          existingOpening.count += opening.count
        } else {
          updatedRoom.openings = [
            ...(updatedRoom.openings || []),
            {
              id: crypto.randomUUID(),
              kind: opening.kind,
              widthFt: 3,
              heightFt: opening.kind === "door" ? 7 : 4,
              count: opening.count,
              excludeFromWalls: true,
            },
          ]
        }
      }
    }

    // Apply surfaces
    if (update.surfacesToAdd && update.surfacesToAdd.length > 0) {
      for (const surface of update.surfacesToAdd) {
        const existingSurface = updatedRoom.surfaces.find((s) => s.rateId === surface.rateId)
        if (!existingSurface) {
          updatedRoom.surfaces.push({
            id: crypto.randomUUID(),
            rateId: surface.rateId,
            coatCount: surface.coatCount,
            itemCount: surface.itemCount ?? (surface.rateId.includes("door") || surface.rateId.includes("window") ? 1 : 0),
            quantityOverride: null,
            crewNote: "",
          })
        } else if (surface.coatCount) {
          existingSurface.coatCount = surface.coatCount
        }
      }
    }

    // Apply dimensions if provided
    if (update.lengthFt && update.widthFt) {
      updatedRoom.lengthFt = update.lengthFt
      updatedRoom.widthFt = update.widthFt
    }
    if (update.heightFt) {
      updatedRoom.heightFt = update.heightFt
    }

    const nextAreas = [...areas]
    nextAreas[targetIndex] = updatedRoom
    return {
      updated: true,
      areas: nextAreas,
      matchedRoomName: existing.name,
      isNewRoom: false,
    }
  }

  // If no room exists yet, construct the room with the specified details
  const baseArea = quickRoom(update.roomName, "interior") || {
    id: crypto.randomUUID(),
    name: update.roomName,
    areaType: "room" as const,
    lengthFt: update.lengthFt || 15,
    widthFt: update.widthFt || 15,
    heightFt: update.heightFt || defaultCeilingHeight,
    crewNote: "",
    surfaces: [],
  }

  const newOpenings = (update.openingsToAdd || []).map((o) => ({
    id: crypto.randomUUID(),
    kind: o.kind,
    widthFt: 3,
    heightFt: o.kind === "door" ? 7 : 4,
    count: o.count,
    excludeFromWalls: true,
  }))

  const newSurfaces = (update.surfacesToAdd || []).map((s) => ({
    id: crypto.randomUUID(),
    rateId: s.rateId,
    coatCount: s.coatCount,
    itemCount: s.itemCount ?? (s.rateId.includes("door") || s.rateId.includes("window") ? 1 : 0),
    quantityOverride: null,
    crewNote: "",
  }))

  const createdRoom: AreaInput = {
    ...baseArea,
    id: crypto.randomUUID(),
    name: update.roomName,
    lengthFt: update.lengthFt || (baseArea.lengthFt > 0 ? baseArea.lengthFt : 15),
    widthFt: update.widthFt || (baseArea.widthFt > 0 ? baseArea.widthFt : 15),
    heightFt: update.heightFt || (baseArea.heightFt > 0 ? baseArea.heightFt : defaultCeilingHeight),
    openings: newOpenings.length > 0 ? newOpenings : (baseArea.openings ?? []),
    surfaces: newSurfaces.length > 0 ? newSurfaces : baseArea.surfaces,
  }

  return {
    updated: true,
    areas: [...areas, createdRoom],
    matchedRoomName: update.roomName,
    isNewRoom: true,
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
          message: `Added ${action.roomName} (${action.lengthFt}' × ${action.widthFt}') with ${action.surfaces.map((s) => s.label).join(", ")} to current estimate.`,
          roomAdded: room,
        }
      }

      // Check if global estimator is mounted on current window
      if (typeof window !== "undefined") {
        const win = window as unknown as { __scopepipeAddRoom?: (room: AreaInput) => void }
        if (typeof win.__scopepipeAddRoom === "function") {
          win.__scopepipeAddRoom(room)
          window.dispatchEvent(new CustomEvent("scopepipe:add-room", { detail: room }))
          return {
            ok: true,
            message: `Added ${action.roomName} (${action.lengthFt}' × ${action.widthFt}') with ${action.surfaces.map((s) => s.label).join(", ")} to current estimate.`,
            roomAdded: room,
          }
        }

        // Stage for /estimate page load if navigated from another page
        try {
          sessionStorage.setItem("scopepipe:pending-voice-room", JSON.stringify(room))
        } catch {
          // ignore
        }
      }

      // Navigate to estimator
      ctx.navigate("/estimate")
      return {
        ok: true,
        message: `Opening Estimator to add ${action.roomName} (${action.lengthFt}' × ${action.widthFt}').`,
        redirect: "/estimate",
        roomAdded: room,
      }
    }

    case "UPDATE_ROOM": {
      if (ctx.onUpdateRoom) {
        const res = ctx.onUpdateRoom(action)
        if (res.updated) {
          return {
            ok: true,
            message: res.message || `Updated ${action.roomName}: ${action.summary}`,
          }
        }
      }

      if (typeof window !== "undefined") {
        const win = window as unknown as {
          __scopepipeUpdateRoom?: (update: UpdateRoomAction) => { updated: boolean; message?: string }
        }
        if (typeof win.__scopepipeUpdateRoom === "function") {
          const res = win.__scopepipeUpdateRoom(action)
          window.dispatchEvent(new CustomEvent("scopepipe:update-room", { detail: action }))
          return {
            ok: true,
            message: res?.message || `Updated ${action.roomName}: ${action.summary}`,
          }
        }

        try {
          sessionStorage.setItem("scopepipe:pending-voice-update-room", JSON.stringify(action))
        } catch {
          // ignore
        }
      }

      ctx.navigate("/estimate")
      return {
        ok: true,
        message: `Opening Estimator to update ${action.roomName}.`,
        redirect: "/estimate",
      }
    }

    case "ADD_JOB_NOTE": {
      if (ctx.onAddJobNote) {
        const res = ctx.onAddJobNote(action)
        return { ok: res.ok, message: res.message || action.summary }
      }

      if (typeof window !== "undefined") {
        const win = window as unknown as {
          __scopepipeAddJobNote?: (action: AddJobNoteAction) => { ok: boolean; message?: string }
        }
        if (typeof win.__scopepipeAddJobNote === "function") {
          const res = win.__scopepipeAddJobNote(action)
          window.dispatchEvent(new CustomEvent("scopepipe:add-job-note", { detail: action }))
          return { ok: res?.ok ?? true, message: res?.message || action.summary }
        }

        try {
          sessionStorage.setItem("scopepipe:pending-voice-job-note", JSON.stringify(action))
        } catch {
          // ignore
        }
      }

      ctx.navigate("/estimate")
      return {
        ok: true,
        message: `Opening Estimator to add note.`,
        redirect: "/estimate",
      }
    }

    case "CLARIFY": {
      return {
        ok: false,
        needsClarification: true,
        clarificationPrompt: action.prompt,
        message: action.prompt,
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
        ok: false,
        message: action.text
          ? `Command not recognized for "${action.text}". Try saying: "Add living room, 15 by 20, walls and ceiling"`
          : "No speech recognized.",
      }
    }
  }
}
