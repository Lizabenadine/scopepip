import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  normalizeSpokenNumbers,
  parseVoiceCommand,
  type AddRoomAction,
  type ClarifyAction,
  type CreateLeadAction,
  type AddCustomerNoteAction,
  type ScheduleAppointmentAction,
  type UpdateCrmRecordAction,
  type GenerateDocumentAction,
  type NavigateAction,
} from "./voice-parser.ts"

describe("Voice Command Parser for Painting Contractors", () => {
  describe("Spoken Number Normalization", () => {
    it("converts single spoken number words to numerals", () => {
      assert.equal(normalizeSpokenNumbers("two coats on walls"), "2 coats on walls")
      assert.equal(normalizeSpokenNumbers("nine foot ceilings"), "9 foot ceilings")
      assert.equal(normalizeSpokenNumbers("three windows and two doors"), "3 windows and 2 doors")
    })

    it("converts compound spoken number words to numerals", () => {
      assert.equal(normalizeSpokenNumbers("fifteen by twenty"), "15 by 20")
      assert.equal(normalizeSpokenNumbers("twenty five by thirty"), "25 by 30")
      assert.equal(normalizeSpokenNumbers("twelve by fourteen"), "12 by 14")
    })
  })

  describe("Hands-free Walkthrough Estimating (Add Room)", () => {
    it("parses: Add living room, 15 by 20, walls and ceiling", () => {
      const result = parseVoiceCommand("Add living room, 15 by 20, walls and ceiling")
      assert.equal(result.action.type, "ADD_ROOM")
      const action = result.action as AddRoomAction
      assert.equal(action.roomName, "Living Room")
      assert.equal(action.lengthFt, 15)
      assert.equal(action.widthFt, 20)
      assert.equal(action.heightFt, 8) // default ceiling height
      assert.equal(action.surfaces.some((s) => s.rateId === "walls"), true)
      assert.equal(action.surfaces.some((s) => s.rateId === "ceiling"), true)
      assert.equal(action.requiresConfirmation, false) // immediate field population for smooth walkthrough
    })

    it("parses room with height and coat count: Add master bedroom, 14 by 16 by 9, two coats walls", () => {
      const result = parseVoiceCommand("Add master bedroom, 14 by 16 by 9, two coats walls")
      assert.equal(result.action.type, "ADD_ROOM")
      const action = result.action as AddRoomAction
      assert.equal(action.roomName, "Master Bedroom")
      assert.equal(action.lengthFt, 14)
      assert.equal(action.widthFt, 16)
      assert.equal(action.heightFt, 9)
      const wallSurface = action.surfaces.find((s) => s.rateId === "walls")
      assert.ok(wallSurface)
      assert.equal(wallSurface?.coatCount, 2)
    })

    it("parses room with spoken numbers: add kitchen fifteen by twenty walls only", () => {
      const result = parseVoiceCommand("add kitchen fifteen by twenty walls only")
      assert.equal(result.action.type, "ADD_ROOM")
      const action = result.action as AddRoomAction
      assert.equal(action.roomName, "Kitchen")
      assert.equal(action.lengthFt, 15)
      assert.equal(action.widthFt, 20)
      assert.equal(action.surfaces.length, 1)
      assert.equal(action.surfaces[0].rateId, "walls")
    })

    it("parses doors and windows openings: Add dining room 12 by 15, walls, ceiling, 2 doors, 3 windows", () => {
      const result = parseVoiceCommand("Add dining room 12 by 15, walls, ceiling, 2 doors, 3 windows")
      assert.equal(result.action.type, "ADD_ROOM")
      const action = result.action as AddRoomAction
      assert.equal(action.roomName, "Dining Room")
      assert.equal(action.lengthFt, 12)
      assert.equal(action.widthFt, 15)
      assert.equal(action.openings.find((o) => o.kind === "door")?.count, 2)
      assert.equal(action.openings.find((o) => o.kind === "window")?.count, 3)
    })

    it("parses inverted word order: 15 x 15 walls and ceilings living room.", () => {
      const result = parseVoiceCommand("15 x 15 walls and ceilings living room.")
      assert.equal(result.action.type, "ADD_ROOM")
      const action = result.action as AddRoomAction
      assert.equal(action.roomName, "Living Room")
      assert.equal(action.lengthFt, 15)
      assert.equal(action.widthFt, 15)
      assert.equal(action.heightFt, 8) // default ceiling height
      assert.equal(action.surfaces.some((s) => s.rateId === "walls"), true)
      assert.equal(action.surfaces.some((s) => s.rateId === "ceiling"), true)
      assert.equal(action.surfaces.some((s) => s.rateId === "baseboards"), false)
    })

    it("parses: 15 by 15 walls and ceilings living room", () => {
      const result = parseVoiceCommand("15 by 15 walls and ceilings living room")
      assert.equal(result.action.type, "ADD_ROOM")
      const action = result.action as AddRoomAction
      assert.equal(action.roomName, "Living Room")
      assert.equal(action.lengthFt, 15)
      assert.equal(action.widthFt, 15)
      assert.equal(action.heightFt, 8)
      assert.equal(action.surfaces.some((s) => s.rateId === "walls"), true)
      assert.equal(action.surfaces.some((s) => s.rateId === "ceiling"), true)
    })

    it("asks for clarification when dimensions given without room name: 15 x 15 walls and ceilings", () => {
      const result = parseVoiceCommand("15 x 15 walls and ceilings")
      assert.equal(result.action.type, "CLARIFY")
      const action = result.action as ClarifyAction
      assert.equal(action.missingField, "roomName")
      assert.equal(action.partialRoom?.lengthFt, 15)
      assert.equal(action.partialRoom?.widthFt, 15)
      assert.ok(action.prompt.includes("Which room"))
    })

    it("asks for clarification when room name given without dimensions: Add living room", () => {
      const result = parseVoiceCommand("Add living room")
      assert.equal(result.action.type, "CLARIFY")
      const action = result.action as ClarifyAction
      assert.equal(action.missingField, "dimensions")
      assert.equal(action.partialRoom?.roomName, "Living Room")
      assert.ok(action.prompt.includes("dimensions"))
    })
  })

  describe("Lead Creation with Confirmation", () => {
    it("parses full lead details and requires confirmation", () => {
      const command = "Create lead John Smith, 503-555-1234, john@example.com, 123 Oak St, interior repaint"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "CREATE_LEAD")
      const action = result.action as CreateLeadAction
      assert.equal(action.name, "John Smith")
      assert.equal(action.phone, "503-555-1234")
      assert.equal(action.email, "john@example.com")
      assert.equal(action.address, "123 Oak St")
      assert.equal(action.service, "interior repaint")
      assert.equal(action.requiresConfirmation, true) // Requirement 8: safety confirmation
    })

    it("parses simpler lead with phone only", () => {
      const command = "New customer Sarah Connor, phone 503-555-9876"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "CREATE_LEAD")
      const action = result.action as CreateLeadAction
      assert.equal(action.name, "Sarah Connor")
      assert.equal(action.phone, "503-555-9876")
      assert.equal(action.requiresConfirmation, true)
    })
  })

  describe("Customer Notes with Confirmation", () => {
    it("parses customer notes with target client and requires confirmation", () => {
      const command = "Add note to John Smith: wants satin finish on trim"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "ADD_CUSTOMER_NOTE")
      const action = result.action as AddCustomerNoteAction
      assert.equal(action.targetName, "John Smith")
      assert.equal(action.note, "wants satin finish on trim")
      assert.equal(action.requiresConfirmation, true)
    })

    it("parses customer note with alternate phrasing", () => {
      const command = "Customer note for Sarah Connor: gate code 4421, dog in yard"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "ADD_CUSTOMER_NOTE")
      const action = result.action as AddCustomerNoteAction
      assert.equal(action.targetName, "Sarah Connor")
      assert.equal(action.note, "gate code 4421, dog in yard")
      assert.equal(action.requiresConfirmation, true)
    })
  })

  describe("Appointment Scheduling with Confirmation", () => {
    it("parses appointment with relative date and time", () => {
      const command = "Schedule appointment with Sarah Connor tomorrow at 2 PM"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "SCHEDULE_APPOINTMENT")
      const action = result.action as ScheduleAppointmentAction
      assert.equal(action.clientName, "Sarah Connor")
      assert.equal(action.time, "14:00")
      assert.ok(action.date.length === 10)
      assert.equal(action.requiresConfirmation, true)
    })

    it("parses visit with address: Schedule visit with John Smith on Friday at 10 AM at 123 Oak St", () => {
      const command = "Schedule visit with John Smith on Friday at 10 AM at 123 Oak St"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "SCHEDULE_APPOINTMENT")
      const action = result.action as ScheduleAppointmentAction
      assert.equal(action.clientName, "John Smith")
      assert.equal(action.time, "10:00")
      assert.equal(action.address, "123 Oak St")
      assert.equal(action.requiresConfirmation, true)
    })
  })

  describe("CRM Updates and Follow-ups", () => {
    it("parses set follow-up command", () => {
      const command = "Set follow-up for John Smith"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "UPDATE_CRM_RECORD")
      const action = result.action as UpdateCrmRecordAction
      assert.equal(action.clientName, "John Smith")
      assert.equal(action.action, "follow_up")
      assert.equal(action.requiresConfirmation, true)
    })

    it("parses advance sales stage command", () => {
      const command = "Advance sales stage for Sarah Connor"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "UPDATE_CRM_RECORD")
      const action = result.action as UpdateCrmRecordAction
      assert.equal(action.clientName, "Sarah Connor")
      assert.equal(action.action, "advance_stage")
      assert.equal(action.requiresConfirmation, true)
    })

    it("parses mark accepted command", () => {
      const command = "Mark estimate for Mike Miller as accepted"
      const result = parseVoiceCommand(command)
      assert.equal(result.action.type, "UPDATE_CRM_RECORD")
      const action = result.action as UpdateCrmRecordAction
      assert.equal(action.clientName, "Mike Miller")
      assert.equal(action.action, "mark_accepted")
      assert.equal(action.requiresConfirmation, true)
    })
  })

  describe("Document Generation Commands", () => {
    it("parses: Generate estimate", () => {
      const result = parseVoiceCommand("Generate estimate")
      assert.equal(result.action.type, "GENERATE_DOCUMENT")
      assert.equal((result.action as GenerateDocumentAction).documentType, "estimate")
    })

    it("parses: Show work order", () => {
      const result = parseVoiceCommand("Show work order")
      assert.equal(result.action.type, "GENERATE_DOCUMENT")
      assert.equal((result.action as GenerateDocumentAction).documentType, "work_order")
    })

    it("parses: Generate paint material list", () => {
      const result = parseVoiceCommand("Generate paint material list")
      assert.equal(result.action.type, "GENERATE_DOCUMENT")
      assert.equal((result.action as GenerateDocumentAction).documentType, "paint_list")
    })
  })

  describe("App Navigation Commands", () => {
    it("parses navigation to dashboard", () => {
      const result = parseVoiceCommand("Go to dashboard")
      assert.equal(result.action.type, "NAVIGATE")
      assert.equal((result.action as NavigateAction).destination, "/dashboard")
    })

    it("parses navigation to sales pipeline", () => {
      const result = parseVoiceCommand("Open sales pipeline")
      assert.equal(result.action.type, "NAVIGATE")
      assert.equal((result.action as NavigateAction).destination, "/sales-pipeline")
    })

    it("parses navigation to estimator", () => {
      const result = parseVoiceCommand("Open estimator")
      assert.equal(result.action.type, "NAVIGATE")
      assert.equal((result.action as NavigateAction).destination, "/estimate")
    })

    it("parses navigation to calendar", () => {
      const result = parseVoiceCommand("Open calendar")
      assert.equal(result.action.type, "NAVIGATE")
      assert.equal((result.action as NavigateAction).destination, "/calendar")
    })

    it("parses navigation to daily sketches", () => {
      const result = parseVoiceCommand("Go to sketches")
      assert.equal(result.action.type, "NAVIGATE")
      assert.equal((result.action as NavigateAction).destination, "/sketches")
    })

    it("parses navigation to help", () => {
      const result = parseVoiceCommand("Open help center")
      assert.equal(result.action.type, "NAVIGATE")
      assert.equal((result.action as NavigateAction).destination, "/help")
    })
  })
})
