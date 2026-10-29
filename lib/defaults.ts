import type {
  AreaInput,
  EstimateSettings,
  LineItemInput,
  LinePricingMode,
  PaymentMethod,
  PrepLevel,
  ProductionRate,
  RateBasis,
  RateCard,
  SurfaceInput,
  SurfaceMeasure,
} from "./types.ts"

export const WALL_SQFT_PER_HOUR = 200
export const CEILING_SQFT_PER_HOUR = 150
export const TRIM_LNFT_PER_HOUR = 50
export const DOOR_UNIT_HOURS = 1
/** Two-coat speeds from a finished room: 425 sq ft in 5 hours is 85 sq ft/hr. */
export const TWO_COAT_WALL_SQFT_PER_HOUR = 85
export const TWO_COAT_CEILING_SQFT_PER_HOUR = 60
export const TWO_COAT_TRIM_LNFT_PER_HOUR = 25
export const TWO_COAT_DOOR_HOURS = 1.5
export const CABINET_DOOR_UNIT_HOURS = 0.75
export const SQFT_PER_GALLON = 350
export const PRIMER_SQFT_PER_HOUR = 160
export const PRIMER_SQFT_PER_GALLON = 300
export const PRIMER_LNFT_PER_HOUR = 40
export const SECOND_COAT_LABOR_FACTOR = 0.7
export const DEFAULT_MATERIAL_MARKUP = 0.2
export const DEFAULT_COST_PER_GALLON = 0
export const MINIMUM_JOB_CHARGE = 350
export const DEFAULT_ACCESS_FACTOR = 1
export const HIGH_ACCESS_FACTOR = 1.25

export const SIDING_SQFT_PER_HOUR = 120
export const FASCIA_LNFT_PER_HOUR = 35
export const SOFFIT_SQFT_PER_HOUR = 80
export const SHUTTER_UNIT_HOURS = 0.5
export const DECK_SQFT_PER_HOUR = 100
export const CROWN_LNFT_PER_HOUR = 25
export const WAINSCOT_SQFT_PER_HOUR = 60
export const ACCENT_SQFT_PER_HOUR = 180

/** Hours of prep added per wall square foot. A direct prepHours value replaces this. */
export const PREP_HOURS_PER_SQFT: Record<PrepLevel, number> = {
  none: 0,
  light: 0.002,
  medium: 0.005,
  heavy: 0.01,
}

function wallSubstrate(
  id: string,
  material: string,
  substrate: "wood" | "masonry" | "metal",
  oneCoat: number,
  twoCoat: number,
  primer: number,
): ProductionRate {
  return {
    id,
    category: "Interior",
    internalLabel: `Walls · ${material}`,
    clientLabel: "Walls",
    basis: "sqft_per_hour",
    measure: "walls",
    coatRates: [
      { coats: 1, value: oneCoat },
      { coats: 2, value: twoCoat },
    ],
    coveragePerCoat: SQFT_PER_GALLON,
    primerRate: primer,
    primerCoveragePerCoat: PRIMER_SQFT_PER_GALLON,
    productName: "Wall paint",
    productCostPerGallon: 0,
    clientDescription: `${material} walls painted the full number of coats.`,
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
    substrate,
    substrateGroup: "walls",
  }
}

export const DEFAULT_PRODUCTION_RATES: ProductionRate[] = [
  {
    id: "walls",
    category: "Interior",
    internalLabel: "Walls",
    clientLabel: "Walls",
    basis: "sqft_per_hour",
    measure: "walls",
    coatRates: [
      { coats: 1, value: WALL_SQFT_PER_HOUR },
      { coats: 2, value: TWO_COAT_WALL_SQFT_PER_HOUR },
    ],
    coveragePerCoat: SQFT_PER_GALLON,
    primerRate: PRIMER_SQFT_PER_HOUR,
    primerCoveragePerCoat: PRIMER_SQFT_PER_GALLON,
    productName: "Wall paint",
    productCostPerGallon: 0,
    clientDescription: "Walls painted the full number of coats.",
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
    substrate: "drywall",
  },
  wallSubstrate("walls-wood", "Wood", "wood", 140, 60, 110),
  wallSubstrate("walls-masonry", "Masonry", "masonry", 100, 45, 80),
  wallSubstrate("walls-metal", "Metal", "metal", 160, 70, 130),
  {
    id: "ceiling",
    category: "Interior",
    internalLabel: "Ceiling",
    clientLabel: "Ceiling",
    basis: "sqft_per_hour",
    measure: "ceiling",
    coatRates: [
      { coats: 1, value: CEILING_SQFT_PER_HOUR },
      { coats: 2, value: TWO_COAT_CEILING_SQFT_PER_HOUR },
    ],
    coveragePerCoat: SQFT_PER_GALLON,
    primerRate: 140,
    primerCoveragePerCoat: PRIMER_SQFT_PER_GALLON,
    productName: "Ceiling paint",
    productCostPerGallon: 0,
    clientDescription: "Ceiling painted the full number of coats.",
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
  },
  {
    id: "baseboards",
    category: "Interior",
    internalLabel: "Baseboard and casing",
    clientLabel: "Baseboard and casing",
    basis: "lnft_per_hour",
    measure: "trim",
    coatRates: [
      { coats: 1, value: TRIM_LNFT_PER_HOUR },
      { coats: 2, value: TWO_COAT_TRIM_LNFT_PER_HOUR },
    ],
    coveragePerCoat: 650,
    primerRate: PRIMER_LNFT_PER_HOUR,
    primerCoveragePerCoat: 400,
    productName: "Trim paint",
    productCostPerGallon: 0,
    clientDescription: "Baseboards brushed the full number of coats.",
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
  },
  {
    id: "window-frames",
    category: "Interior",
    internalLabel: "Window frames",
    clientLabel: "Window frames",
    basis: "hours_per_item",
    measure: "items",
    coatRates: [
      { coats: 1, value: 0.5 },
      { coats: 2, value: 0.5 },
    ],
    coveragePerCoat: 0.05,
    primerRate: 0.35,
    primerCoveragePerCoat: 0.04,
    productName: "Trim paint",
    productCostPerGallon: 0,
    clientDescription: "Window frames.",
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
  },
  {
    id: "door-frame",
    category: "Interior",
    internalLabel: "Door & frame, 1 side",
    clientLabel: "Door and frame",
    basis: "hours_per_item",
    measure: "items",
    coatRates: [
      { coats: 1, value: DOOR_UNIT_HOURS },
      { coats: 2, value: TWO_COAT_DOOR_HOURS },
    ],
    coveragePerCoat: 0,
    primerRate: 0.75,
    primerCoveragePerCoat: 0,
    productName: "Trim paint",
    productCostPerGallon: 0,
    clientDescription: "Door and frame, one side.",
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
  },
  {
    id: "cabinet-doors",
    category: "Interior",
    internalLabel: "Cabinet doors",
    clientLabel: "Cabinet doors",
    basis: "hours_per_item",
    measure: "items",
    coatRates: [
      { coats: 1, value: CABINET_DOOR_UNIT_HOURS },
      { coats: 2, value: CABINET_DOOR_UNIT_HOURS },
    ],
    coveragePerCoat: 0,
    primerRate: 0.5,
    primerCoveragePerCoat: 0,
    productName: "Cabinet paint",
    productCostPerGallon: 0,
    clientDescription: "Cabinet doors.",
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
  },
  speedRate("siding", "Exterior", "Siding", "sqft_per_hour", "siding", SIDING_SQFT_PER_HOUR, SQFT_PER_GALLON, 100, 250, "Exterior paint"),
  speedRate("fascia", "Exterior", "Fascia", "lnft_per_hour", "fascia", FASCIA_LNFT_PER_HOUR, 200, 25, 150, "Exterior trim"),
  speedRate("soffit", "Exterior", "Soffit", "sqft_per_hour", "soffit", SOFFIT_SQFT_PER_HOUR, SQFT_PER_GALLON, 70, 250, "Exterior paint"),
  speedRate("shutters", "Exterior", "Shutters", "hours_per_item", "shutters", SHUTTER_UNIT_HOURS, 0.04, 0.35, 0.03, "Exterior trim"),
  speedRate("deck", "Exterior", "Deck stain", "sqft_per_hour", "deck", DECK_SQFT_PER_HOUR, 250, 80, 200, "Deck stain"),
  speedRate("crown", "Interior", "Crown molding", "lnft_per_hour", "crown", CROWN_LNFT_PER_HOUR, 400, 18, 300, "Trim paint"),
  speedRate("wainscot", "Interior", "Wainscoting", "sqft_per_hour", "wainscot", WAINSCOT_SQFT_PER_HOUR, 350, 50, 300, "Trim paint"),
  speedRate("accent", "Interior", "Accent wall", "sqft_per_hour", "accent", ACCENT_SQFT_PER_HOUR, SQFT_PER_GALLON, 150, PRIMER_SQFT_PER_GALLON, "Wall paint"),
]

export const DEFAULT_HOURLY_RATE = 75

export const DEFAULT_ESTIMATE_SETTINGS: EstimateSettings = {
  hourlyRate: DEFAULT_HOURLY_RATE,
  hourRounding: 0.5,
  priceRounding: "none",
  materialRounding: "none",
  taxPercent: 0,
  discountKind: "percent",
  discountValue: 0,
  paymentMethodId: "check",
  surchargePercent: 0,
  expiryDays: 0,
  materialMarkup: DEFAULT_MATERIAL_MARKUP,
  taxBasis: "total_job",
  minimumJobCharge: MINIMUM_JOB_CHARGE,
  depositPercent: 30,
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash", label: "Cash", surchargePercent: 0 },
  { id: "check", label: "Check", surchargePercent: 0 },
  { id: "credit-card", label: "Credit card", surchargePercent: 0 },
  { id: "ach", label: "ACH", surchargePercent: 0 },
]

export const PLAN_NAME = "ScopePipe Field"
export const STORAGE_KEY = "scopepipe.v9"

export const DEFAULT_RATE_CARD: RateCard = {
  wallSqFtPerHour: WALL_SQFT_PER_HOUR,
  ceilingSqFtPerHour: CEILING_SQFT_PER_HOUR,
  trimLnFtPerHour: TRIM_LNFT_PER_HOUR,
  doorHours: DOOR_UNIT_HOURS,
  cabinetDoorHours: CABINET_DOOR_UNIT_HOURS,
  sqFtPerGallon: SQFT_PER_GALLON,
  primerSqFtPerHour: PRIMER_SQFT_PER_HOUR,
  primerSqFtPerGallon: PRIMER_SQFT_PER_GALLON,
  secondCoatLaborFactor: SECOND_COAT_LABOR_FACTOR,
  laborRatePerHour: DEFAULT_HOURLY_RATE,
  materialMarkup: DEFAULT_MATERIAL_MARKUP,
  costPerGallon: DEFAULT_COST_PER_GALLON,
  minimumJobCharge: MINIMUM_JOB_CHARGE,
}

export function documentedBedroomSurfaces(): SurfaceInput[] {
  return [
    surface("walls", 2, 0),
    surface("ceiling", 2, 0),
    surface("baseboards", 2, 0),
    surface("window-frames", 2, 2),
    surface("door-frame", 2, 1),
  ]
}

export function documentedBedroom(): AreaInput {
  return {
    id: "bedroom",
    name: "Bedroom",
    areaType: "room",
    lengthFt: 12,
    widthFt: 15,
    heightFt: 8,
    crewNote: "",
    surfaces: documentedBedroomSurfaces(),
  }
}

export const PAINT_UPGRADE_NOTE =
  "Upgrade to a premium product for enhanced durability and a superior finish.\nThis premium option is available for an additional price."

export function blankLineItem(id: string, mode: LinePricingMode): LineItemInput {
  return {
    id,
    label: mode === "hourly" ? "Hourly work" : mode === "quantity" ? "Quantity item" : "Custom charge",
    clientNote: "",
    crewNote: "",
    mode,
    hours: mode === "hourly" ? 1 : 0,
    units: mode === "quantity" ? 1 : 0,
    pricePerUnit: 0,
    customPrice: 0,
    workOrderHours: 0,
    hiddenOnWorkOrder: false,
    materials: [],
    optional: false,
    selected: true,
  }
}

/** Custom line from the Add Line Item dialog. Price starts empty. */
export function paintUpgradeLine(id: string): LineItemInput {
  return {
    ...blankLineItem(id, "custom"),
    label: "Paint Upgrade",
    clientNote: PAINT_UPGRADE_NOTE,
  }
}

export const WALL_SUBSTRATE_RATES = DEFAULT_PRODUCTION_RATES.filter(
  (rate) => rate.substrateGroup === "walls",
)

function speedRate(
  id: string,
  category: string,
  label: string,
  basis: RateBasis,
  measure: SurfaceMeasure,
  speed: number,
  coverage: number,
  primerSpeed: number,
  primerCoverage: number,
  productName: string,
): ProductionRate {
  return {
    id,
    category,
    internalLabel: label,
    clientLabel: label,
    basis,
    measure,
    coatRates: [
      { coats: 1, value: speed },
      { coats: 2, value: speed },
    ],
    coveragePerCoat: coverage,
    primerRate: primerSpeed,
    primerCoveragePerCoat: primerCoverage,
    productName,
    productCostPerGallon: 0,
    clientDescription: `${label} painted the full number of coats.`,
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
  }
}

function surface(rateId: string, coatCount: number, itemCount: number): SurfaceInput {
  return {
    id: rateId,
    rateId,
    coatCount,
    itemCount,
    quantityOverride: null,
    crewNote: "",
  }
}
