import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { paddlePaidDeposit, paddleTransactionBody } from "./paddle-charge.ts"

describe("Paddle job deposit", () => {
  it("asks Paddle for this estimate and this amount", () => {
    const body = paddleTransactionBody("est-lena", 58875, "Deposit for Whole interior")
    assert.equal(body.custom_data.estimateId, "est-lena")
    assert.equal(body.items[0]?.price.unit_price.amount, "58875")
  })

  it("records a paid transaction only when the amount and estimate match", () => {
    const paid = {
      data: {
        id: "txn_01example",
        status: "completed",
        custom_data: { estimateId: "est-lena" },
        items: [{ price: { unit_price: { amount: "58875" } } }],
      },
    }
    assert.equal(paddlePaidDeposit(paid, "est-lena", 58875), "txn_01example")
    assert.equal(paddlePaidDeposit(paid, "est-lena", 100), null)
    assert.equal(paddlePaidDeposit({ data: { ...paid.data, status: "ready" } }, "est-lena", 58875), null)
  })
})
