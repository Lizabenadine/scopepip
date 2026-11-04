import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { paypalApiBase, paypalApproveLink, paypalCaptureReceipt, paypalOrderBody } from "./paypal.ts"

describe("PayPal checkout", () => {
  it("keeps sandbox and live on their own hosts", () => {
    assert.equal(paypalApiBase(false), "https://api-m.sandbox.paypal.com")
    assert.equal(paypalApiBase(true), "https://api-m.paypal.com")
  })

  it("ties the order to the estimate and the return page", () => {
    const body = paypalOrderBody({
      estimateId: "est-wade",
      amount: "588.75",
      returnUrl: "https://www.scopepipe.com/estimates/est-wade/pay?paypal=return",
      cancelUrl: "https://www.scopepipe.com/estimates/est-wade/pay?paypal=cancel",
    })
    assert.equal(body.purchase_units[0]?.custom_id, "est-wade")
    assert.equal(body.purchase_units[0]?.amount.value, "588.75")
    assert.equal(body.payment_source.paypal.experience_context.user_action, "PAY_NOW")
  })

  it("uses the PayPal approval link and ignores anything else", () => {
    assert.equal(
      paypalApproveLink([
        { rel: "self", href: "https://api-m.paypal.com/v2/checkout/orders/1" },
        { rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=1" },
      ]),
      "https://www.sandbox.paypal.com/checkoutnow?token=1",
    )
    assert.equal(paypalApproveLink([{ rel: "approve", href: "http://evil.test/pay" }]), null)
  })

  it("accepts a completed capture for this estimate and this amount", () => {
    const receipt = paypalCaptureReceipt(
      {
        status: "COMPLETED",
        purchase_units: [
          {
            custom_id: "est-wade",
            payments: {
              captures: [{ id: "cap-1", status: "COMPLETED", amount: { currency_code: "USD", value: "10.00" } }],
            },
          },
        ],
      },
      "est-wade",
      "10.00",
    )
    assert.deepEqual(receipt, { captureId: "cap-1", amount: 10 })
    assert.equal(
      paypalCaptureReceipt(
        {
          status: "COMPLETED",
          purchase_units: [
            {
              custom_id: "est-other",
              payments: { captures: [{ id: "cap-1", status: "COMPLETED", amount: { currency_code: "USD", value: "10.00" } }] },
            },
          ],
        },
        "est-wade",
        "10.00",
      ),
      null,
    )
  })
})
