import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { PAYMENT_METHODS } from "../defaults.ts"
import { calculateEstimate } from "../estimate/calculate.ts"
import { toCrewSheet } from "../work-orders/crew-sheet.ts"
import { applyChangeOrder } from "./apply.ts"
import { receiveChangeOrder } from "./receive.ts"

const signature = "data:image/png;base64,iVBORw0KGgo="

describe("receiveChangeOrder", () => {
  it("prices the items and rejects a missing signature", () => {
    const received = receiveChangeOrder("est-lena", {
      items: [
        { label: "Extra bedroom", amount: 400 },
        { description: "Hall touch-up", quantity: 2, unitPrice: 75.5 },
      ],
      subtotal: 551,
      clientSignatureUrl: signature,
    })
    assert.equal(received.ok, true)
    if (!received.ok) return
    assert.equal(received.changeOrder.subtotal, 551)
    assert.equal(received.changeOrder.estimateId, "est-lena")
    assert.equal(received.lineItems[0]?.customPrice, 400)
    assert.equal(received.lineItems[1]?.label, "Hall touch-up")

    const missing = receiveChangeOrder("est-lena", {
      items: [{ label: "Extra bedroom", amount: 400 }],
      subtotal: 400,
      clientSignatureUrl: "",
    })
    assert.equal(missing.ok, false)
  })

  it("adds the signed amount to the invoice and leaves the price off the crew sheet", () => {
    const state = createSeedState()
    const before = state.estimates.find((item) => item.id === "est-lena")
    assert.ok(before)
    const quoteBefore = calculateEstimate({
      areas: before.areas,
      lineItems: before.lineItems,
      rates: before.rates,
      settings: before.settings,
      paymentMethods: PAYMENT_METHODS,
    })
    const received = receiveChangeOrder("est-lena", {
      items: [{ label: "Closet interior", amount: 180 }],
      subtotal: 180,
      clientSignatureUrl: signature,
    })
    assert.equal(received.ok, true)
    if (!received.ok) return
    const applied = applyChangeOrder(state, received.changeOrder, received.lineItems)
    assert.equal(applied.ok, true)
    if (!applied.ok) return
    const estimate = applied.estimate
    const quoteAfter = calculateEstimate({
      areas: estimate.areas,
      lineItems: estimate.lineItems,
      rates: estimate.rates,
      settings: estimate.settings,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(Math.round((quoteAfter.total - quoteBefore.total) * 100) / 100, 180)
    const order = state.workOrders.find((item) => item.estimateId === "est-lena")
    assert.ok(order)
    const sheet = toCrewSheet(estimate, state.clients.find((client) => client.id === estimate.clientId), order)
    const added = sheet.changeOrders.find((order) => order.description === "Closet interior")
    assert.ok(added)
    assert.equal(sheet.lineItems.some((line) => line.label === "Closet interior"), false)
    assert.equal("amount" in added, false)
    assert.equal(JSON.stringify(sheet).includes("$"), false)
  })
})
