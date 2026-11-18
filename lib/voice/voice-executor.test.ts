import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  executeVoiceAction,
  buildAreaFromVoiceAction,
  applyRoomUpdateToAreas,
  type VoiceExecutionContext,
} from "./voice-executor.ts"
import type {
  AddRoomAction,
  UpdateRoomAction,
  AddJobNoteAction,
  CreateLeadAction,
  AddCustomerNoteAction,
  ScheduleAppointmentAction,
  NavigateAction,
} from "./voice-parser.ts"
import type { AreaInput, Client, Estimate } from "../types.ts"

describe("Voice Action Executor", () => {
  const mockClients: Client[] = [
    {
      id: "client-1",
      name: "John Smith",
      phone: "503-555-1234",
      email: "john@example.com",
      address: "123 Oak St",
      notes: "Existing client note",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    },
  ]

  const mockEstimates = [
    {
      id: "est-1",
      clientId: "client-1",
      stageId: "stage-1",
      title: "Interior Repaint",
      jobAddress: "123 Oak St",
      archived: false,
      salesStage: "cold",
      notes: "",
      areas: [],
      lineItems: [],
      rates: [],
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    },
  ] as unknown as Estimate[]

  it("builds an AreaInput with dimensions and surfaces", () => {
    const action: AddRoomAction = {
      type: "ADD_ROOM",
      roomName: "Living Room",
      lengthFt: 15,
      widthFt: 20,
      heightFt: 9,
      surfaces: [
        { rateId: "walls", label: "Walls", coatCount: 2 },
        { rateId: "ceiling", label: "Ceiling", coatCount: 2 },
      ],
      openings: [{ kind: "door", count: 2 }],
      requiresConfirmation: false,
      summary: "Add Living Room",
    }

    const room = buildAreaFromVoiceAction(action)
    assert.equal(room.name, "Living Room")
    assert.equal(room.lengthFt, 15)
    assert.equal(room.widthFt, 20)
    assert.equal(room.heightFt, 9)
    assert.equal(room.surfaces.length, 2)
    assert.equal(room.openings?.length, 1)
  })

  it("executes ADD_ROOM with onAddRoom callback when inside active estimator", () => {
    let addedRoomName = ""
    const ctx: VoiceExecutionContext = {
      clients: mockClients,
      estimates: mockEstimates,
      createLead: () => ({ ok: true }),
      navigate: () => {},
      onAddRoom: (room) => {
        addedRoomName = room.name
      },
    }

    const action: AddRoomAction = {
      type: "ADD_ROOM",
      roomName: "Master Bedroom",
      lengthFt: 14,
      widthFt: 16,
      heightFt: 8,
      surfaces: [{ rateId: "walls", label: "Walls", coatCount: 2 }],
      openings: [],
      requiresConfirmation: false,
      summary: "Add Master Bedroom",
    }

    const result = executeVoiceAction(action, ctx)
    assert.equal(result.ok, true)
    assert.equal(addedRoomName, "Master Bedroom")
  })

  it("executes CREATE_LEAD and delegates to store createLead", () => {
    let createdLeadName = ""
    const ctx: VoiceExecutionContext = {
      clients: mockClients,
      estimates: mockEstimates,
      createLead: (input) => {
        createdLeadName = input.name
        return { ok: true, estimateId: "new-est-1" }
      },
      navigate: () => {},
    }

    const action: CreateLeadAction = {
      type: "CREATE_LEAD",
      name: "Alice Walker",
      phone: "503-555-9999",
      email: "alice@test.com",
      address: "789 Pine Rd",
      service: "Interior Repaint",
      requiresConfirmation: true,
      summary: "Create lead",
    }

    const result = executeVoiceAction(action, ctx)
    assert.equal(result.ok, true)
    assert.equal(createdLeadName, "Alice Walker")
  })

  it("executes ADD_CUSTOMER_NOTE on existing estimate", () => {
    let notedId = ""
    let noteText = ""
    const ctx: VoiceExecutionContext = {
      clients: mockClients,
      estimates: mockEstimates,
      createLead: () => ({ ok: true }),
      addEstimateNote: (id, text) => {
        notedId = id
        noteText = text
      },
      navigate: () => {},
    }

    const action: AddCustomerNoteAction = {
      type: "ADD_CUSTOMER_NOTE",
      targetName: "John Smith",
      note: "Wants flat sheen on ceiling",
      requiresConfirmation: true,
      summary: "Add note",
    }

    const result = executeVoiceAction(action, ctx)
    assert.equal(result.ok, true)
    assert.equal(notedId, "est-1")
    assert.equal(noteText, "Wants flat sheen on ceiling")
  })

  it("executes SCHEDULE_APPOINTMENT for existing lead", () => {
    let scheduledId = ""
    let visitDate = ""
    let visitTime = ""
    const ctx: VoiceExecutionContext = {
      clients: mockClients,
      estimates: mockEstimates,
      createLead: () => ({ ok: true }),
      scheduleSalesVisit: (id, date, time) => {
        scheduledId = id
        visitDate = date
        visitTime = time
      },
      navigate: () => {},
    }

    const action: ScheduleAppointmentAction = {
      type: "SCHEDULE_APPOINTMENT",
      clientName: "John Smith",
      date: "2026-11-20",
      time: "14:00",
      displayDateTime: "Fri, Nov 20 at 2:00 PM",
      requiresConfirmation: true,
      summary: "Schedule visit",
    }

    const result = executeVoiceAction(action, ctx)
    assert.equal(result.ok, true)
    assert.equal(scheduledId, "est-1")
    assert.equal(visitDate, "2026-11-20")
    assert.equal(visitTime, "14:00")
  })

  it("enforces role permissions: estimator blocked from invoices", () => {
    let navigatedTo = ""
    const ctx: VoiceExecutionContext = {
      sessionRole: "estimator",
      clients: mockClients,
      estimates: mockEstimates,
      createLead: () => ({ ok: true }),
      navigate: (href) => {
        navigatedTo = href
      },
    }

    const action: NavigateAction = {
      type: "NAVIGATE",
      destination: "/payments",
      label: "Invoices & Payments",
      requiresConfirmation: false,
      summary: "Go to invoices",
    }

    const result = executeVoiceAction(action, ctx)
    assert.equal(result.ok, false)
    assert.match(result.message, /Estimator login is restricted/i)
    assert.equal(navigatedTo, "") // should not navigate
  })

  it("updates existing room without creating duplicates using applyRoomUpdateToAreas", () => {
    const initialAreas: AreaInput[] = [
      {
        id: "area-1",
        name: "Living Room",
        areaType: "room",
        lengthFt: 15,
        widthFt: 15,
        heightFt: 8,
        crewNote: "",
        surfaces: [{ id: "surf-1", rateId: "walls", coatCount: 2, itemCount: 0, quantityOverride: null, crewNote: "" }],
        openings: [],
      },
    ]

    const updateAction: UpdateRoomAction = {
      type: "UPDATE_ROOM",
      roomName: "Living Room",
      openingsToAdd: [{ kind: "door", count: 2 }],
      surfacesToAdd: [{ rateId: "ceiling", label: "Ceiling", coatCount: 2 }],
      requiresConfirmation: false,
      summary: "Add 2 doors and Ceiling to Living Room",
    }

    const res = applyRoomUpdateToAreas(initialAreas, updateAction)
    assert.equal(res.updated, true)
    assert.equal(res.isNewRoom, false)
    assert.equal(res.areas.length, 1) // NO duplicates!
    assert.equal(res.areas[0].openings?.find((o) => o.kind === "door")?.count, 2)
    assert.equal(res.areas[0].surfaces.some((s) => s.rateId === "ceiling"), true)
  })

  it("executes UPDATE_ROOM via ctx.onUpdateRoom", () => {
    let updatedAction: UpdateRoomAction | null = null
    const ctx: VoiceExecutionContext = {
      clients: mockClients,
      estimates: mockEstimates,
      createLead: () => ({ ok: true }),
      navigate: () => {},
      onUpdateRoom: (update) => {
        updatedAction = update
        return { updated: true, message: "Room updated successfully" }
      },
    }

    const action: UpdateRoomAction = {
      type: "UPDATE_ROOM",
      roomName: "Kitchen",
      openingsToAdd: [{ kind: "window", count: 3 }],
      requiresConfirmation: false,
      summary: "Add 3 windows to Kitchen",
    }

    const result = executeVoiceAction(action, ctx)
    assert.equal(result.ok, true)
    assert.equal((updatedAction as UpdateRoomAction | null)?.roomName, "Kitchen")
  })

  it("executes ADD_JOB_NOTE via ctx.onAddJobNote", () => {
    let noteAdded = ""
    const ctx: VoiceExecutionContext = {
      clients: mockClients,
      estimates: mockEstimates,
      createLead: () => ({ ok: true }),
      navigate: () => {},
      onAddJobNote: (note) => {
        noteAdded = note.text
        return { ok: true }
      },
    }

    const action: AddJobNoteAction = {
      type: "ADD_JOB_NOTE",
      noteType: "job",
      text: "Customer wants semi-gloss on trim",
      requiresConfirmation: false,
      summary: 'Add job note: "Customer wants semi-gloss on trim".',
    }

    const result = executeVoiceAction(action, ctx)
    assert.equal(result.ok, true)
    assert.equal(noteAdded, "Customer wants semi-gloss on trim")
  })
})
