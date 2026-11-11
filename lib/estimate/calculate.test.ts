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
  estimateCharges,
  hasMissingMaterialPricing,
  measureArea,
  openingSqFt,
  prepHoursFor,
  roomGallonsEstimate,
  roundHours,
  scaledCoatHours,
  surfaceGallonsEstimate,
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

  it("removes excluded doors and windows from paintable wall area", () => {
    const bedroom = documentedBedroom()
    bedroom.openings = [
      { id: "door", kind: "door", widthFt: 3, heightFt: 7, count: 1, excludeFromWalls: true },
      { id: "window", kind: "window", widthFt: 3, heightFt: 4, count: 2, excludeFromWalls: true },
      { id: "kept", kind: "window", widthFt: 2, heightFt: 3, count: 1, excludeFromWalls: false },
    ]
    const measures = measureArea(bedroom)
    assert.equal(openingSqFt(bedroom.openings), 3 * 7 + 3 * 4 * 2)
    assert.equal(measures.wallSqFt, 432 - 45)
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
    assert.equal(applyMinimumCharge(0, MINIMUM_JOB_CHARGE), 0)
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
    const empty = calculateEstimate({
      areas: [],
      lineItems: [],
      rates,
      settings: { ...settings, minimumJobCharge: 350 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(empty.laborPrice, 0)
    assert.equal(empty.materialCost, 0)
    assert.equal(empty.allocatedHours, 0)
    assert.equal(empty.total, 0)
    const charges = estimateCharges(quote)
    assert.equal(
      Math.round((charges.labor + charges.materials + charges.additional - charges.discount + charges.tax) * 100) / 100,
      quote.total,
    )
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
    assert.equal(nearest.areas[0].surfaces[0].rateLabel, "100 sqft/hr")

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

  it("adds one coat of time for each coat past the highest rate", () => {
    const bedroom = documentedBedroom()
    const threeCoatCeiling = calculateEstimate({
      areas: [
        {
          ...bedroom,
          surfaces: bedroom.surfaces.map((surface) =>
            surface.rateId === "ceiling" ? { ...surface, coatCount: 2, finishCoats: 3 } : surface,
          ),
        },
      ],
      lineItems: [],
      rates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    const ceiling = threeCoatCeiling.areas[0].surfaces.find((surface) => surface.id === "ceiling")
    const walls = threeCoatCeiling.areas[0].surfaces.find((surface) => surface.id === "walls")
    assert.ok(ceiling && walls)
    assert.equal(ceiling.coatCount, 3)
    assert.equal(ceiling.rawHours, 180 / 60 + 180 / 150)
    assert.equal(ceiling.allocatedHours, 4.5)
    assert.equal(ceiling.paintGallons, 1.54)
    assert.equal(ceiling.rateLabel, "60 sqft/hr + 1 coat")
    assert.equal(walls.allocatedHours, 5.5)
    assert.equal(walls.rateLabel, "85 sqft/hr")
    assert.equal(threeCoatCeiling.allocatedHours, 15)
    assert.equal(threeCoatCeiling.laborPrice, 1125)
    assert.equal(threeCoatCeiling.paintGallons, 4.38)
    assert.equal(quoteBedroom().allocatedHours, 13.5)
    assert.equal(quoteBedroom().paintGallons, 3.87)

    const wallRate = rates.find((rate) => rate.id === "walls")
    assert.ok(wallRate)
    const wallOnly = {
      ...bedroom,
      surfaces: bedroom.surfaces.filter((surface) => surface.rateId === "walls"),
    }
    const threeCoatWalls = calculateEstimate({
      areas: [{ ...wallOnly, surfaces: [{ ...wallOnly.surfaces[0], coatCount: 3 }] }],
      lineItems: [],
      rates,
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(threeCoatWalls.areas[0].surfaces[0].rawHours, 432 / 85 + 432 / 200)
    assert.equal(threeCoatWalls.areas[0].surfaces[0].paintGallons, 3.7)
    assert.equal(threeCoatWalls.areas[0].surfaces[0].rateLabel, "85 sqft/hr + 1 coat")

    const doorOnly = {
      ...bedroom,
      surfaces: bedroom.surfaces.filter((surface) => surface.rateId === "door-frame"),
    }
    const threeCoatDoor = calculateEstimate({
      areas: [{ ...doorOnly, surfaces: [{ ...doorOnly.surfaces[0], coatCount: 3 }] }],
      lineItems: [],
      rates,
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(threeCoatDoor.areas[0].surfaces[0].rawHours, 1.5 + 1)
    assert.equal(threeCoatDoor.areas[0].surfaces[0].rateLabel, "1.5 hrs/item + 1 coat")

    const savedThird = calculateEstimate({
      areas: [{ ...wallOnly, surfaces: [{ ...wallOnly.surfaces[0], coatCount: 3 }] }],
      lineItems: [],
      rates: [{ ...wallRate, coatRates: [...wallRate.coatRates, { coats: 3, value: 70 }] }],
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(savedThird.areas[0].surfaces[0].rawHours, 432 / 70)
    assert.equal(savedThird.areas[0].surfaces[0].rateLabel, "70 sqft/hr")

    const dollars = calculateEstimate({
      areas: [{ ...wallOnly, surfaces: [{ ...wallOnly.surfaces[0], coatCount: 3 }] }],
      lineItems: [],
      rates: [
        {
          ...wallRate,
          basis: "dollars_per_sqft",
          coatRates: [{ coats: 1, value: 1.25 }, { coats: 2, value: 2.1 }],
          coveragePerCoat: 0,
        },
      ],
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(dollars.areas[0].surfaces[0].laborPrice, Math.round((432 * 2.1 + 432 * 1.25) * 100) / 100)
    assert.equal(dollars.areas[0].surfaces[0].rateLabel, "$2.1 / sq ft + 1 coat")
    assert.equal(dollars.areas[0].surfaces[0].allocatedHours, 0)

    const splitHighest = calculateEstimate({
      areas: [{ ...wallOnly, surfaces: [{ ...wallOnly.surfaces[0], coatCount: 4 }] }],
      lineItems: [],
      rates: [{ ...wallRate, coatRates: [{ coats: 2, value: 100 }] }],
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(splitHighest.areas[0].surfaces[0].rawHours, 432 / 100 + (432 / 100 / 2) * 2)
    assert.equal(splitHighest.areas[0].surfaces[0].rateLabel, "100 sqft/hr + 2 coats")

    const capped = calculateEstimate({
      areas: [{ ...wallOnly, surfaces: [{ ...wallOnly.surfaces[0], coatCount: 8 }] }],
      lineItems: [],
      rates,
      settings: { ...settings, hourRounding: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(capped.areas[0].surfaces[0].coatCount, 6)
    assert.equal(capped.areas[0].surfaces[0].rawHours, 432 / 85 + (432 / 200) * 4)
    assert.equal(capped.areas[0].surfaces[0].rateLabel, "85 sqft/hr + 4 coats")
  })

  it("uses a typed square-foot or linear-foot amount on one surface", () => {
    const bedroom = documentedBedroom()
    const walls = bedroom.surfaces.find((surface) => surface.rateId === "walls")
    const trim = bedroom.surfaces.find((surface) => surface.rateId === "baseboards")
    assert.ok(walls && trim)
    const quote = calculateEstimate({
      areas: [
        {
          ...bedroom,
          surfaces: bedroom.surfaces.map((surface) => {
            if (surface.rateId === "walls") return { ...surface, quantityOverride: 200 }
            if (surface.rateId === "baseboards") return { ...surface, quantityOverride: 20 }
            return surface
          }),
        },
      ],
      lineItems: [],
      rates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    const priced = Object.fromEntries(quote.areas[0].surfaces.map((surface) => [surface.id, surface]))
    assert.equal(priced.walls.quantity, 200)
    assert.equal(priced.walls.quantityUnit, "sq ft")
    assert.equal(priced.walls.allocatedHours, 2.5)
    assert.equal(priced.walls.paintGallons, 1.14)
    assert.equal(priced.ceiling.quantity, 180)
    assert.equal(priced.ceiling.allocatedHours, 3)
    assert.equal(priced.baseboards.quantity, 20)
    assert.equal(priced.baseboards.quantityUnit, "ln ft")
    assert.equal(priced.baseboards.allocatedHours, 1)
    assert.equal(quote.areas[0].ceilingSqFt, 180)
    assert.equal(quote.wallSqFt, 432)
  })

  it("uses typed hours as entered and leaves gallons on the quantity", () => {
    const bedroom = documentedBedroom()
    const quote = calculateEstimate({
      areas: [
        {
          ...bedroom,
          accessFactor: HIGH_ACCESS_FACTOR,
          surfaces: bedroom.surfaces.map((surface) =>
            surface.rateId === "walls" ? { ...surface, hoursOverride: 2 } : { ...surface, hoursOverride: null },
          ),
        },
      ],
      lineItems: [],
      rates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    const walls = quote.areas[0].surfaces.find((surface) => surface.id === "walls")
    assert.ok(walls)
    assert.equal(walls.quantity, 432)
    assert.equal(walls.rawHours, 2)
    assert.equal(walls.allocatedHours, 2)
    assert.equal(walls.laborPrice, 150)
    assert.equal(walls.paintGallons, 2.47)
    const ceiling = quote.areas[0].surfaces.find((surface) => surface.id === "ceiling")
    assert.equal(ceiling?.allocatedHours, 4)
    const calculated = quoteBedroom()
    assert.equal(calculated.areas[0].surfaces.find((surface) => surface.id === "walls")?.allocatedHours, 5.5)
    assert.equal(calculated.allocatedHours, 13.5)
  })

  it("keeps a dollar-per-area price when hours are typed for the crew", () => {
    const walls = rates.find((rate) => rate.id === "walls")
    const wallSurface = documentedBedroom().surfaces.find((surface) => surface.rateId === "walls")
    assert.ok(walls && wallSurface)
    const bedroom = documentedBedroom()
    const quote = calculateEstimate({
      areas: [
        {
          ...bedroom,
          surfaces: [{ ...wallSurface, hoursOverride: 3 }],
        },
      ],
      lineItems: [],
      rates: [
        {
          ...walls,
          basis: "dollars_per_sqft",
          coatRates: [{ coats: 1, value: 1.25 }, { coats: 2, value: 2.1 }],
          coveragePerCoat: 0,
        },
      ],
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(quote.areas[0].surfaces[0].laborPrice, Math.round(432 * 2.1 * 100) / 100)
    assert.equal(quote.areas[0].surfaces[0].allocatedHours, 3)
    assert.equal(quote.areas[0].surfaces[0].rawHours, 3)
  })

  it("hides one surface from the customer without removing its hours from the price", () => {
    const bedroom = documentedBedroom()
    const quote = calculateEstimate({
      areas: [
        {
          ...bedroom,
          surfaces: bedroom.surfaces.map((surface) =>
            surface.rateId === "ceiling" ? { ...surface, hideFromCustomer: true } : surface,
          ),
        },
      ],
      lineItems: [],
      rates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    const ceiling = quote.areas[0].surfaces.find((surface) => surface.id === "ceiling")
    const plain = quoteBedroom()
    assert.equal(ceiling?.hideFromCustomer, true)
    assert.equal(ceiling?.allocatedHours, 3)
    assert.equal(quote.allocatedHours, 13.5)
    assert.equal(quote.laborPrice, 1012.5)
    assert.equal(quote.areas[0].clientPrice, quote.areas[0].price)
    assert.equal(quote.total, plain.total)

    const fromRate = calculateEstimate({
      areas: [bedroom],
      lineItems: [],
      rates: rates.map((rate) => (rate.id === "ceiling" ? { ...rate, hideFromCustomer: true } : rate)),
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(fromRate.areas[0].surfaces.find((surface) => surface.id === "ceiling")?.hideFromCustomer, true)
    assert.equal(fromRate.allocatedHours, 13.5)

    const shown = calculateEstimate({
      areas: [
        {
          ...bedroom,
          surfaces: bedroom.surfaces.map((surface) =>
            surface.rateId === "ceiling" ? { ...surface, hideFromCustomer: false } : surface,
          ),
        },
      ],
      lineItems: [],
      rates: rates.map((rate) => (rate.id === "ceiling" ? { ...rate, hideFromCustomer: true } : rate)),
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(shown.areas[0].surfaces.find((surface) => surface.id === "ceiling")?.hideFromCustomer, false)
  })

  it("recalculates per-surface gallons, room gallons, materials cost, and total across primer, finish, and dimension changes", () => {
    const pricedRates = rates.map((rate) => {
      if (rate.id === "walls") return { ...rate, productCostPerGallon: 50 }
      if (rate.id === "ceiling") return { ...rate, productCostPerGallon: 40 }
      return rate
    })
    const bedroom = documentedBedroom()
    const base = calculateEstimate({
      areas: [bedroom],
      lineItems: [],
      rates: pricedRates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(base.paintGallons, 3.87)
    // walls: 2.47 gal * $50 * 1.2 = $148.20; ceiling: 1.03 gal * $40 * 1.2 = $49.44
    assert.equal(base.materialCost, 197.64)
    assert.equal(base.total, 1210.14)

    // Changing wall primer and ceiling finish coats updates each surface independently without altering baseboards/windows
    const coatsChanged: typeof bedroom = {
      ...bedroom,
      surfaces: bedroom.surfaces.map((surface) => {
        if (surface.rateId === "walls") return { ...surface, primerCoats: 2, coatCount: 3, finishCoats: 3 }
        if (surface.rateId === "ceiling") return { ...surface, primerCoats: 1, coatCount: 1, finishCoats: 1 }
        return surface
      }),
    }
    const afterCoats = calculateEstimate({
      areas: [coatsChanged],
      lineItems: [],
      rates: pricedRates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    const wallRate = pricedRates.find((r) => r.id === "walls")!
    const ceilingRate = pricedRates.find((r) => r.id === "ceiling")!
    const wallSurface = coatsChanged.surfaces.find((s) => s.rateId === "walls")!
    const ceilingSurface = coatsChanged.surfaces.find((s) => s.rateId === "ceiling")!

    // Walls: 432*3/350 + 432*2/300 = 3.70286 + 2.88 = 6.58286 -> 6.58
    assert.equal(surfaceGallonsEstimate(coatsChanged, wallSurface, wallRate), 6.58)
    assert.equal(afterCoats.areas[0].surfaces.find((s) => s.id === "walls")?.paintGallons, 6.58)
    // Ceiling: 180*1/350 + 180*1/300 = 0.51428 + 0.60 = 1.11428 -> 1.11
    assert.equal(surfaceGallonsEstimate(coatsChanged, ceilingSurface, ceilingRate), 1.11)
    assert.equal(afterCoats.areas[0].surfaces.find((s) => s.id === "ceiling")?.paintGallons, 1.11)
    // Unchanged surfaces stay separate: baseboards 0.17, window-frames 0.20
    assert.equal(afterCoats.areas[0].surfaces.find((s) => s.id === "baseboards")?.paintGallons, 0.17)
    assert.equal(afterCoats.areas[0].surfaces.find((s) => s.id === "window-frames")?.paintGallons, 0.2)
    // Room total & quote total stay synchronized
    assert.equal(roomGallonsEstimate(coatsChanged, pricedRates), 8.06)
    assert.equal(afterCoats.paintGallons, 8.06)
    // Material cost: 6.58 * 50 * 1.2 + 1.11 * 40 * 1.2 = 394.80 + 53.28 = 448.08
    assert.equal(afterCoats.materialCost, 448.08)
    assert.equal(afterCoats.total, Math.round((afterCoats.laborPrice + 448.08) * 100) / 100)

    // Changing room dimensions updates all area-based surfaces and totals automatically
    const resized = { ...coatsChanged, lengthFt: 16, widthFt: 20, heightFt: 10 }
    const afterResize = calculateEstimate({
      areas: [resized],
      lineItems: [],
      rates: pricedRates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(roomGallonsEstimate(resized, pricedRates), afterResize.paintGallons)
    assert.ok(afterResize.paintGallons > afterCoats.paintGallons)
    assert.ok(afterResize.materialCost > afterCoats.materialCost)
    assert.ok(afterResize.total > afterCoats.total)

    // Respects materialRounding ("up") consistently across surfaceGallonsEstimate, roomGallonsEstimate, and quote
    assert.equal(
      roomGallonsEstimate(bedroom, pricedRates, "up"),
      calculateEstimate({
        areas: [bedroom],
        lineItems: [],
        rates: pricedRates,
        settings: { ...settings, materialRounding: "up" },
        paymentMethods: PAYMENT_METHODS,
      }).paintGallons,
    )

    // Falls back to finish coverage for primer when primerCoveragePerCoat is 0 but finish coverage is set
    const customCoverageWall = { ...wallRate, primerCoveragePerCoat: 0 }
    assert.equal(
      surfaceGallonsEstimate(bedroom, { ...wallSurface, coatCount: 2, finishCoats: 2, primerCoats: 1, coveragePerCoat: 400 }, customCoverageWall),
      Math.round(((432 * 3) / 400) * 100) / 100,
    )

    // Detects missing material pricing vs surface-level price/gal override
    assert.equal(hasMissingMaterialPricing(quoteBedroom()), true)
    assert.equal(hasMissingMaterialPricing(base), true) // baseboards and window-frames still have 0 cost/gal
    const allPricedArea = {
      ...bedroom,
      surfaces: bedroom.surfaces.map((surface) => ({ ...surface, productCostPerGallon: 45 })),
    }
    const allPricedQuote = calculateEstimate({
      areas: [allPricedArea],
      lineItems: [],
      rates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(hasMissingMaterialPricing(allPricedQuote), false)
    // 3.87 gal * $45 * 1.2 = $208.98; labor stays $1012.50 -> total $1221.48
    assert.equal(allPricedQuote.allocatedHours, 13.5)
    assert.equal(allPricedQuote.laborPrice, 1012.5)
    assert.equal(allPricedQuote.materialCost, 208.98)
    assert.equal(allPricedQuote.total, 1221.48)

    // Labor-only estimates can still be sent when materials are intentionally excluded
    const hourlyOnlyQuote = calculateEstimate({
      areas: [],
      lineItems: [
        {
          id: "labor-only",
          label: "Prep & painting labor",
          clientNote: "",
          crewNote: "",
          mode: "hourly",
          hours: 8,
          units: 0,
          pricePerUnit: 0,
          customPrice: 0,
          workOrderHours: 0,
          hiddenOnWorkOrder: false,
          materials: [],
        },
      ],
      rates,
      settings,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(hourlyOnlyQuote.paintGallons, 0)
    assert.equal(hasMissingMaterialPricing(hourlyOnlyQuote, settings), false)
    assert.equal(hasMissingMaterialPricing(quoteBedroom(), { ...settings, excludeMaterials: true }), false)
    assert.equal(
      hasMissingMaterialPricing(quoteBedroom(), {
        ...settings,
        hourlyRateBuild: { laborCostPerHour: 30, overheadPerHour: 15, sundriesPerHour: 10, profitPercent: 20 },
      }),
      false,
    )

    // When excludeMaterials is ON (paint costs toggle OFF), gallons & labor still calculate,
    // configured paint prices are excluded from materialCost/total, and no missing-price warning triggers.
    const excludedPricedQuote = calculateEstimate({
      areas: [allPricedArea],
      lineItems: [],
      rates,
      settings: { ...settings, excludeMaterials: true },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(excludedPricedQuote.allocatedHours, 13.5)
    assert.equal(excludedPricedQuote.paintGallons, allPricedQuote.paintGallons)
    assert.equal(excludedPricedQuote.laborPrice, 1012.5)
    assert.equal(excludedPricedQuote.materialCost, 0)
    assert.equal(excludedPricedQuote.total, 1012.5)
    assert.equal(hasMissingMaterialPricing(excludedPricedQuote, { ...settings, excludeMaterials: true }), false)
  })
})
