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
