import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { applyDeposit } from "./apply-deposit.ts"
import { clampDepositPercent, depositAmount, depositCents, receiptFromPaymentIntent } from "./deposit.ts"

describe("depositAmount", () => {
  it("charges the entered percent of the job and rounds to cents", () => {
    assert.equal(depositAmount(1207.5, 30), 362.25)
    assert.equal(depositCents(1207.5, 30), 36225)
    assert.equal(clampDepositPercent(10), 10)
    assert.equal(clampDepositPercent(12.5), 12.5)
    assert.equal(clampDepositPercent(150), 100)
    assert.equal(clampDepositPercent(Number.NaN), 30)
    assert.equal(depositAmount(1000, 10), 100)
    assert.equal(depositAmount(1000, 12.5), 125)
    assert.equal(depositAmount(1000, 50), 500)
  })
})

describe("applyDeposit", () => {
  it("records the receipt, schedules the job, and opens a work order", () => {
    const state = createSeedState()
    const accepted = {
      ...state,
      estimates: state.estimates.map((estimate) =>
        estimate.id === "est-ortiz" ? { ...estimate, clientStatus: "accepted" as const } : estimate,
      ),
      workOrders: state.workOrders.filter((order) => order.estimateId !== "est-ortiz"),
    }
    const paidAt = "2026-10-02T23:30:00.000Z"
    const result = applyDeposit(accepted, "est-ortiz", {
      paymentIntentId: "pi_test_ortiz",
      amount: 362.25,
      currency: "usd",
      depositPercent: 30,
      method: "card",
      paidAt,
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    const estimate = result.state.estimates.find((item) => item.id === "est-ortiz")
    assert.equal(estimate?.paymentStatus, "deposit_paid")
    assert.equal(estimate?.stageId, "stage-scheduled")
    assert.equal(estimate?.scheduledOn, "2026-10-02")
    assert.equal(estimate?.depositReceipt?.amount, 362.25)
    assert.equal(result.state.workOrders.some((order) => order.estimateId === "est-ortiz"), true)
  })

  it("reads a succeeded PaymentIntent into a receipt", () => {
    const parsed = receiptFromPaymentIntent(
      {
        id: "pi_test_ortiz",
        amount: 36225,
        currency: "usd",
        metadata: { estimateId: "est-ortiz", depositPercent: "30", method: "apple_pay" },
      },
      "2026-10-02T23:30:00.000Z",
    )
    assert.equal(parsed?.estimateId, "est-ortiz")
    assert.equal(parsed?.receipt.method, "apple_pay")
    assert.equal(parsed?.receipt.amount, 362.25)
  })
})
