import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { recordStageChanges } from "../clients/activity.ts"
import { createSeedState } from "../data/seed.ts"
import { boardColumns, buildPipeline, cardTradesOf, OPEN_FILTERS } from "./board.ts"
import { listProposals } from "../proposals/catalog.ts"
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

  it("deletes only the selected card from sales pipeline even when two cards look identical, keeping client, estimate, proposals and signatures intact", () => {
    const state = createSeedState()
    const TODAY = "2026-10-02"

    // Create a duplicate identical-looking estimate for Maya Chen
    const maya1 = state.estimates.find((e) => e.id === "est-maya")!
    const maya2 = {
      ...maya1,
      id: "est-maya-duplicate",
      // Identical title, client, lines, price
    }
    state.estimates.push(maya2)

    // Verify both appear in cold column
    const beforePipeline = buildPipeline(state, "sales", OPEN_FILTERS, TODAY)
    const coldBefore = beforePipeline.find((c) => c.id === "cold")!
    const coldCardsBefore = coldBefore.cards.filter((c) => c.clientName === "Maya Chen")
    assert.equal(coldCardsBefore.length, 2, "Two identical Maya Chen cards should exist on the board")
    const countBefore = coldBefore.cards.length
    const totalBefore = coldBefore.total
    const singleCardTotal = coldCardsBefore[0]!.total

    // Simulate deletePipelineCard targeting ONLY the first card (maya1.id)
    const now = new Date().toISOString()
    const updatedState = {
      ...state,
      estimates: state.estimates.map((e) =>
        e.id === maya1.id
          ? { ...e, salesCardDeleted: true, boardColumnId: null, updatedAt: now }
          : e,
      ),
    }

    // Build pipeline after deletion
    const afterPipeline = buildPipeline(updatedState, "sales", OPEN_FILTERS, TODAY)
    const coldAfter = afterPipeline.find((c) => c.id === "cold")!

    // Verify only the selected card is removed
    const maya1OnBoard = afterPipeline.flatMap((c) => c.cards).find((c) => c.estimateId === maya1.id)
    assert.equal(maya1OnBoard, undefined, "Selected card est-maya must be removed from the pipeline")

    // Verify the second identical-looking card is STILL on the pipeline
    const maya2OnBoard = afterPipeline.flatMap((c) => c.cards).find((c) => c.estimateId === maya2.id)
    assert.ok(maya2OnBoard, "Second identical card est-maya-duplicate must stay on the pipeline")
    assert.equal(maya2OnBoard?.clientName, "Maya Chen")

    // Verify column count and total updated immediately
    assert.equal(coldAfter.cards.length, countBefore - 1, "Cold column count must decrease by 1")
    assert.equal(
      coldAfter.total,
      Math.round((totalBefore - singleCardTotal) * 100) / 100,
      "Cold column total must decrease by the deleted card amount",
    )

    // Verify client record remains completely intact
    const client = updatedState.clients.find((c) => c.id === maya1.clientId)
    assert.ok(client, "Client record must remain intact")
    assert.equal(client?.name, "Maya Chen")

    // Verify the underlying estimate remains in state.estimates
    const est = updatedState.estimates.find((e) => e.id === maya1.id)
    assert.ok(est, "Estimate record must remain intact in estimates")
    assert.equal(est?.title, maya1.title)
    assert.equal(est?.areas.length, maya1.areas.length)

    // Verify proposals catalog still includes it
    const proposals = listProposals(updatedState.estimates, updatedState.clients, { includeDrafts: true })
    assert.ok(proposals.some((p: { id: string }) => p.id === maya1.id), "Proposal for maya1 must remain intact")
    assert.ok(proposals.some((p: { id: string }) => p.id === maya2.id), "Proposal for maya2 must remain intact")
  })

  it("filters sales pipeline by trade, shows multi-trade proposal on one card counting once under All trades, and updates column counts and totals", () => {
    const state = createSeedState()
    const TODAY = "2026-10-02"

    // Setup:
    // 1. Single-trade Painting lead: est-maya -> trades: ["painting"]
    // 2. Multi-trade Painting + Drywall lead: est-sam -> trades: ["painting", "drywall"]
    // 3. Single-trade Flooring lead: est-wade -> trades: ["flooring"]
    // 4. Unassigned lead (no trades): est-cole -> trades: undefined, primaryTrade: undefined
    const maya = state.estimates.find((e) => e.id === "est-maya")!
    maya.trades = ["painting"]

    const sam = state.estimates.find((e) => e.id === "est-sam")!
    sam.trades = ["painting", "drywall"]

    const wade = state.estimates.find((e) => e.id === "est-wade")!
    wade.trades = ["flooring"]

    const cole = state.estimates.find((e) => e.id === "est-cole")!
    delete cole.trades
    delete cole.primaryTrade

    // Helper checks
    assert.deepEqual(cardTradesOf(maya), ["painting"])
    assert.deepEqual(cardTradesOf(sam), ["painting", "drywall"])
    assert.deepEqual(cardTradesOf(wade), ["flooring"])
    assert.deepEqual(cardTradesOf(cole), [])

    // 1. "All trades": all cards visible, multi-trade card appears once and counts once
    const allPipeline = buildPipeline(state, "sales", { ...OPEN_FILTERS, trade: "all" }, TODAY)
    const allCards = allPipeline.flatMap((col) => col.cards)
    const samAllCount = allCards.filter((c) => c.estimateId === "est-sam").length
    assert.equal(samAllCount, 1, "Multi-trade card est-sam must appear and count exactly once under All trades")

    const coldAll = allPipeline.find((col) => col.id === "cold")!
    assert.equal(coldAll.cards.length, 2, "Cold column should contain both maya and sam")
    const coldAllTotal = coldAll.total

    // 2. "Painting" filter: maya (painting) and sam (painting + drywall) must appear
    const paintingPipeline = buildPipeline(state, "sales", { ...OPEN_FILTERS, trade: "painting" }, TODAY)
    const paintingCards = paintingPipeline.flatMap((col) => col.cards)
    assert.ok(paintingCards.some((c) => c.estimateId === "est-maya"), "Maya must appear in Painting filter")
    assert.ok(paintingCards.some((c) => c.estimateId === "est-sam"), "Sam (Painting+Drywall) must appear in Painting filter")
    assert.equal(paintingCards.some((c) => c.estimateId === "est-wade"), false, "Wade (Flooring) must NOT appear in Painting filter")
    assert.equal(paintingCards.some((c) => c.estimateId === "est-cole"), false, "Cole (Unassigned) must NOT appear in Painting filter")

    // 3. "Drywall" filter: sam (painting + drywall) must appear, maya and wade must not
    const drywallPipeline = buildPipeline(state, "sales", { ...OPEN_FILTERS, trade: "drywall" }, TODAY)
    const drywallCards = drywallPipeline.flatMap((col) => col.cards)
    assert.ok(drywallCards.some((c) => c.estimateId === "est-sam"), "Sam must appear in Drywall filter")
    assert.equal(drywallCards.some((c) => c.estimateId === "est-maya"), false, "Maya must NOT appear in Drywall filter")
    assert.equal(drywallCards.some((c) => c.estimateId === "est-wade"), false, "Wade must NOT appear in Drywall filter")

    // 4. "Flooring" filter: wade must appear in warm column
    const flooringPipeline = buildPipeline(state, "sales", { ...OPEN_FILTERS, trade: "flooring" }, TODAY)
    const flooringCards = flooringPipeline.flatMap((col) => col.cards)
    assert.ok(flooringCards.some((c) => c.estimateId === "est-wade"), "Wade must appear in Flooring filter")
    assert.equal(flooringCards.some((c) => c.estimateId === "est-maya"), false, "Maya must NOT appear in Flooring filter")

    // 5. "Unassigned" filter: cole must appear in estimate_scheduled, others must not
    const unassignedPipeline = buildPipeline(state, "sales", { ...OPEN_FILTERS, trade: "unassigned" }, TODAY)
    const unassignedCards = unassignedPipeline.flatMap((col) => col.cards)
    assert.ok(unassignedCards.some((c) => c.estimateId === "est-cole"), "Cole must appear in Unassigned filter")
    assert.equal(unassignedCards.some((c) => c.estimateId === "est-maya"), false, "Maya must NOT appear in Unassigned filter")
    assert.equal(unassignedCards.some((c) => c.estimateId === "est-sam"), false, "Sam must NOT appear in Unassigned filter")

    // 6. Verify column counts and totals reflect currently visible cards
    const coldPainting = paintingPipeline.find((col) => col.id === "cold")!
    assert.equal(coldPainting.cards.length, 2)
    assert.equal(coldPainting.total, coldAllTotal)

    const coldDrywall = drywallPipeline.find((col) => col.id === "cold")!
    assert.equal(coldDrywall.cards.length, 1)
    const samCard = coldDrywall.cards[0]!
    assert.equal(samCard.estimateId, "est-sam")
    assert.equal(coldDrywall.total, samCard.total)

    const coldFlooring = flooringPipeline.find((col) => col.id === "cold")!
    assert.equal(coldFlooring.cards.length, 0)
    assert.equal(coldFlooring.total, 0)
  })
})
