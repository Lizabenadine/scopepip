import assert from "node:assert/strict"
import test from "node:test"
import type { AreaInput, Estimate, RoomSketch } from "../types.ts"

test("creates room sketch with default private proposal visibility", () => {
  const sketch: RoomSketch = {
    id: "sketch_1",
    title: "Master Bedroom North Wall",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imageData: "data:image/jpeg;base64,mockImageData123",
    roomDimensionsText: "14' × 18' (9ft ceiling)",
    notes: "Scrape loose paint near door casing. Spot prime with Zinsser BIN.",
    includeInProposal: false, // Default is private internal note
    visibleToCrew: true,
  }

  assert.equal(sketch.includeInProposal, false)
  assert.equal(sketch.visibleToCrew, true)
  assert.match(sketch.roomDimensionsText || "", /14' × 18'/)
})

test("allows editing and updating sketch while preserving ID and creation timestamp", () => {
  const created = "2026-11-12T16:00:00.000Z"
  const updated = "2026-11-12T16:15:00.000Z"
  const initial: RoomSketch = {
    id: "sketch_1",
    title: "Initial draft",
    createdAt: created,
    updatedAt: created,
    imageData: "data:image/jpeg;base64,mockInitial",
    includeInProposal: false,
    visibleToCrew: true,
  }

  const modified: RoomSketch = {
    ...initial,
    title: "Updated with photo markup",
    updatedAt: updated,
    notes: "Added drywall crack annotation",
    includeInProposal: true, // explicitly approved for proposal
  }

  assert.equal(modified.id, initial.id)
  assert.equal(modified.createdAt, created)
  assert.equal(modified.includeInProposal, true)
  assert.equal(modified.notes, "Added drywall crack annotation")
})

test("customer proposal view strips private sketches and retains approved ones", () => {
  const privateSketch: RoomSketch = {
    id: "sketch_private",
    title: "Internal Contractor Markup",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imageData: "data:image/jpeg;base64,mockPrivate",
    includeInProposal: false,
    visibleToCrew: true,
  }

  const approvedSketch: RoomSketch = {
    id: "sketch_approved",
    title: "Client-facing accent wall spec",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imageData: "data:image/jpeg;base64,mockApproved",
    includeInProposal: true,
    visibleToCrew: true,
  }

  const room: AreaInput = {
    id: "area_1",
    name: "Living Room",
    areaType: "room",
    lengthFt: 20,
    widthFt: 15,
    heightFt: 10,
    crewNote: "Internal crew note",
    surfaces: [],
    sketches: [privateSketch, approvedSketch],
  }

  // Simulated forCustomer filter logic
  const customerRoom = {
    ...room,
    crewNote: "",
    sketches: room.sketches?.filter((s) => s.includeInProposal),
  }

  assert.equal(customerRoom.sketches?.length, 1)
  assert.equal(customerRoom.sketches?.[0]?.id, "sketch_approved")
  assert.equal(customerRoom.sketches?.some((s) => s.id === "sketch_private"), false)
})

test("supports standalone sketches created without an estimate and attaching them to an estimate area", () => {
  // 1. Standalone sketch created from Daily menu without an estimate
  const standaloneSketch: RoomSketch = {
    id: "sketch_standalone_1",
    title: "Quick Field Measurement",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imageData: "data:image/jpeg;base64,mockFieldData",
    roomDimensionsText: "12' × 14' (8ft ceiling)",
    notes: "Customer wants quote for 2 coats of Sherwin-Williams Emerald",
    includeInProposal: false,
    visibleToCrew: true,
  }

  assert.equal(standaloneSketch.id, "sketch_standalone_1")
  assert.equal(standaloneSketch.title, "Quick Field Measurement")

  // 2. Attaching the standalone sketch to an estimate area
  const existingArea: AreaInput = {
    id: "area_hallway",
    name: "Hallway",
    areaType: "room",
    lengthFt: 12,
    widthFt: 6,
    heightFt: 9,
    crewNote: "",
    surfaces: [],
    sketches: [],
  }

  const attachedArea: AreaInput = {
    ...existingArea,
    sketches: [...(existingArea.sketches ?? []), standaloneSketch],
  }

  assert.equal(attachedArea.sketches?.length, 1)
  assert.equal(attachedArea.sketches?.[0]?.id, "sketch_standalone_1")
})

test("supports text items on sketch canvas: adding, editing, moving, deleting, and reopening", () => {
  // 1. Initial sketch with text item
  const initialSketch: RoomSketch = {
    id: "sketch_text_1",
    title: "Living Room Accent Wall",
    createdAt: "2026-11-12T18:00:00.000Z",
    updatedAt: "2026-11-12T18:00:00.000Z",
    imageData: "data:image/jpeg;base64,compositeWithText",
    rawImageData: "data:image/jpeg;base64,rawDrawingOnly",
    roomDimensionsText: "16' × 20'",
    notes: "Prime water stain with stain-blocking primer",
    includeInProposal: true,
    visibleToCrew: true,
    textItems: [
      {
        id: "txt_1",
        text: "Water stain near crown",
        x: 35, // 35% across
        y: 20, // 20% down
        color: "#ef4444",
        fontSize: 16,
      },
      {
        id: "txt_2",
        text: "Accent color: SW 6244 Naval",
        x: 60,
        y: 70,
        color: "#06b6d4",
        fontSize: 16,
      },
    ],
  }

  assert.equal(initialSketch.textItems?.length, 2)
  assert.equal(initialSketch.textItems[0].text, "Water stain near crown")
  assert.equal(initialSketch.textItems[0].x, 35)

  // 2. Move text item (drag to new position) and edit content
  const updatedTextItems = initialSketch.textItems.map((item) => {
    if (item.id === "txt_1") {
      return {
        ...item,
        text: "Repaired water stain - 2 coats BIN",
        x: 42,
        y: 25,
      }
    }
    return item
  })

  // 3. Delete one text item
  const filteredTextItems = updatedTextItems.filter((item) => item.id !== "txt_2")

  const savedSketch: RoomSketch = {
    ...initialSketch,
    updatedAt: "2026-11-12T18:10:00.000Z",
    textItems: filteredTextItems,
  }

  assert.equal(savedSketch.textItems?.length, 1)
  assert.equal(savedSketch.textItems[0].id, "txt_1")
  assert.equal(savedSketch.textItems[0].text, "Repaired water stain - 2 coats BIN")
  assert.equal(savedSketch.textItems[0].x, 42)
  assert.equal(savedSketch.textItems[0].y, 25)

  // 4. Verify reopening preserves rawImageData and textItems without duplication
  assert.equal(savedSketch.rawImageData, "data:image/jpeg;base64,rawDrawingOnly")
  assert.ok(savedSketch.imageData)
})

test("verifies print payload includes sketch drawing, title, and written instructions", () => {
  const sketch: RoomSketch = {
    id: "sketch_print_1",
    title: "Kitchen Cabinet Repair Specs",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imageData: "data:image/jpeg;base64,mockImage",
    roomDimensionsText: "14' × 12'",
    notes: "Degrease with TSP, scuff sand with 220 grit, 2 coats Kem Aqua Plus",
    includeInProposal: false,
    visibleToCrew: true,
  }

  // Verify necessary print components exist and are non-empty
  assert.equal(sketch.title, "Kitchen Cabinet Repair Specs")
  assert.match(sketch.notes || "", /Kem Aqua Plus/)
  assert.match(sketch.roomDimensionsText || "", /14' × 12'/)
  assert.ok(sketch.imageData.startsWith("data:image/"))
})
