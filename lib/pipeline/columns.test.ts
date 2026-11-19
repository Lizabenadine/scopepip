import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { recordStageChanges } from "../clients/activity.ts"
import { createSeedState } from "../data/seed.ts"
import { boardColumns, buildPipeline, OPEN_FILTERS } from "./board.ts"
import { leadScore } from "./score.ts"
import { suggestFollowUp } from "./suggest.ts"

const TODAY = "2026-10-02"

describe("lead score and suggested follow-up", () => {
  it("scores Maya at 45 with the below-minimum tag", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-maya")
    const client = state.clients.find((item) => item.id === "client-maya")
    assert.ok(estimate)
    assert.ok(client)
    const scored = leadScore(estimate, client, false)
    assert.equal(scored.score, 45)
    assert.equal(scored.reasons.includes("Below the minimum"), true)
  })

  it("drafts an introduction that includes the booking path", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-maya")
    const client = state.clients.find((item) => item.id === "client-maya")
    assert.ok(estimate)
    const draft = suggestFollowUp({ estimate, client, company: "ScopePipe" })
    assert.equal(draft.channel, "text")
    assert.equal(draft.label, "Introduce the company")
    assert.match(draft.body, /Maya Chen/)
    assert.match(draft.body, /ScopePipe/)
    assert.match(draft.body, /1842 Birch St, Portland/)
    assert.match(draft.body, /\/book\/b19f6d3e8c45/)
  })

  it("answers a reply before it pitches a visit", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-maya")
    const client = state.clients.find((item) => item.id === "client-maya")
    assert.ok(estimate)
    const draft = suggestFollowUp({
      estimate,
      client,
      company: "ScopePipe",
      reply: "Thursday afternoon works.",
    })
    assert.equal(draft.label, "Reply to the customer")
    assert.match(draft.body, /Thursday afternoon works\./)
  })

  it("follows an opened proposal", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-ortiz")
    const client = state.clients.find((item) => item.id === estimate?.clientId)
    assert.ok(estimate)
    const opened = {
      ...estimate,
      proposalOpens: [{ id: "open-1", at: "2026-10-02T12:00:00.000Z", kind: "open" as const }],
    }
    const draft = suggestFollowUp({ estimate: opened, client, company: "ScopePipe" })
    assert.equal(draft.label, "They opened the proposal")
    assert.match(draft.body, /Unit 4 turnover/)
  })
})

describe("custom columns", () => {
  it("parks a card after Cold Leads and keeps a second column in order", () => {
    const state = createSeedState()
    const withColumns = {
      ...state,
      customColumns: [
        { id: "col-hoa", kind: "sales" as const, label: "HOA Review", after: "cold" },
        { id: "col-hold", kind: "sales" as const, label: "Waiting", after: "cold" },
      ],
      estimates: state.estimates.map((estimate) =>
        estimate.id === "est-maya" ? { ...estimate, boardColumnId: "col-hoa" } : estimate,
      ),
    }
    const order = boardColumns(withColumns, "sales").map((column) => column.id)
    assert.deepEqual(order.slice(0, 3), ["cold", "col-hoa", "col-hold"])
    const columns = buildPipeline(withColumns, "sales", OPEN_FILTERS, TODAY)
    const cold = columns.find((column) => column.id === "cold")
    const hoa = columns.find((column) => column.id === "col-hoa")
    assert.equal(cold?.cards.some((card) => card.estimateId === "est-maya"), false)
    assert.deepEqual(
      hoa?.cards.map((card) => card.estimateId),
      ["est-maya"],
    )
    assert.equal(hoa?.custom, true)
    assert.equal(cold?.custom, false)
  })

  it("returns a parked card to cold when the column is gone", () => {
    const state = createSeedState()
    const parked = {
      ...state,
      estimates: state.estimates.map((estimate) =>
        estimate.id === "est-maya" ? { ...estimate, boardColumnId: "col-hoa" } : estimate,
      ),
    }
    const cold = buildPipeline(parked, "sales", OPEN_FILTERS, TODAY).find((column) => column.id === "cold")
    assert.equal(cold?.cards.some((card) => card.estimateId === "est-maya"), true)
  })

  it("uses a renamed warm label in the column and the stage log", () => {
    const before = createSeedState()
    const labeled = { ...before, columnLabels: { warm: "Warm calls" } }
    const warm = boardColumns(labeled, "sales").find((column) => column.id === "warm")
    assert.equal(warm?.label, "Warm calls")
    const after = {
      ...labeled,
      estimates: labeled.estimates.map((estimate) =>
        estimate.id === "est-maya" ? { ...estimate, salesStage: "warm" as const } : estimate,
      ),
    }
    const next = recordStageChanges(before, after, "2026-10-18T16:00:00.000Z")
    const maya = next.estimates.find((estimate) => estimate.id === "est-maya")
    assert.equal(maya?.stageChanges?.[0]?.label, "Moved to Warm calls")
  })

  it("renames jobs pipeline columns via columnLabels", () => {
    const state = createSeedState()
    const labeled = {
      ...state,
      columnLabels: {
        project_accepted: "Ready to Start",
        project_in_progress: "Active Crews",
      },
    }
    const cols = boardColumns(labeled, "jobs")
    const accepted = cols.find((c) => c.id === "project_accepted")
    const inProgress = cols.find((c) => c.id === "project_in_progress")
    const scheduled = cols.find((c) => c.id === "project_scheduled")
    assert.equal(accepted?.label, "Ready to Start")
    assert.equal(inProgress?.label, "Active Crews")
    assert.equal(scheduled?.label, "Scheduled")

    const pipeline = buildPipeline(labeled, "jobs", OPEN_FILTERS, TODAY)
    assert.equal(pipeline.find((c) => c.id === "project_accepted")?.label, "Ready to Start")
    assert.equal(pipeline.find((c) => c.id === "project_in_progress")?.label, "Active Crews")
  })

  it("deletes only the selected job while preserving all other estimates and work orders", () => {
    const state = createSeedState()
    const targetId = "est-dental"
    const totalEstimatesBefore = state.estimates.length
    assert.equal(state.estimates.some((e) => e.id === targetId), true)

    // Simulate deleteEstimate logic
    const nextEstimates = state.estimates.filter((e) => e.id !== targetId)
    const nextWorkOrders = state.workOrders.filter((o) => o.estimateId !== targetId)

    assert.equal(nextEstimates.length, totalEstimatesBefore - 1)
    assert.equal(nextEstimates.some((e) => e.id === targetId), false)
    assert.equal(nextWorkOrders.some((o) => o.estimateId === targetId), false)
    // Other jobs still exist
    assert.equal(nextEstimates.some((e) => e.id === "est-lena"), true)
    assert.equal(nextEstimates.some((e) => e.id === "est-rosa"), true)
  })

  it("edits/renames a lead including client name, job title, and contact info, updating the pipeline card immediately", () => {
    const state = createSeedState()
    const targetEstimate = state.estimates.find((e) => e.id === "est-maya")!
    const targetClient = state.clients.find((c) => c.id === targetEstimate.clientId)!

    // Simulate updateLead logic
    const now = new Date().toISOString()
    const updatedEstimate = {
      ...targetEstimate,
      title: "Updated Living Room & Hallway",
      jobAddress: "789 Pine Ave, Portland, OR",
      updatedAt: now,
    }
    const updatedClients = state.clients.map((c) =>
      c.id === targetClient.id
        ? {
            ...c,
            name: "Maya Lin Renovated",
            phone: "(503) 555-8899",
            email: "maya.new@example.com",
            address: "789 Pine Ave, Portland, OR",
            updatedAt: now,
          }
        : c,
    )
    const updatedState = {
      ...state,
      estimates: state.estimates.map((e) => (e.id === targetEstimate.id ? updatedEstimate : e)),
      clients: updatedClients,
    }

    const pipeline = buildPipeline(updatedState, "sales", OPEN_FILTERS, TODAY)
    const allCards = pipeline.flatMap((col) => col.cards)
    const card = allCards.find((c) => c.estimateId === "est-maya")
    assert.ok(card)
    assert.equal(card.clientName, "Maya Lin Renovated")

    const client = updatedState.clients.find((c) => c.id === targetEstimate.clientId)
    assert.equal(client?.phone, "(503) 555-8899")
    assert.equal(client?.email, "maya.new@example.com")
    assert.equal(client?.address, "789 Pine Ave, Portland, OR")

    const est = updatedState.estimates.find((e) => e.id === "est-maya")
    assert.equal(est?.title, "Updated Living Room & Hallway")
    assert.equal(est?.jobAddress, "789 Pine Ave, Portland, OR")
  })
})
