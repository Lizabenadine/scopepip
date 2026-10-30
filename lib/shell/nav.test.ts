import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { listPaymentRows } from "../payments/ledger.ts"
import { calculateEstimate } from "../estimate/calculate.ts"
import { listActiveJobs } from "../work-orders/active.ts"
import { listProposals } from "../proposals/catalog.ts"
import { bookForEstimator, roleCanOpen } from "../auth/access.ts"
import { navigationSections } from "./navigation.ts"
import type { Estimate } from "../types.ts"

describe("office nav data", () => {
  it("groups the office the way a painting crm splits the day", () => {
    const owner = navigationSections("owner")
    const manager = navigationSections("project_manager")
    assert.deepEqual(
      owner.map((section) => section.name),
      ["Dashboard", "Sales", "Jobs", "Daily", "Documents", "Settings"],
    )
    assert.deepEqual(owner.find((section) => section.name === "Sales")?.links.map((link) => link.name), [
      "Sales Pipeline",
      "Estimator",
      "Clients",
    ])
    assert.deepEqual(owner.find((section) => section.name === "Jobs")?.links.map((link) => link.name), [
      "Work Orders",
      "Dispatch & Map",
    ])
    assert.deepEqual(owner.find((section) => section.name === "Daily")?.links.map((link) => link.name), [
      "Appointments",
      "Inbox",
      "Follow-ups",
    ])
    assert.deepEqual(owner.find((section) => section.name === "Documents")?.links.map((link) => link.name), [
      "Proposals",
      "Invoices & Payments",
    ])
    assert.deepEqual(
      manager.map((section) => section.name),
      ["Jobs", "Invoices"],
    )
    assert.deepEqual(manager.find((section) => section.name === "Jobs")?.links.map((link) => link.name), [
      "Progress jobs",
      "Work Orders",
    ])
    assert.equal(manager.find((section) => section.name === "Invoices")?.href, "/payments")
    const estimator = navigationSections("estimator")
    assert.deepEqual(estimator.find((section) => section.name === "Jobs")?.links.map((link) => link.name), [
      "Work Orders",
    ])
    assert.equal(roleCanOpen("estimator", "/work-orders/est-lena"), true)
    assert.equal(roleCanOpen("estimator", "/dispatch"), false)
    assert.equal(roleCanOpen("project_manager", "/work-orders"), true)
    assert.equal(roleCanOpen("estimator", "/help"), true)
    assert.equal(roleCanOpen("project_manager", "/help"), true)
  })

  it("lets an estimator change the work order notes and leaves the crew assignment alone", () => {
    const state = createSeedState()
    const order = state.workOrders.find((item) => item.estimateId === "est-lena")
    assert.ok(order)
    const next = {
      ...state,
      workOrders: state.workOrders.map((item) =>
        item.estimateId === "est-lena"
          ? { ...item, prepNotes: "Keep the closet shelves.", assignedCrewId: "crew-other", status: "complete" as const }
          : item,
      ),
    }
    const saved = bookForEstimator(state, next, "estimator-1").workOrders.find((item) => item.estimateId === "est-lena")
    assert.equal(saved?.prepNotes, "Keep the closet shelves.")
    assert.equal(saved?.assignedCrewId, order.assignedCrewId)
    assert.equal(saved?.status, "complete")
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
