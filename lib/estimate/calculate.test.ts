import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_ESTIMATE_SETTINGS,
  DEFAULT_PRODUCTION_RATES,
  DEFAULT_RATE_CARD,
  HIGH_ACCESS_FACTOR,
  MINIMUM_JOB_CHARGE,
  PAINT_UPGRADE_NOTE,
  PAYMENT_METHODS,
  documentedBedroom,
  paintUpgradeLine,
} from "../defaults.ts"
import {
  applyMinimumCharge,
  calculateEstimate,
  calculateProduction,
  measureArea,
  prepHoursFor,
  roundHours,
  scaledCoatHours,
  taxFor,
  timeBasedRate,
} from "./calculate.ts"
import type { LineItemInput } from "../types.ts"

const settings = { ...DEFAULT_ESTIMATE_SETTINGS }
const rates = DEFAULT_PRODUCTION_RATES.map((rate) => ({ ...rate, coatRates: rate.coatRates.map((entry) => ({ ...entry })) }))

function quoteBedroom(lineItems: LineItemInput[] = []) {
  return calculateEstimate({
    areas: [documentedBedroom()],
    lineItems,
    rates,
    settings,
    paymentMethods: PAYMENT_METHODS,
  })
}

describe("measureArea", () => {
  it("uses the four-wall room formulas from the 12 by 15 by 8 example", () => {
    const measures = measureArea(documentedBedroom())
    assert.equal(measures.wallSqFt, 432)
    assert.equal(measures.ceilingSqFt, 180)
    assert.equal(measures.perimeterLnFt, 54)
  })
})

describe("roundHours", () => {
  it("rounds up to the next half hour", () => {
    assert.equal(roundHours(5.082352941, 0.5), 5.5)
    assert.equal(roundHours(2.16, 0.5), 2.5)
    assert.equal(roundHours(3, 0.5), 3)
  })
})

describe("timeBasedRate", () => {
  it("turns a finished two-coat wall into square feet per hour", () => {
    assert.equal(timeBasedRate(425, 5, "area"), 85)
    assert.equal(timeBasedRate(1, 1.5, "item"), 1.5)
    assert.equal(timeBasedRate(425, 0, "area"), 0)
    assert.equal(timeBasedRate(0, 1.5, "item"), 0)
  })
})

describe("calculateEstimate", () => {
  it("prices the 12 by 15 by 8 bedroom from the two-coat time rates", () => {
    const quote = quoteBedroom()
    const hours = Object.fromEntries(
      quote.areas[0].surfaces.map((surface) => [surface.id, surface.allocatedHours]),
    )
    const ratesUsed = Object.fromEntries(
      quote.areas[0].surfaces.map((surface) => [surface.id, surface.rateLabel]),
    )
    assert.deepEqual(hours, {
      walls: 5.5,
      ceiling: 3,
      baseboards: 2.5,
      "window-frames": 1,
      "door-frame": 1.5,
    })
    assert.deepEqual(ratesUsed, {
      walls: "85 sqft/hr",
      ceiling: "60 sqft/hr",
      baseboards: "25 lnft/hr",
      "window-frames": "0.5 hrs/item",
      "door-frame": "1.5 hrs/item",
    })
    assert.equal(quote.allocatedHours, 13.5)
    assert.equal(quote.laborPrice, 1012.5)
    assert.equal(quote.wallSqFt, 432)
  })

  it("prices the published bedroom at $67 per hour plus materials", () => {
    const quote = calculateEstimate({
      areas: [documentedBedroom()],
      lineItems: [
        {
          id: "materials",
          label: "Materials",
          clientNote: "",
          crewNote: "",
          mode: "custom",
          hours: 0,
          units: 0,
          pricePerUnit: 0,
          customPrice: 155.71,
          workOrderHours: 0,
          hiddenOnWorkOrder: false,
          materials: [],
        },
      ],
      rates,
      settings: { ...settings, hourlyRate: 67 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(quote.allocatedHours, 13.5)
    assert.equal(quote.laborPrice, 904.5)
    assert.equal(quote.total, 1060.21)
  })

  it("adds materials as a custom line item without adding hours", () => {
    const quote = quoteBedroom([
      {
        id: "materials",
        label: "Materials",
        clientNote: "",
        crewNote: "",
        mode: "custom",
        hours: 0,
        units: 0,
        pricePerUnit: 0,
        customPrice: 155.71,
        workOrderHours: 0,
        hiddenOnWorkOrder: false,
        materials: [],
      },
    ])
    assert.equal(quote.total, 1168.21)
    assert.equal(quote.allocatedHours, 13.5)
    assert.equal(quote.salesRate, Math.round((1168.21 / 13.5) * 100) / 100)
  })

  it("drops an optional add-on the client left off", () => {
    const addon = {
      id: "wash",
      label: "Pressure washing",
      clientNote: "",
      crewNote: "",
      mode: "custom" as const,
      hours: 0,
      units: 0,
      pricePerUnit: 0,
      customPrice: 180,
      workOrderHours: 2,
      hiddenOnWorkOrder: false,
      materials: [],
      optional: true,
    }
    const included = quoteBedroom([{ ...addon, selected: true }])
    const declined = quoteBedroom([{ ...addon, selected: false }])
    assert.equal(included.total, 1192.5)
    assert.equal(included.allocatedHours, 15.5)
    assert.equal(declined.total, 1012.5)
    assert.equal(declined.allocatedHours, 13.5)
  })

  it("calculates one-coat coverage and item gallons from the coverage examples", () => {
    const quote = calculateEstimate({
      areas: [
        {
          ...documentedBedroom(),
          surfaces: documentedBedroom().surfaces.map((surface) =>
            surface.rateId === "walls" || surface.rateId === "ceiling"
              ? { ...surface, coatCount: 1 }
              : surface,
          ),
        },
      ],
      lineItems: [],
      rates,
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    const gallons = Object.fromEntries(
      quote.areas[0].surfaces.map((surface) => [surface.id, surface.paintGallons]),
    )
    assert.equal(gallons.walls, 1.23)
    assert.equal(gallons.ceiling, 0.51)
    assert.equal(gallons.baseboards, 0.17)
    assert.equal(gallons["window-frames"], 0.2)
  })

  it("prices quantity and hourly line items differently", () => {
    const quote = quoteBedroom([
      {
        id: "consult",
        label: "Consultation",
        clientNote: "",
        crewNote: "",
        mode: "hourly",
        hours: 1,
        units: 0,
        pricePerUnit: 0,
        customPrice: 0,
        workOrderHours: 0,
        hiddenOnWorkOrder: false,
        materials: [],
      },
      {
        id: "tape",
        label: "Tape",
        clientNote: "",
        crewNote: "Stage in the hallway",
        mode: "quantity",
        hours: 0,
        units: 3,
        pricePerUnit: 8,
        customPrice: 0,
        workOrderHours: 0.5,
        hiddenOnWorkOrder: false,
        materials: [],
      },
    ])
    assert.equal(quote.lineItems[0].price, 75)
    assert.equal(quote.lineItems[1].price, 24)
    assert.equal(quote.allocatedHours, 15)
  })

  it("applies a percent discount, tax, and card surcharge after the subtotal", () => {
    const quote = calculateEstimate({
      areas: [documentedBedroom()],
      lineItems: [],
      rates,
      settings: {
        ...settings,
        discountKind: "percent",
        discountValue: 10,
        taxPercent: 8,
        paymentMethodId: "credit-card",
        surchargePercent: 3,
      },
      paymentMethods: PAYMENT_METHODS,
    })
    const discounted = Math.round(1012.5 * 0.9 * 100) / 100
    const taxed = Math.round((discounted + discounted * 0.08) * 100) / 100
    assert.equal(quote.discount, Math.round(1012.5 * 0.1 * 100) / 100)
    assert.equal(quote.total, taxed)
    assert.equal(quote.surcharge, Math.round(taxed * 0.03 * 100) / 100)
    assert.equal(quote.amountDue, Math.round((taxed + quote.surcharge) * 100) / 100)
  })

  it("adds material row cost to a custom price and leaves the paint upgrade at zero", () => {
    const upgrade = paintUpgradeLine("upgrade")
    const quote = quoteBedroom([
      upgrade,
      {
        ...upgrade,
        id: "priced",
        customPrice: 40,
        materials: [{ id: "gal", name: "Premium eggshell", quantity: 2, unitPrice: 12.5 }],
      },
    ])
    assert.equal(upgrade.label, "Paint Upgrade")
    assert.equal(upgrade.mode, "custom")
    assert.equal(upgrade.customPrice, 0)
    assert.equal(upgrade.clientNote, PAINT_UPGRADE_NOTE)
    assert.equal(quote.lineItems[0].price, 0)
    assert.equal(quote.lineItems[1].materialCost, 25)
    assert.equal(quote.lineItems[1].price, 65)
    assert.equal(quote.total, 1077.5)
  })

  it("divides area by the rate card and marks paint up 20 percent", () => {
    const result = calculateProduction(
      [
        {
          id: "bedroom",
          name: "Bedroom",
          lengthFt: 12,
          widthFt: 15,
          heightFt: 8,
          coatCount: 2,
          primerCoats: 0,
          doorCount: 1,
          cabinetDoorCount: 2,
          prepLevel: "none",
          prepHours: null,
          accessFactor: 1,
        },
      ],
      { ...DEFAULT_RATE_CARD, costPerGallon: 40 },
    )
    assert.equal(result.wallSqFt, 432)
    assert.equal(result.ceilingSqFt, 180)
    assert.equal(result.trimLnFt, 54)
    assert.equal(result.lineItems.find((line) => line.lineItemType === "wall")?.allocatedHours, (432 / 200) * 1.7)
    assert.equal(result.lineItems.find((line) => line.lineItemType === "door")?.allocatedHours, 1.7)
    assert.equal(result.lineItems.find((line) => line.lineItemType === "cabinet_door")?.allocatedHours, 1.5 * 1.7)
    assert.equal(Math.round(result.paintGallons * 1000) / 1000, Math.round((((432 + 180) / 350) * 2) * 1000) / 1000)
    assert.equal(result.laborCost, Math.round(result.allocatedHours * 75 * 100) / 100)
    const rawMaterial = result.paintGallons * 40
    assert.equal(result.materialCost, Math.round(rawMaterial * 1.2 * 100) / 100)
    assert.equal(result.grossProfit, Math.round(rawMaterial * 0.2 * 100) / 100)
    assert.equal(result.totalPrice, Math.round((result.laborCost + result.materialCost) * 100) / 100)
  })

  it("adds prep, primer, and access, then floors the price at the minimum", () => {
    assert.equal(scaledCoatHours(2, 2), 3.4)
    assert.equal(prepHoursFor(400, "heavy", null), 4)
    assert.equal(prepHoursFor(400, "heavy", 1.25), 1.25)
    assert.equal(taxFor(200, 40, 8, "materials_only"), 3.2)
    assert.equal(taxFor(200, 40, 8, "total_job"), 16)
    assert.equal(applyMinimumCharge(100, MINIMUM_JOB_CHARGE), MINIMUM_JOB_CHARGE)
    const quote = calculateEstimate({
      areas: [
        {
          ...documentedBedroom(),
          prepLevel: "light",
          accessFactor: HIGH_ACCESS_FACTOR,
          surfaces: documentedBedroom().surfaces.map((surface) =>
            surface.rateId === "walls" ? { ...surface, primerCoats: 1, coatCount: 1 } : surface,
          ),
        },
      ],
      lineItems: [],
      rates,
      settings: { ...settings, minimumJobCharge: 5000, taxPercent: 8, taxBasis: "materials_only" },
      paymentMethods: PAYMENT_METHODS,
    })
    const walls = quote.areas[0].surfaces.find((surface) => surface.id === "walls")
    assert.ok(walls)
    assert.ok((walls?.paintGallons ?? 0) > 432 / 350)
    assert.equal(quote.total, 5000)
    assert.equal(quote.pricedTotal < 5000, true)
    assert.ok(DEFAULT_PRODUCTION_RATES.some((rate) => rate.id === "siding" && rate.coatRates[0]?.value === 120))
    assert.ok(DEFAULT_PRODUCTION_RATES.some((rate) => rate.id === "crown"))
  })

  it("prices finish coats from that coat box, and repeats primer at full speed", () => {
    const walls = rates.find((rate) => rate.id === "walls")
    assert.ok(walls)
    const bedroom = documentedBedroom()
    const wallOnly = {
      ...bedroom,
      surfaces: bedroom.surfaces.filter((surface) => surface.rateId === "walls"),
    }
    const twoCoat = calculateEstimate({
      areas: [wallOnly],
      lineItems: [],
      rates: [{ ...walls, coatRates: [{ coats: 1, value: 200 }, { coats: 2, value: 100 }] }],
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(twoCoat.areas[0].surfaces[0].rawHours, 432 / 100)
    assert.equal(twoCoat.areas[0].surfaces[0].allocatedHours, 4.32)

    const nearest = calculateEstimate({
      areas: [{ ...wallOnly, surfaces: [{ ...wallOnly.surfaces[0], coatCount: 3 }] }],
      lineItems: [],
      rates: [{ ...walls, coatRates: [{ coats: 2, value: 100 }, { coats: 4, value: 80 }] }],
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(nearest.areas[0].surfaces[0].rawHours, 432 / 100)

    const primed = calculateEstimate({
      areas: [
        {
          ...wallOnly,
          surfaces: [{ ...wallOnly.surfaces[0], primerCoats: 2 }],
        },
      ],
      lineItems: [],
      rates: [{ ...walls, primerRate: 160, coatRates: [{ coats: 1, value: 200 }, { coats: 2, value: 200 }] }],
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(primed.areas[0].surfaces[0].rawHours, 432 / 200 + (432 / 160) * 2)

    const dollars = calculateEstimate({
      areas: [wallOnly],
      lineItems: [],
      rates: [
        {
          ...walls,
          basis: "dollars_per_sqft",
          coatRates: [{ coats: 1, value: 1.25 }, { coats: 2, value: 2.1 }],
          coveragePerCoat: 0,
        },
      ],
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(dollars.areas[0].surfaces[0].laborPrice, Math.round(432 * 2.1 * 100) / 100)
    assert.equal(dollars.areas[0].surfaces[0].allocatedHours, 0)
    assert.equal(dollars.areas[0].surfaces[0].missingRate, false)
  })
})
