import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  measureArea,
  measuredQuantity,
  doorDeductionLnFt,
  doorCasingLnFt,
  windowCasingLnFt,
  calculateSurfaceGallons,
  calculateEstimate,
} from "./calculate.ts"
import { DEFAULT_PRODUCTION_RATES, DEFAULT_ESTIMATE_SETTINGS } from "../defaults.ts"
import type { AreaInput, ProductionRate, SurfaceInput } from "../types.ts"

describe("Painting Estimator Trim, Casing, Baseboards & Crown Molding", () => {
  const baseboardsRate = DEFAULT_PRODUCTION_RATES.find((r) => r.id === "baseboards")!
  const crownRate = DEFAULT_PRODUCTION_RATES.find((r) => r.id === "crown")!
  const doorCasingRate = DEFAULT_PRODUCTION_RATES.find((r) => r.id === "door-casing")!
  const windowCasingRate = DEFAULT_PRODUCTION_RATES.find((r) => r.id === "window-casing")!
  const doorFrameRate = DEFAULT_PRODUCTION_RATES.find((r) => r.id === "door-frame")!
  const windowFramesRate = DEFAULT_PRODUCTION_RATES.find((r) => r.id === "window-frames")!
  const chairRailRate = DEFAULT_PRODUCTION_RATES.find((r) => r.id === "chair-rail")!

  it("1. Separates baseboards, door casing, window casing, crown molding, and chair rail into distinct rates", () => {
    assert.ok(baseboardsRate, "baseboards rate exists")
    assert.ok(crownRate, "crown molding rate exists")
    assert.ok(doorCasingRate, "door casing rate exists")
    assert.ok(windowCasingRate, "window casing rate exists")
    assert.ok(doorFrameRate, "door frame (unit) rate exists")
    assert.ok(windowFramesRate, "window frames (unit) rate exists")
    assert.ok(chairRailRate, "chair rail rate exists")

    assert.equal(baseboardsRate.measure, "trim")
    assert.equal(crownRate.measure, "crown")
    assert.equal(doorCasingRate.measure, "trim")
    assert.equal(windowCasingRate.measure, "trim")
  })

  it("2. Automatically calculates baseboard linear footage deducting door opening widths", () => {
    // 12' x 15' room: Gross perimeter = 2 * (12 + 15) = 54 ln ft.
    // Two 3-foot door openings: 2 * 3 = 6 ln ft doors.
    const roomWithDoors: AreaInput = {
      id: "rm1",
      name: "Living Room",
      areaType: "room",
      lengthFt: 12,
      widthFt: 15,
      heightFt: 8,
      crewNote: "",
      surfaces: [],
      openings: [
        { id: "d1", kind: "door", count: 2, widthFt: 3, heightFt: 6.67, excludeFromWalls: true },
        { id: "w1", kind: "window", count: 1, widthFt: 4, heightFt: 5, excludeFromWalls: true },
      ],
      deductOpeningsFromBaseboards: true,
    }

    const measures = measureArea(roomWithDoors)
    assert.equal(measures.perimeterLnFt, 54)

    // Door deduction should be 6 ln ft (windows do not deduct from baseboard)
    assert.equal(doorDeductionLnFt(roomWithDoors.openings), 6)

    // Baseboards should be 54 - 6 = 48 ln ft
    const baseboardQty = measuredQuantity(baseboardsRate, roomWithDoors, 0)
    assert.equal(baseboardQty, 48)

    // If deduction toggle is disabled, baseboards should use full gross perimeter (54 ln ft)
    const roomDeductionDisabled: AreaInput = {
      ...roomWithDoors,
      deductOpeningsFromBaseboards: false,
    }
    const fullPerimeterQty = measuredQuantity(baseboardsRate, roomDeductionDisabled, 0)
    assert.equal(fullPerimeterQty, 54)
  })

  it("3. Crown molding uses ceiling perimeter without door deductions", () => {
    // 12' x 15' room: Gross perimeter = 54 ln ft.
    // Doors should not deduct from crown molding because crown molding is at the ceiling.
    const roomWithDoors: AreaInput = {
      id: "rm1",
      name: "Master Bedroom",
      areaType: "room",
      lengthFt: 12,
      widthFt: 15,
      heightFt: 9,
      crewNote: "",
      surfaces: [],
      openings: [
        { id: "d1", kind: "door", count: 2, widthFt: 3, heightFt: 7, excludeFromWalls: true },
      ],
      deductOpeningsFromBaseboards: true,
    }

    const crownQty = measuredQuantity(crownRate, roomWithDoors, 0)
    assert.equal(crownQty, 54)
  })

  it("4. Chair rail deducts door openings along the wall", () => {
    const roomWithDoors: AreaInput = {
      id: "rm1",
      name: "Dining Room",
      areaType: "room",
      lengthFt: 14,
      widthFt: 16,
      heightFt: 9,
      crewNote: "",
      surfaces: [],
      openings: [
        { id: "d1", kind: "door", count: 2, widthFt: 3, heightFt: 7, excludeFromWalls: true },
      ],
      deductOpeningsFromBaseboards: true,
    }
    // Perimeter = 2 * (14 + 16) = 60 ln ft. Deduct 6 ln ft doors = 54 ln ft.
    const chairQty = measuredQuantity(chairRailRate, roomWithDoors, 0)
    assert.equal(chairQty, 54)
  })

  it("5. Supports casing pricing either per unit or per linear foot without duplicate charges", () => {
    const room: AreaInput = {
      id: "rm-casing",
      name: "Study",
      areaType: "room",
      lengthFt: 10,
      widthFt: 10,
      heightFt: 8,
      crewNote: "",
      surfaces: [],
      openings: [
        { id: "d1", kind: "door", count: 1, widthFt: 3, heightFt: 7, excludeFromWalls: true },
      ],
    }

    // Per unit: 1 door frame item
    const doorUnitQty = measuredQuantity(doorFrameRate, room, 1)
    assert.equal(doorUnitQty, 1)

    // Per linear foot: 2 sides * 7' + 1 header * 3' = 17 ln ft
    const doorLnFtQty = measuredQuantity(doorCasingRate, room, 0)
    assert.equal(doorLnFtQty, 17)
  })

  it("6. Accurately calculates paint gallons using trim width in inches without treating linear feet as square feet", () => {
    const area: AreaInput = {
      id: "rm-test",
      name: "Hallway",
      areaType: "surface",
      lengthFt: 100, // 100 linear feet
      widthFt: 0,
      heightFt: 0,
      crewNote: "",
      surfaces: [],
    }

    // 100 linear feet of 4.5" baseboard:
    // Actual sq ft = 100 * (4.5 / 12) = 37.5 sq ft.
    // At standard 350 sq ft/gal:
    // 1 coat = 37.5 / 350 = 0.107 gal.
    // If linear feet were erroneously treated as square feet: 100 / 350 = 0.286 gal (over 2.6x error).
    const customRate: ProductionRate = {
      ...baseboardsRate,
      coveragePerCoat: 350, // configured in sq ft/gal
      trimWidthInches: 4.5,
    }

    const surface: SurfaceInput = {
      id: "s1",
      rateId: customRate.id,
      coatCount: 1,
      finishCoats: 1,
      primerCoats: 0,
      itemCount: 0,
      quantityOverride: 100,
      hoursOverride: null,
      crewNote: "",
      trimWidthInches: 4.5,
    }

    const gallons = calculateSurfaceGallons(area, surface, customRate, "none")
    // Expected: 37.5 / 350 = 0.10714...
    assert.ok(Math.abs(gallons - 0.1071) < 0.005, `Gallons should be ~0.107, got ${gallons}`)

    // Also verify backward compatibility for rates specified directly in linear feet per gallon (e.g. 650 ln ft/gal):
    const defaultGal = calculateSurfaceGallons(area, surface, baseboardsRate, "none")
    // 100 / 650 = 0.1538...
    assert.ok(Math.abs(defaultGal - 0.154) < 0.005, `Default rate gallons should be ~0.154, got ${defaultGal}`)
  })
})
