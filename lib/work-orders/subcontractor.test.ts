import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_ESTIMATE_SETTINGS,
  DEFAULT_PRODUCTION_RATES,
  documentedBedroom,
  paintUpgradeLine,
} from "../defaults.ts"
import { createWorkOrder } from "./defaults.ts"
import { toCrewSheet } from "./crew-sheet.ts"
import { subcontractorSignature, toSubcontractorOrder } from "./subcontractor.ts"
import type { Client, Estimate } from "../types.ts"

const client: Client = {
  id: "client-jim",
  name: "Jim Patel",
  phone: "(503) 555-0177",
  email: "jim@patel.test",
  address: "410 Elm Street, Portland",
  notes: "",
  createdAt: "2026-08-30T15:00:00.000Z",
  updatedAt: "2026-08-30T15:00:00.000Z",
}

const estimate: Estimate = {
  id: "est-jim",
  clientId: client.id,
  stageId: "stage-completed",
  title: "Primary bedroom",
  jobAddress: "410 Elm Street, Portland",
  areas: [documentedBedroom()],
  lineItems: [],
  rates: DEFAULT_PRODUCTION_RATES,
  settings: DEFAULT_ESTIMATE_SETTINGS,
  scheduledOn: "2026-09-18",
  notes: "",
  crewNote: "Skip the closet ceiling.",
  acceptedAt: null,
  publicToken: "jim-bedroom-token",
  clientStatus: "draft",
  signature: null,
  salesperson: "Riley Cho",
  createdAt: "2026-09-02T15:00:00.000Z",
  updatedAt: "2026-09-18T23:00:00.000Z",
}

function orderFrom(next: Estimate = estimate) {
  const workOrder = createWorkOrder(next)
  return toSubcontractorOrder({
    sheet: toCrewSheet(next, client, workOrder),
    jobId: next.id,
    dateGenerated: "2026-09-17T15:00:00.000Z",
    companyName: "ScopePipe",
    companyAddress: "",
    companyPhone: "",
    salespersonName: next.salesperson ?? "",
    salespersonEmail: "",
    exclusions: workOrder.exclusions,
  })
}

describe("toSubcontractorOrder", () => {
  it("builds the crew copy from the estimate and leaves color codes blank", () => {
    const order = orderFrom()
    const encoded = JSON.stringify(order)
    assert.equal(encoded.includes("$"), false)
    assert.equal(/SW\s?\d/.test(encoded), false)
    assert.equal(order.customerName, "Jim Patel")
    assert.equal(order.jobName, "Jim Patel - Primary bedroom")
    assert.equal(order.jobAddress, "410 Elm Street, Portland")
    assert.equal(order.jobId, "est-jim")
    assert.equal(order.dateGenerated, "2026-09-17")
    assert.equal(order.salespersonName, "Riley Cho")
    assert.equal(order.companyName, "ScopePipe")
    assert.equal(order.colorSpecs.some((spec) => spec.product === "Wall paint"), true)
    assert.equal(order.colorSpecs.every((spec) => spec.brand === ""), true)
    assert.equal(order.colorSpecs.every((spec) => spec.colorNameCode === "Not specified"), true)
    assert.equal(order.colorSpecs.every((spec) => spec.sheen === "Not specified"), true)
    assert.equal(order.applicationAreas.some((area) => area.startsWith("Bedroom")), true)
    assert.equal(order.hybridItems.some((item) => item.description === "Bedroom" && item.unit === "Job"), true)
    assert.equal(order.exclusions.some((line) => line.includes("Skip the closet ceiling")), true)
    assert.equal(order.prepTasks.some((task) => /skip the closet/i.test(task)), false)
    assert.equal(order.prepTasks.some((task) => task.startsWith("Paint ")), false)
    for (const banned of ["price", "cost", "margin", "profit", "salesRate", "hourlyRate", "amount"]) {
      assert.equal(encoded.toLowerCase().includes(`"${banned}"`), false, banned)
    }
  })

  it("lists installer lines in hours and keeps a hidden line off the copy", () => {
    const hidden = { ...paintUpgradeLine("upgrade"), hiddenOnWorkOrder: true, workOrderHours: 2 }
    const visible = {
      ...paintUpgradeLine("item-rot"),
      label: "Fascia wood rot repair",
      crewNote: "Sand to bare wood.",
      workOrderHours: 2,
      hiddenOnWorkOrder: false,
    }
    const order = orderFrom({ ...estimate, lineItems: [hidden, visible] })
    assert.equal(order.hybridItems.some((item) => item.description === "Paint Upgrade"), false)
    const repair = order.hybridItems.find((item) => item.description === "Fascia wood rot repair")
    assert.ok(repair)
    assert.equal(repair.unit, "hr")
    assert.equal(repair.notes, "Sand to bare wood.")
    assert.equal(JSON.stringify(order).includes("$"), false)
  })

  it("rejects a blank crew-lead name", () => {
    assert.equal(subcontractorSignature("  ", "2026-10-18"), null)
    assert.equal(subcontractorSignature("Manuel Garcia", "10/18/2026"), null)
    assert.deepEqual(subcontractorSignature("  Manuel Garcia ", "2026-10-18"), {
      subSignature: "Manuel Garcia",
      subSignedDate: "2026-10-18",
    })
  })
})
