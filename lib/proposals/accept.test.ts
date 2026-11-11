import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { PAYMENT_METHODS } from "../defaults.ts"
import { jobStageOf, salesStageOf } from "../pipeline/board.ts"
import { toCrewSheet } from "../work-orders/crew-sheet.ts"
import { applyAcceptance } from "./accept.ts"
import { proposalFigures } from "./figures.ts"

const signedAt = "2026-10-02T20:00:00.000Z"

describe("applyAcceptance", () => {
  it("marks the proposal accepted, stores the signature, and keeps a work order", () => {
    const state = createSeedState()
    const before = state.workOrders.filter((order) => order.estimateId === "est-ortiz")
    const stripped = {
      ...state,
      workOrders: state.workOrders.filter((order) => order.estimateId !== "est-ortiz"),
    }
    const result = applyAcceptance(stripped, "k7m2p9qx4n", {
      signedName: "Alex Ortiz",
      signaturePayload: "typed:Alex Ortiz",
      signedAt,
      selectedLineIds: ["ortiz-trim"],
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    const estimate = result.state.estimates.find((item) => item.id === "est-ortiz")
    assert.equal(estimate?.clientStatus, "accepted")
    assert.equal(estimate?.acceptedAt, signedAt)
    assert.equal(estimate?.signature?.signedName, "Alex Ortiz")
    assert.equal(estimate?.signature?.signaturePayload, "typed:Alex Ortiz")
    assert.equal(estimate?.lineItems.find((item) => item.id === "ortiz-trim")?.selected, true)
    assert.equal(estimate?.lineItems.find((item) => item.id === "ortiz-wash")?.selected, false)
    assert.equal(before.length, 1)
    assert.equal(result.state.workOrders.some((order) => order.estimateId === "est-ortiz"), true)
    const quote = proposalFigures(estimate!, PAYMENT_METHODS, estimate!.signature?.selectedLineIds ?? []).quote
    assert.equal(quote.lineItems.some((line) => line.label === "Pressure washing"), false)
    assert.equal(quote.lineItems.some((line) => line.label === "Trim package"), true)
    assert.equal(quote.lineItems.some((line) => line.label === "Accent wall"), false)
    const order = result.state.workOrders.find((item) => item.estimateId === "est-ortiz")
    assert.ok(order)
    const sheet = toCrewSheet(estimate!, result.state.clients.find((client) => client.id === "client-ortiz"), order)
    const packed = JSON.stringify(sheet)
    assert.equal(packed.includes("$"), false)
    assert.equal(packed.includes("price"), false)
    assert.equal(packed.includes("laborCost"), false)
    assert.equal(sheet.lineItems.some((line) => line.label === "Trim package"), true)
    assert.equal(sheet.lineItems.some((line) => line.label === "Accent wall"), false)
    assert.equal(estimate?.versions?.some((version) => version.approved), true)
    assert.equal(salesStageOf(estimate!), null)
    const stage = result.state.stages.find((item) => item.id === estimate?.stageId)
    assert.equal(stage?.slug, "scheduled")
    assert.equal(jobStageOf(estimate!, order, stage?.slug), "project_scheduled")
    assert.equal(estimate?.scheduledOn, null)
    assert.equal(order?.status, "unscheduled")
    assert.equal(order?.scheduledStartDate, null)
    const edited = {
      ...estimate!,
      areas: estimate!.areas.map((area) => ({ ...area, name: "Changed after signing" })),
      lineItems: [
        ...estimate!.lineItems,
        {
          ...estimate!.lineItems[0]!,
          id: "change-closet",
          label: "Closet interior",
          optional: false,
          selected: true,
        },
      ],
    }
    const locked = toCrewSheet(edited, result.state.clients.find((client) => client.id === "client-ortiz"), order)
    assert.equal(locked.areas.some((area) => area.name === "Unit 4"), true)
    assert.equal(locked.areas.some((area) => area.name === "Changed after signing"), false)
    assert.equal(locked.lineItems.some((line) => line.label === "Closet interior"), true)
    assert.equal(locked.estimateId, estimate?.id)
  })

  it("recalculates the total and deposit when optional add-ons change", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-ortiz")
    assert.ok(estimate)
    const withDefaults = proposalFigures(estimate, PAYMENT_METHODS, ["ortiz-trim", "ortiz-wash"])
    const withoutTrim = proposalFigures(estimate, PAYMENT_METHODS, ["ortiz-wash"])
    const withAccent = proposalFigures(estimate, PAYMENT_METHODS, ["ortiz-trim", "ortiz-wash", "ortiz-accent"])
    assert.ok(withoutTrim.quote.total < withDefaults.quote.total)
    assert.ok(withoutTrim.deposit < withDefaults.deposit)
    assert.ok(withAccent.quote.total > withDefaults.quote.total)
    assert.ok(withAccent.deposit > withDefaults.deposit)
    assert.equal(withDefaults.depositPercent, 30)
    assert.equal(estimate.lineItems.some((item) => item.label === "Accent wall" && item.optional), true)
  })

  it("rejects a second signature cleanly without duplicating work orders or altering job stage", () => {
    const state = createSeedState()
    const first = applyAcceptance(state, "k7m2p9qx4n", {
      signedName: "Alex Ortiz",
      signaturePayload: "typed:Alex Ortiz",
      signedAt,
      selectedLineIds: ["ortiz-trim"],
    })
    assert.equal(first.ok, true)
    if (!first.ok) return
    const workOrderCount = first.state.workOrders.filter((o) => o.estimateId === "est-ortiz").length
    assert.equal(workOrderCount, 1)

    // Advance manually to in_progress, then replay acceptance
    const inProgressState = {
      ...first.state,
      workOrders: first.state.workOrders.map((o) =>
        o.estimateId === "est-ortiz" ? { ...o, status: "in_progress" as const, scheduledStartDate: "2026-10-12" } : o,
      ),
    }
    const replay = applyAcceptance(inProgressState, "k7m2p9qx4n", {
      signedName: "Alex Ortiz",
      signaturePayload: "typed:Alex Ortiz",
      signedAt: "2026-10-03T10:00:00.000Z",
      selectedLineIds: [],
    })
    assert.equal(replay.ok, false)
    assert.equal(inProgressState.workOrders.filter((o) => o.estimateId === "est-ortiz").length, 1)
    assert.equal(
      inProgressState.workOrders.find((o) => o.estimateId === "est-ortiz")?.status,
      "in_progress",
    )

    const existing = applyAcceptance(state, "a4c8e1b7d092", {
      signedName: "Someone Else",
      signaturePayload: "typed:Someone Else",
      signedAt,
      selectedLineIds: [],
    })
    assert.equal(existing.ok, false)
  })
})
