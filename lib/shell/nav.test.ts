import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { listPaymentRows } from "../payments/ledger.ts"
import { calculateEstimate } from "../estimate/calculate.ts"
import { listActiveJobs } from "../work-orders/active.ts"
import { listProposals } from "../proposals/catalog.ts"
import { navigationLinks } from "./navigation.ts"
import type { Estimate } from "../types.ts"

describe("office nav data", () => {
  it("hides Clients from a project manager", () => {
    const owner = navigationLinks("owner").map((link) => link.name)
    const manager = navigationLinks("project_manager").map((link) => link.name)
    assert.deepEqual(owner, [
      "Dashboard",
      "Estimator",
      "Proposals",
      "Sales Pipeline",
      "Appointments",
      "Follow-ups",
      "Inbox",
      "Work Orders",
      "Dispatch & Map",
      "Clients",
      "Invoices & Payments",
      "Settings",
    ])
    assert.equal(manager.includes("Clients"), false)
    assert.equal(manager.includes("Appointments"), true)
    assert.equal(manager.length, owner.length - 1)
  })

  it("lists sent and accepted proposals", () => {
    const state = createSeedState()
    const proposals = listProposals(state.estimates, state.clients)
    assert.equal(proposals.some((proposal) => proposal.id === "est-ortiz"), true)
    assert.equal(proposals.some((proposal) => proposal.id === "est-lena"), true)
    assert.equal(proposals.some((proposal) => proposal.status === "draft"), false)
  })

  it("lists accepted jobs and leaves unsigned proposals off the active list", () => {
    const state = createSeedState()
    const jobs = listActiveJobs(state.estimates, state.workOrders, state.stages, state.clients)
    assert.deepEqual(
      jobs.map((job) => job.id).sort(),
      ["est-dental", "est-jim", "est-lena", "est-rosa"],
    )
    assert.equal(jobs.some((job) => job.id === "est-ortiz"), false)
    const lena = jobs.find((job) => job.id === "est-lena")
    assert.equal(lena?.status, "scheduled")
    assert.equal(lena?.clientName, "Lena Brooks")
  })

  it("builds invoice rows from the priced total minus the deposit already paid", () => {
    const state = createSeedState()
    const rows = listPaymentRows(state.estimates, state.clients, (estimate) => quoteTotal(state, estimate))
    assert.deepEqual(
      rows.map((row) => row.id).sort(),
      ["est-dental", "est-jim", "est-lena", "est-rosa"],
    )
    for (const row of rows) {
      assert.equal(row.paid, 0)
      assert.equal(row.balance, row.total)
      assert.ok(row.total > 0)
    }
  })
})

function quoteTotal(state: ReturnType<typeof createSeedState>, estimate: Estimate): number {
  return calculateEstimate({
    areas: estimate.areas,
    lineItems: estimate.lineItems,
    rates: estimate.rates,
    settings: estimate.settings,
    paymentMethods: state.paymentMethods,
  }).total
}
