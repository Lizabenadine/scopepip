import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_ESTIMATE_SETTINGS,
  DEFAULT_PRODUCTION_RATES,
  documentedBedroom,
  paintUpgradeLine,
} from "../defaults.ts"
import { createWorkOrder } from "./defaults.ts"
import { crewSheetAllowed, toCrewSheet } from "./crew-sheet.ts"
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
  createdAt: "2026-09-02T15:00:00.000Z",
  updatedAt: "2026-09-18T23:00:00.000Z",
}

function keysOf(value: unknown, found: string[] = []): string[] {
  if (!value || typeof value !== "object") return found
  if (Array.isArray(value)) {
    value.forEach((item) => keysOf(item, found))
    return found
  }
  for (const [key, nested] of Object.entries(value)) {
    found.push(key)
    keysOf(nested, found)
  }
  return found
}

describe("toCrewSheet", () => {
  it("keeps hours, products, and crew notes and drops prices", () => {
    const sheet = toCrewSheet(estimate, client, createWorkOrder(estimate))
    const keys = keysOf(sheet)
    assert.equal(JSON.stringify(sheet).includes("$"), false)
    assert.equal(sheet.allocatedHours, 13.5)
    assert.equal(sheet.areas[0].dimensionLabel, "12 × 15 × 8 ft")
    assert.equal(sheet.areas[0].surfaces[0].internalLabel, "Walls")
    assert.equal(sheet.areas[0].surfaces[0].productName, "Wall paint")
    assert.equal(sheet.areas[0].surfaces[0].finishCoats, 2)
    assert.equal(sheet.areas[0].surfaces[0].primerCoats, 0)
    assert.equal(sheet.crewNote, "Skip the closet ceiling.")
    for (const banned of [
      "price",
      "cost",
      "margin",
      "profit",
      "total",
      "salesRate",
      "surcharge",
      "hourlyRate",
      "laborPrice",
      "materialCost",
      "laborCost",
      "amountDue",
      "amount",
      "subtotal",
    ]) {
      assert.equal(keys.includes(banned), false, banned)
    }
  })

  it("keeps a cleared prep note empty", () => {
    const sheet = toCrewSheet(estimate, client, { ...createWorkOrder(estimate), prepNotes: "" })
    assert.equal(sheet.crewNote, "")
  })

  it("opens only after the estimate is scheduled", () => {
    assert.equal(crewSheetAllowed("lead"), false)
    assert.equal(crewSheetAllowed("estimate_sent"), false)
    assert.equal(crewSheetAllowed("scheduled"), true)
    assert.equal(crewSheetAllowed("completed"), true)
  })

  it("leaves a line marked hidden on the work order off the crew sheet", () => {
    const hidden = { ...paintUpgradeLine("upgrade"), hiddenOnWorkOrder: true, workOrderHours: 2 }
    const sheet = toCrewSheet(
      { ...estimate, lineItems: [hidden] },
      client,
      createWorkOrder(estimate),
    )
    assert.equal(sheet.lineItems.length, 0)
    assert.equal(sheet.allocatedHours, 13.5)
  })

  it("lists a signed change order without its price", () => {
    const line = {
      ...paintUpgradeLine("item-rot"),
      label: "Fascia wood rot repair",
      clientNote: "Added by signed change order.",
      customPrice: 180,
    }
    const sheet = toCrewSheet(
      {
        ...estimate,
        lineItems: [line],
        changeOrders: [
          {
            id: "co_rot",
            estimateId: estimate.id,
            items: [{ id: "item-rot", label: "Fascia wood rot repair", amount: 180 }],
            subtotal: 180,
            clientSignatureUrl: "data:image/png;base64,abc",
            createdAt: "2026-10-06T18:04:00.000Z",
          },
        ],
      },
      client,
      createWorkOrder(estimate),
    )
    assert.deepEqual(sheet.changeOrders, [
      {
        id: "co_rot",
        description: "Fascia wood rot repair",
        signedAt: "2026-10-06T18:04:00.000Z",
      },
    ])
    assert.equal(
      sheet.lineItems.some((item) => item.label === "Fascia wood rot repair"),
      false,
    )
    assert.equal(JSON.stringify(sheet.changeOrders).includes("180"), false)
    assert.equal(JSON.stringify(sheet).includes("$"), false)
    assert.equal(keysOf(sheet).includes("amount"), false)
    assert.equal(keysOf(sheet).includes("subtotal"), false)
  })
})
