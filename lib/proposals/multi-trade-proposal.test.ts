import test from "node:test"
import assert from "node:assert/strict"
import { renderProposalHtml } from "./renderHtml.ts"
import { DEFAULT_ESTIMATE_SETTINGS, DEFAULT_PRODUCTION_RATES, documentedBedroom } from "../defaults.ts"
import type { Estimate, FlooringScope, DrywallScope } from "../types.ts"

const MOCK_PAYMENT_METHODS = [
  { id: "check", label: "Check", note: "", surchargePercent: 0 },
  { id: "cc", label: "Credit Card", note: "", surchargePercent: 3 },
]

function makeBaseEstimate(partial: Partial<Estimate> = {}): Estimate {
  return {
    id: "est-multitrade-1",
    publicToken: "tok-multitrade-1",
    clientId: "client-1",
    stageId: "stage-lead",
    title: "Whole Home Renovation",
    jobAddress: "123 Elm Street",
    createdAt: "2026-11-20T12:00:00.000Z",
    updatedAt: "2026-11-20T12:00:00.000Z",
    scheduledOn: null,
    notes: "",
    crewNote: "",
    acceptedAt: null,
    clientStatus: "draft",
    signature: null,
    paymentStatus: "unpaid",
    depositReceipt: null,
    estimateKind: "interior",
    trades: ["painting", "flooring", "drywall"],
    areas: [documentedBedroom()],
    lineItems: [],
    rates: DEFAULT_PRODUCTION_RATES,
    settings: {
      ...DEFAULT_ESTIMATE_SETTINGS,
      depositPercent: 30,
    },
    ...partial,
  }
}

const SAMPLE_FLOORING_SCOPE: FlooringScope = {
  defaultWastePercent: 10,
  dumpsterFee: 0,
  overheadPercent: 10,
  profitPercent: 15,
  rooms: [
    {
      id: "fl-1",
      name: "Living Room Flooring",
      length: { feet: 20, inches: 0 },
      width: { feet: 15, inches: 0 },
      grossSqFt: 300,
      deductions: [],
      additionsSqFt: 0,
      netSqFt: 300,
      perimeterFt: 70,
      materialType: "lvp",
      materialName: "LVP — Luxury Vinyl Plank",
      sqFtPerBox: 20,
      wastePercent: 10,
      materialCostPerSqFt: 3.5,
      installCostPerSqFt: 2.5,
      underlaymentType: "foam_2mm",
      underlaymentCostPerSqFt: 0.6,
      removeExistingType: "carpet_pad",
      removeCostPerSqFt: 1.0,
      subfloorPrepType: "self_leveler",
      subfloorCostPerSqFt: 0.75,
      includeBaseboard: true,
      baseboardCostPerFt: 2.0,
      includeQuarterRound: false,
      quarterRoundCostPerFt: 0,
      transitions: [
        {
          id: "tr-1",
          type: "t_molding",
          label: "T-Molding",
          pieces: 2,
          costPerPiece: 25,
        },
      ],
    },
  ],
}

const SAMPLE_DRYWALL_SCOPE: DrywallScope = {
  defaultWastePercent: 10,
  dumpsterFee: 0,
  overheadPercent: 10,
  profitPercent: 15,
  rooms: [
    {
      id: "dw-1",
      name: "Living Room Drywall",
      length: { feet: 20, inches: 0 },
      width: { feet: 15, inches: 0 },
      height: { feet: 9, inches: 0 },
      includeWalls: true,
      includeCeiling: true,
      openings: [
        {
          id: "op-1",
          type: "standard_door",
          name: "Door",
          width: { feet: 3, inches: 0 },
          height: { feet: 7, inches: 0 },
          sqFt: 21,
        },
      ],
      netWallSqFt: 609,
      netCeilingSqFt: 300,
      totalNetSqFt: 909,
      boardType: "half_standard",
      boardSize: "4x12",
      wastePercent: 10,
      boardCostPerSheet: 18,
      hangCostPerSqFt: 1.2,
      finishLevel: 4,
      finishCostPerSqFt: 1.5,
      texture: "orange_peel",
      outsideCornerBeadFt: 36,
      cornerBeadCostPerFt: 0.75,
      insulationType: "none",
      insulationCostPerSqFt: 0,
      framingLinearFt: 0,
      framingCostPerFt: 0,
    },
  ],
}

test("multi-trade proposal rendering", async (t) => {
  await t.test("renders unified multi-trade proposal with all three scopes", () => {
    const estimate = makeBaseEstimate({
      flooringScope: SAMPLE_FLOORING_SCOPE,
      drywallScope: SAMPLE_DRYWALL_SCOPE,
    })

    const html = renderProposalHtml({
      estimate,
      clientName: "Jane Homeowner",
      paymentMethods: MOCK_PAYMENT_METHODS,
      companyName: "Premier Multi-Trade Contractors",
    })

    // Check Multi-Trade Breakdown exists
    assert.match(html, /data-testid="proposal-multitrade-summary"/)
    assert.match(html, /Painting &amp; Coating/)
    assert.match(html, /Flooring Installation/)
    assert.match(html, /Drywall &amp; Finishing/)

    // Check all three scopes are rendered
    assert.match(html, /data-testid="proposal-page-scope"/) // Painting
    assert.match(html, /data-testid="proposal-page-flooring"/) // Flooring
    assert.match(html, /data-testid="proposal-page-drywall"/) // Drywall

    // Verify flooring details in output
    assert.match(html, /Living Room Flooring/)
    assert.match(html, /LVP/)
    assert.match(html, /foam_2mm/)

    // Verify drywall details in output
    assert.match(html, /Living Room Drywall/)
    assert.match(html, /Standard Drywall/)
    assert.match(html, /Level 4/)

    // Verify deposit and total
    assert.match(html, /data-testid="proposal-total"/)
    assert.match(html, /data-testid="proposal-deposit"/)
  })

  await t.test("renders standalone flooring proposal when only flooring is active", () => {
    const estimate = makeBaseEstimate({
      title: "Master Suite Flooring",
      trades: ["flooring"],
      primaryTrade: "flooring",
      areas: [],
      lineItems: [],
      flooringScope: SAMPLE_FLOORING_SCOPE,
      drywallScope: undefined,
    })

    const html = renderProposalHtml({
      estimate,
      clientName: "Bob Builder",
      paymentMethods: MOCK_PAYMENT_METHODS,
    })

    // Flooring scope is present
    assert.match(html, /data-testid="proposal-page-flooring"/)
    assert.match(html, /Flooring Scope of Work/)

    // Painting scope is omitted because areas is empty
    assert.doesNotMatch(html, /data-testid="proposal-page-scope"/)
    assert.doesNotMatch(html, /data-testid="proposal-page-drywall"/)

    // Title reflects flooring
    assert.match(html, /Master Suite Flooring/)
  })

  await t.test("renders standalone drywall proposal when only drywall is active", () => {
    const estimate = makeBaseEstimate({
      title: "Basement Drywall Finishing",
      trades: ["drywall"],
      primaryTrade: "drywall",
      areas: [],
      lineItems: [],
      flooringScope: undefined,
      drywallScope: SAMPLE_DRYWALL_SCOPE,
    })

    const html = renderProposalHtml({
      estimate,
      clientName: "Alice Walker",
      paymentMethods: MOCK_PAYMENT_METHODS,
    })

    // Drywall scope is present
    assert.match(html, /data-testid="proposal-page-drywall"/)
    assert.match(html, /Drywall Scope of Work/)

    // Painting and flooring omitted
    assert.doesNotMatch(html, /data-testid="proposal-page-scope"/)
    assert.doesNotMatch(html, /data-testid="proposal-page-flooring"/)
  })
})
