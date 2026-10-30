import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createOfficeLead } from "./office-lead.ts"
import type { ScopeState } from "../data/seed.ts"

function book(): ScopeState {
  return {
    version: 1,
    clients: [],
    stages: [{ id: "stage-lead", slug: "lead", name: "Lead", sortOrder: 0 }],
    estimates: [],
    workOrders: [],
    crews: [],
    productionRates: [],
    estimateSettings: {
      companyName: "ScopePipe",
      hourlyRate: 65,
      materialMarkup: 0,
      taxPercent: 0,
      depositPercent: 30,
      expiryDays: 30,
      discountPercent: 0,
      surchargePercent: 0,
    },
    paymentMethods: [],
  } as ScopeState
}

describe("office lead", () => {
  it("saves a customer from a phone call in New Lead", () => {
    const saved = createOfficeLead(book(), {
      name: " Maya Chen ",
      phone: "503-555-0100",
      email: "maya@example.com",
      address: "1842 Birch St",
      reachedBy: "call",
      now: "2026-10-30T12:00:00.000Z",
      id: "lead-1",
    })
    assert.equal(saved.ok, true)
    if (!saved.ok) return
    assert.equal(saved.state.clients[0]?.name, "Maya Chen")
    assert.equal(saved.state.clients[0]?.phone, "503-555-0100")
    assert.equal(saved.state.clients[0]?.email, "maya@example.com")
    const estimate = saved.state.estimates[0]
    assert.equal(estimate?.stageId, "stage-lead")
    assert.equal(estimate?.title, "1842 Birch St")
    assert.equal(estimate?.leadSource, "phone")
    assert.equal(estimate?.notes, "Reached by phone call.")
    assert.equal(estimate?.clientStatus, "draft")
  })

  it("asks for a name and a way to reach them", () => {
    const state = book()
    assert.deepEqual(createOfficeLead(state, { name: " ", phone: "", email: "", address: "", reachedBy: "text" }), {
      ok: false,
      reason: "Enter the customer's name.",
    })
    assert.deepEqual(
      createOfficeLead(state, { name: "Maya", phone: "", email: "maya", address: "", reachedBy: "text" }),
      { ok: false, reason: "The email needs an @." },
    )
    const texted = createOfficeLead(state, {
      name: "Maya",
      phone: "",
      email: "maya@example.com",
      address: "",
      reachedBy: "text",
    })
    assert.equal(texted.ok, true)
    if (!texted.ok) return
    assert.equal(texted.state.estimates[0]?.leadSource, "text")
    assert.equal(texted.state.estimates[0]?.title, "New lead")
    assert.equal(texted.state.estimates[0]?.notes, "Reached by text.")
  })
})
