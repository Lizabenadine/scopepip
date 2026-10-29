import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { PAYMENT_METHODS } from "../defaults.ts"
import { paintUpgradeLine } from "../defaults.ts"
import { listPaymentRows } from "../payments/ledger.ts"
import { quickBooksCredit } from "../quickbooks/invoice.ts"
import type { Estimate, LineItemInput } from "../types.ts"
import { toCrewSheet } from "../work-orders/crew-sheet.ts"
import { createWorkOrder } from "../work-orders/defaults.ts"
import { calculateEstimate } from "./calculate.ts"
import { pendingAmount, signPendingWork } from "./pending.ts"

const signature = "data:image/png;base64,iVBORw0KGgo="

function quote(estimate: Estimate): number {
  return calculateEstimate({
    areas: estimate.areas,
    lineItems: estimate.lineItems,
    rates: estimate.rates,
    settings: estimate.settings,
    paymentMethods: PAYMENT_METHODS,
  }).total
}

function acceptedJob(lines: LineItemInput[]): Estimate {
  const seed = createSeedState().estimates.find((item) => item.id === "est-jim")
  assert.ok(seed)
  return {
    ...seed,
    areas: [],
    lineItems: lines,
    settings: { ...seed.settings, minimumJobCharge: 0, taxPercent: 0, priceRounding: "none" },
    changeOrders: [],
    credits: [],
  }
}

describe("pending additional work", () => {
  it("keeps a pending line off the invoice until the customer signs", () => {
    const included = { ...paintUpgradeLine("included"), customPrice: 500 }
    const extra = { ...paintUpgradeLine("closet"), label: "Closet shelves", customPrice: 180, pending: true }
    const estimate = acceptedJob([included, extra])
    assert.equal(pendingAmount(extra, estimate.settings), 180)
    assert.equal(quote(estimate), 500)

    const signed = signPendingWork(estimate, { lineIds: ["closet"], clientSignatureUrl: signature, now: new Date("2026-10-25T12:00:00.000Z") })
    assert.equal(signed.ok, true)
    if (!signed.ok) return
    assert.equal(signed.changeOrder?.subtotal, 180)
    assert.equal(signed.estimate.lineItems.find((line) => line.id === "closet")?.pending, false)
    assert.equal(quote(signed.estimate), 680)

    const sheet = toCrewSheet(signed.estimate, undefined, createWorkOrder(signed.estimate))
    assert.equal(sheet.changeOrders.some((order) => order.description === "Closet shelves"), true)
    assert.equal(JSON.stringify(sheet.changeOrders).includes("180"), false)
    assert.equal(JSON.stringify(sheet.pendingWork).includes("180"), false)
    assert.equal(JSON.stringify(sheet).includes("$"), false)
  })

  it("turns a negative pending amount into a credit and leaves the priced total alone", () => {
    const included = { ...paintUpgradeLine("included"), customPrice: 500 }
    const reduction = { ...paintUpgradeLine("credit-line"), label: "Skipped closet", customPrice: -40, pending: true }
    const estimate = acceptedJob([included, reduction])
    assert.equal(quote(estimate), 500)

    const held = toCrewSheet(estimate, undefined, createWorkOrder(estimate))
    assert.equal(held.pendingWork.some((item) => item.label === "Skipped closet"), true)
    assert.equal(JSON.stringify(held.pendingWork).includes("40"), false)
    assert.equal(JSON.stringify(held).includes("$"), false)

    const signed = signPendingWork(estimate, { lineIds: ["credit-line"], clientSignatureUrl: signature })
    assert.equal(signed.ok, true)
    if (!signed.ok) return
    assert.equal(signed.changeOrder, null)
    assert.equal(signed.credits[0]?.amount, 40)
    assert.equal(signed.estimate.lineItems.some((line) => line.id === "credit-line"), false)
    assert.equal(quote(signed.estimate), 500)

    const rows = listPaymentRows([signed.estimate], createSeedState().clients, () => quote(signed.estimate))
    assert.equal(rows[0]?.credit, 40)
    assert.equal(rows[0]?.balance, 460)

    const sheet = toCrewSheet(signed.estimate, undefined, createWorkOrder(signed.estimate))
    assert.equal(sheet.changeOrders.some((order) => order.description === "Credit: Skipped closet"), true)
    assert.equal(JSON.stringify(sheet.changeOrders).includes("40"), false)
    assert.equal(JSON.stringify(sheet).includes("$"), false)
  })

  it("rejects a signature before the job is accepted", () => {
    const estimate = acceptedJob([{ ...paintUpgradeLine("closet"), customPrice: 180, pending: true }])
    const open = signPendingWork(
      { ...estimate, clientStatus: "sent", acceptedAt: null },
      { lineIds: ["closet"], clientSignatureUrl: signature },
    )
    assert.equal(open.ok, false)
    const missing = signPendingWork(estimate, { lineIds: ["closet"], clientSignatureUrl: "" })
    assert.equal(missing.ok, false)
  })

  it("builds a QuickBooks credit memo for a positive credit amount", () => {
    const draft = quickBooksCredit({
      estimateId: "est-jim",
      creditId: "credit_abc",
      customerName: "Jim Patel",
      email: "jim@patel.test",
      description: "Skipped closet",
      amount: 40,
    })
    assert.equal(draft?.amount, 40)
    assert.equal(draft?.creditId, "credit_abc")
    assert.equal(
      quickBooksCredit({
        estimateId: "est-jim",
        creditId: "credit_abc",
        customerName: "Jim Patel",
        email: "",
        description: "Skipped closet",
        amount: -40,
      }),
      null,
    )
  })
})
