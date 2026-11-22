import test from "node:test"
import assert from "node:assert/strict"
import { createBlankFlooringScope, createBlankFlooringRoom } from "../flooring/defaults.ts"
import { createBlankDrywallScope, createBlankDrywallRoom } from "../drywall/defaults.ts"
import { recomputeRoomGeometry } from "../flooring/calculate.ts"
import { recomputeDrywallRoomGeometry } from "../drywall/calculate.ts"
import { defaultChecklist, createWorkOrder } from "../work-orders/defaults.ts"
import { applyAcceptance } from "../proposals/accept.ts"
import { calculateMultiTradeQuote } from "./multi-trade.ts"
import { proposalFigures } from "../proposals/figures.ts"
import type { Estimate } from "../types.ts"
import type { ScopeState } from "../data/seed.ts"

test("Flooring Proposal Workflow: Customer data, draft saving, proposal figures, signature and work order", () => {
  const flooringScope = createBlankFlooringScope()
  const baseRoom = createBlankFlooringRoom("Living Room")
  flooringScope.rooms = [
    recomputeRoomGeometry({
      ...baseRoom,
      length: { feet: 20, inches: 0 },
      width: { feet: 15, inches: 0 },
      materialType: "lvp",
      materialName: "Rigid Core LVP",
      materialCostPerSqFt: 3.25,
      installCostPerSqFt: 2.5,
      includeBaseboard: true,
      baseboardCostPerFt: 1.75,
      transitions: [
        {
          id: "t-1",
          type: "t_molding",
          label: "Hallway T-Molding",
          pieces: 2,
          costPerPiece: 25,
        },
      ],
    }),
  ]

  const estimate: Estimate = {
    id: "est-fl-test-1",
    clientId: "client-fl-1",
    stageId: "lead",
    title: "Living Room Flooring Installation",
    jobAddress: "742 Evergreen Terrace",
    trades: ["flooring"],
    primaryTrade: "flooring",
    flooringScope,
    estimateKind: "interior",
    areas: [],
    lineItems: [],
    rates: [],
    settings: {
      hourlyRate: 65,
      hourRounding: 0.5,
      priceRounding: "none",
      materialRounding: "none",
      taxPercent: 0,
      discountKind: "percent",
      discountValue: 0,
      paymentMethodId: "check",
      surchargePercent: 0,
      expiryDays: 30,
      materialMarkup: 15,
      taxBasis: "materials_only",
      minimumJobCharge: 0,
      depositPercent: 25,
    },
    scheduledOn: null,
    notes: "Move sofa and TV console prior to install",
    crewNote: "Subfloor is concrete slab - check moisture reading",
    acceptedAt: null,
    publicToken: "tok-fl-test-1",
    clientStatus: "draft",
    signature: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 1. Proposal Figures
  const figures = proposalFigures(estimate, [], [])
  assert.ok(figures.quote.total > 0, "Flooring proposal total is calculated")
  assert.equal(figures.quote.areas.length, 0, "No painting areas in standalone flooring")
  assert.ok(figures.multiTradeQuote, "Multi-trade quote object is produced")
  assert.equal(figures.depositPercent, 25, "Deposit percent is respected")

  // 2. Acceptance & Electronic Signature
  const mockState: ScopeState = {
    estimates: [estimate],
    clients: [
      {
        id: "client-fl-1",
        name: "Homer Simpson",
        email: "homer@example.com",
        phone: "555-7334",
        address: "742 Evergreen Terrace",
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    stages: [
      { id: "lead", slug: "lead", label: "Lead", column: "leads", order: 1 },
      { id: "scheduled", slug: "scheduled", label: "Scheduled", column: "production", order: 2 },
    ],
    workOrders: [],
    paymentMethods: [],
  } as unknown as ScopeState

  const acceptance = applyAcceptance(mockState, "tok-fl-test-1", {
    signedName: "Homer Simpson",
    signaturePayload: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    signedAt: new Date().toISOString(),
    selectedLineIds: [],
  })

  assert.ok(acceptance.ok, "Flooring proposal accepted successfully")
  if (acceptance.ok) {
    const updated = acceptance.state.estimates.find((e) => e.id === "est-fl-test-1")
    assert.equal(updated?.clientStatus, "accepted")
    assert.equal(updated?.signature?.signedName, "Homer Simpson")
    assert.ok(acceptance.state.workOrders.length > 0, "Work order created on acceptance")
    const order = acceptance.state.workOrders[0]
    assert.equal(order.estimateId, "est-fl-test-1")
    assert.ok(order.checklist.some((c) => c.label.includes("moisture")), "Checklist includes subfloor moisture inspection")
    assert.ok(order.checklist.some((c) => c.label.includes("Living Room")), "Checklist includes room installation")
  }
})

test("Drywall Proposal Workflow: Customer data, draft saving, proposal figures, signature and work order", () => {
  const drywallScope = createBlankDrywallScope()
  const baseDrywall = createBlankDrywallRoom("Basement Studio")
  drywallScope.rooms = [
    recomputeDrywallRoomGeometry({
      ...baseDrywall,
      length: { feet: 24, inches: 0 },
      width: { feet: 16, inches: 0 },
      height: { feet: 9, inches: 0 },
      includeWalls: true,
      includeCeiling: true,
      boardType: "half_standard",
      boardSize: "4x12",
      wastePercent: 10,
      finishLevel: 4,
      boardCostPerSheet: 17.5,
      hangCostPerSqFt: 0.85,
      finishCostPerSqFt: 0.65,
      openings: [],
    }),
  ]

  const estimate: Estimate = {
    id: "est-dw-test-1",
    clientId: "client-dw-1",
    stageId: "lead",
    title: "Basement Drywall & Level 4 Finish",
    jobAddress: "100 Industrial Parkway",
    trades: ["drywall"],
    primaryTrade: "drywall",
    drywallScope,
    estimateKind: "interior",
    areas: [],
    lineItems: [],
    rates: [],
    settings: {
      hourlyRate: 65,
      hourRounding: 0.5,
      priceRounding: "none",
      materialRounding: "none",
      taxPercent: 0,
      discountKind: "percent",
      discountValue: 0,
      paymentMethodId: "check",
      surchargePercent: 0,
      expiryDays: 30,
      materialMarkup: 15,
      taxBasis: "materials_only",
      minimumJobCharge: 0,
      depositPercent: 33,
    },
    scheduledOn: null,
    notes: "Deliver 4x12 sheets to walkout basement",
    crewNote: "Finish Level 4 smooth for flat paint",
    acceptedAt: null,
    publicToken: "tok-dw-test-1",
    clientStatus: "draft",
    signature: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 1. Proposal Figures
  const figures = proposalFigures(estimate, [], [])
  assert.ok(figures.quote.total > 0, "Drywall proposal total is calculated")
  assert.ok(figures.multiTradeQuote, "Multi-trade quote produced")

  // 2. Acceptance & Work Order Generation
  const mockState: ScopeState = {
    estimates: [estimate],
    clients: [
      {
        id: "client-dw-1",
        name: "Ned Flanders",
        email: "ned@example.com",
        phone: "555-5342",
        address: "100 Industrial Parkway",
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    stages: [
      { id: "lead", slug: "lead", label: "Lead", column: "leads", order: 1 },
      { id: "scheduled", slug: "scheduled", label: "Scheduled", column: "production", order: 2 },
    ],
    workOrders: [],
    paymentMethods: [],
  } as unknown as ScopeState

  const acceptance = applyAcceptance(mockState, "tok-dw-test-1", {
    signedName: "Ned Flanders",
    signaturePayload: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    signedAt: new Date().toISOString(),
    selectedLineIds: [],
  })

  assert.ok(acceptance.ok, "Drywall proposal accepted")
  if (acceptance.ok) {
    const updated = acceptance.state.estimates.find((e) => e.id === "est-dw-test-1")
    assert.equal(updated?.clientStatus, "accepted")
    assert.ok(acceptance.state.workOrders.length > 0)
    const order = acceptance.state.workOrders[0]
    assert.ok(order.checklist.some((c) => c.label.includes("framing")), "Checklist includes framing inspection")
    assert.ok(order.checklist.some((c) => c.label.includes("Basement Studio")), "Checklist includes room drywall tasks")
    assert.ok(order.checklist.some((c) => c.label.includes("Level 4")), "Checklist specifies Level 4 finish")
  }
})
