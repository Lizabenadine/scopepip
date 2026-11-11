import assert from "node:assert/strict"
import test from "node:test"
import { gzipSync } from "node:zlib"
import {
  applySingleEstimatePatch,
  isSingleEstimatePayload,
  parseBookPayload,
  singleChangedEstimate,
} from "./book-payload.ts"
import { createSeedState } from "./seed.ts"

test("singleChangedEstimate isolates edits to one existing estimate, its client, and its work order", () => {
  const previous = createSeedState()
  const target = previous.estimates[0]!
  const targetClient = previous.clients.find((c) => c.id === target.clientId)!
  const targetOrder = previous.workOrders.find((w) => w.estimateId === target.id)!

  const editedEstimate = {
    ...target,
    notes: "Updated homeowner walkthrough notes",
    lineItems: [
      ...target.lineItems,
      {
        id: "custom-scaffold",
        label: "Stairwell scaffolding",
        clientNote: "Two-story foyer access",
        crewNote: "Anchor scaffold feet on drop cloths",
        mode: "custom" as const,
        hours: 0,
        units: 1,
        pricePerUnit: 0,
        customPrice: 325,
        workOrderHours: 0,
        hiddenOnWorkOrder: false,
        materials: [],
        optional: false,
        selected: true,
      },
    ],
    areas: [
      ...target.areas,
      {
        id: "new-blank-room",
        name: "Hallway",
        areaType: "room" as const,
        lengthFt: 0,
        widthFt: 0,
        heightFt: 0,
        crewNote: "",
        surfaces: [],
      },
    ],
  }

  const next = {
    ...previous,
    clients: previous.clients.map((c) =>
      c.id === targetClient.id ? { ...c, phone: "(503) 555-0199" } : c,
    ),
    estimates: previous.estimates.map((e) => (e.id === target.id ? editedEstimate : e)),
    workOrders: previous.workOrders.map((w) =>
      w.estimateId === target.id ? { ...w, prepNotes: "Bring drop cloths" } : w,
    ),
  }

  const patch = singleChangedEstimate(previous, next)
  assert.ok(patch)
  assert.equal(patch.estimate.id, target.id)
  assert.equal(patch.estimate.notes, "Updated homeowner walkthrough notes")
  assert.equal(patch.client?.phone, "(503) 555-0199")
  assert.equal(patch.workOrder?.prepNotes, "Bring drop cloths")

  const untouchedOther = previous.estimates[1]!
  const merged = applySingleEstimatePatch(previous, patch)
  const mergedTarget = merged.estimates.find((e) => e.id === target.id)!
  const mergedOther = merged.estimates.find((e) => e.id === untouchedOther.id)!

  assert.equal(mergedTarget.notes, "Updated homeowner walkthrough notes")
  assert.equal(mergedTarget.lineItems.length, target.lineItems.length + 1)
  assert.equal(mergedTarget.areas[mergedTarget.areas.length - 1]?.lengthFt, 0)
  assert.deepEqual(mergedOther.areas, untouchedOther.areas)
  assert.equal(merged.clients.find((c) => c.id === targetClient.id)?.phone, "(503) 555-0199")
  assert.equal(
    merged.workOrders.find((w) => w.estimateId === target.id)?.prepNotes,
    "Bring drop cloths",
  )
})

test("singleChangedEstimate returns null when global settings or multiple estimates change", () => {
  const previous = createSeedState()
  const changedSettings = {
    ...previous,
    estimateSettings: { ...previous.estimateSettings, hourlyRate: 95 },
  }
  assert.equal(singleChangedEstimate(previous, changedSettings), null)

  const changedTwo = {
    ...previous,
    estimates: previous.estimates.map((est, idx) =>
      idx < 2 ? { ...est, notes: `Changed ${idx}` } : est,
    ),
  }
  assert.equal(singleChangedEstimate(previous, changedTwo), null)
})

test("applySingleEstimatePatch prepends new estimate without touching existing estimate dimensions", () => {
  const previous = createSeedState()
  const existing = previous.estimates[0]!
  const existingRoomLengths = existing.areas.map((a) => [a.lengthFt, a.widthFt, a.heightFt])

  const brandNew = {
    ...existing,
    id: "est-brand-new",
    title: "Sunroom repaint",
    notes: "Fresh client estimate",
  }

  const merged = applySingleEstimatePatch(previous, { estimate: brandNew })
  assert.equal(merged.estimates[0]?.id, "est-brand-new")
  const preserved = merged.estimates.find((e) => e.id === existing.id)!
  assert.deepEqual(
    preserved.areas.map((a) => [a.lengthFt, a.widthFt, a.heightFt]),
    existingRoomLengths,
  )
})

test("parseBookPayload decodes plain JSON and gzip payloads exceeding 4.5 MB uncompressed", async () => {
  const largeNote = "Interior wall prep details. ".repeat(220_000)
  const payload = { ...createSeedState().estimates[0]!, notes: largeNote }
  const rawJson = JSON.stringify(payload)
  assert.ok(Buffer.byteLength(rawJson, "utf8") > 4_500_000)

  const compressed = gzipSync(Buffer.from(rawJson, "utf8"))
  assert.ok(compressed.byteLength < 100_000)

  const gzipRequest = new Request("https://scopepipe.test/api/account/book/estimate", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-scopepipe-encoding": "gzip",
    },
    body: compressed,
  })
  const decodedGzip = await parseBookPayload(gzipRequest)
  assert.equal(isSingleEstimatePayload(decodedGzip), true)
  assert.equal((decodedGzip as typeof payload).notes.length, largeNote.length)

  const jsonRequest = new Request("https://scopepipe.test/api/account/book/estimate", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ estimate: createSeedState().estimates[0]! }),
  })
  const decodedJson = (await parseBookPayload(jsonRequest)) as { estimate?: { id?: string } }
  assert.equal(decodedJson.estimate?.id, createSeedState().estimates[0]!.id)
})
