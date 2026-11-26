import type {
  FlooringAssemblyTemplate,
  FlooringMaterialType,
  FlooringRoom,
  FlooringScope,
  RefinishServiceType,
} from "../estimate/multi-trade-types.ts"

export const REFINISH_SERVICE_LABELS: Record<RefinishServiceType, string> = {
  screen_recoat: "Screen & Recoat",
  sand_refinish: "Sand & Refinish (Clear Coat)",
  sand_stain_clear: "Sand, Stain & Clear Coat",
}

export const REFINISH_SERVICE_DESCRIPTIONS: Record<RefinishServiceType, string> = {
  screen_recoat: "Light abrasion and fresh protective topcoat without sanding down to bare wood.",
  sand_refinish: "Sand to raw wood, seal, and apply durable clear protective coats (natural finish).",
  sand_stain_clear: "Sand down to bare wood, apply custom color stain, and multi-coat protective finish.",
}

export const REFINISH_DEFAULT_RATES: Record<RefinishServiceType, number> = {
  screen_recoat: 3.5,
  sand_refinish: 5.5,
  sand_stain_clear: 8.0,
}

export const FLOORING_MATERIAL_LABELS: Record<FlooringMaterialType, string> = {
  lvp: "Luxury Vinyl Plank (LVP)",
  lvt: "Luxury Vinyl Tile (LVT)",
  laminate: "Laminate Flooring",
  hardwood_engineered: "Engineered Hardwood",
  hardwood_solid: "Solid Hardwood",
  tile_porcelain: "Porcelain Tile",
  tile_ceramic: "Ceramic Tile",
  tile_stone: "Natural Stone Tile",
  carpet: "Plush Carpet & Pad",
  carpet_tile: "Commercial Carpet Tile",
  sheet_vinyl: "Sheet Vinyl",
}

export const FLOORING_DEFAULT_SPECS: Record<
  FlooringMaterialType,
  {
    sqFtPerBox: number
    wastePercent: number
    materialCostPerSqFt: number
    installCostPerSqFt: number
  }
> = {
  lvp: { sqFtPerBox: 23.8, wastePercent: 10, materialCostPerSqFt: 3.49, installCostPerSqFt: 2.25 },
  lvt: { sqFtPerBox: 24.0, wastePercent: 10, materialCostPerSqFt: 3.25, installCostPerSqFt: 2.5 },
  laminate: { sqFtPerBox: 21.5, wastePercent: 10, materialCostPerSqFt: 2.49, installCostPerSqFt: 2.0 },
  hardwood_engineered: { sqFtPerBox: 20.0, wastePercent: 10, materialCostPerSqFt: 5.95, installCostPerSqFt: 3.5 },
  hardwood_solid: { sqFtPerBox: 20.0, wastePercent: 12, materialCostPerSqFt: 7.5, installCostPerSqFt: 4.25 },
  tile_porcelain: { sqFtPerBox: 15.0, wastePercent: 12, materialCostPerSqFt: 4.25, installCostPerSqFt: 6.5 },
  tile_ceramic: { sqFtPerBox: 15.0, wastePercent: 10, materialCostPerSqFt: 2.95, installCostPerSqFt: 5.5 },
  tile_stone: { sqFtPerBox: 12.0, wastePercent: 15, materialCostPerSqFt: 8.5, installCostPerSqFt: 8.0 },
  carpet: { sqFtPerBox: 100.0, wastePercent: 10, materialCostPerSqFt: 2.25, installCostPerSqFt: 1.15 },
  carpet_tile: { sqFtPerBox: 20.0, wastePercent: 8, materialCostPerSqFt: 3.1, installCostPerSqFt: 1.85 },
  sheet_vinyl: { sqFtPerBox: 100.0, wastePercent: 12, materialCostPerSqFt: 2.1, installCostPerSqFt: 1.75 },
}

export const FLOORING_ASSEMBLY_TEMPLATES: FlooringAssemblyTemplate[] = [
  {
    id: "template-lvp-package",
    name: "LVP Premium Package",
    description: "Click-lock luxury vinyl plank with sound/moisture underlayment, carpet tear-out, and quarter round.",
    materialType: "lvp",
    sqFtPerBox: 23.8,
    wastePercent: 10,
    materialCostPerSqFt: 3.49,
    installCostPerSqFt: 2.25,
    underlaymentType: "moisture_barrier",
    underlaymentCostPerSqFt: 0.45,
    removeExistingType: "carpet_pad",
    removeCostPerSqFt: 0.5,
    subfloorPrepType: "patch",
    subfloorCostPerSqFt: 0.35,
    includeBaseboard: false,
    baseboardCostPerFt: 0,
    includeQuarterRound: true,
    quarterRoundCostPerFt: 1.5,
  },
  {
    id: "template-porcelain-tile",
    name: "Porcelain Tile Package",
    description: "Porcelain tile with cement backerboard, thinset, grout, and existing floor demo.",
    materialType: "tile_porcelain",
    sqFtPerBox: 15.0,
    wastePercent: 12,
    materialCostPerSqFt: 4.5,
    installCostPerSqFt: 6.5,
    underlaymentType: "cement_backer",
    underlaymentCostPerSqFt: 1.25,
    removeExistingType: "tile",
    removeCostPerSqFt: 2.5,
    subfloorPrepType: "self_leveler",
    subfloorCostPerSqFt: 0.85,
    includeBaseboard: false,
    baseboardCostPerFt: 0,
    includeQuarterRound: false,
    quarterRoundCostPerFt: 0,
  },
  {
    id: "template-engineered-hardwood",
    name: "Engineered Hardwood Living",
    description: "Engineered hardwood plank with premium acoustical underlayment and matched trim.",
    materialType: "hardwood_engineered",
    sqFtPerBox: 20.0,
    wastePercent: 10,
    materialCostPerSqFt: 6.25,
    installCostPerSqFt: 3.5,
    underlaymentType: "cork",
    underlaymentCostPerSqFt: 0.75,
    removeExistingType: "carpet_pad",
    removeCostPerSqFt: 0.5,
    subfloorPrepType: "patch",
    subfloorCostPerSqFt: 0.35,
    includeBaseboard: false,
    baseboardCostPerFt: 0,
    includeQuarterRound: true,
    quarterRoundCostPerFt: 1.75,
  },
]

export function createBlankFlooringRoom(name = "Living Room"): FlooringRoom {
  return {
    id: `fl-room-${Math.random().toString(36).slice(2, 9)}`,
    name,
    length: { feet: 14, inches: 0 },
    width: { feet: 12, inches: 0 },
    grossSqFt: 168,
    deductions: [],
    additionsSqFt: 0,
    netSqFt: 168,
    perimeterFt: 52,
    materialType: "lvp",
    materialName: "Luxury Vinyl Plank 7mm",
    sqFtPerBox: 23.8,
    wastePercent: 10,
    materialCostPerSqFt: 3.49,
    installCostPerSqFt: 2.25,
    underlaymentType: "moisture_barrier",
    underlaymentCostPerSqFt: 0.45,
    removeExistingType: "carpet_pad",
    removeCostPerSqFt: 0.5,
    subfloorPrepType: "none",
    subfloorCostPerSqFt: 0,
    includeBaseboard: false,
    baseboardCostPerFt: 3.5,
    includeQuarterRound: true,
    quarterRoundCostPerFt: 1.5,
    transitions: [
      {
        id: `trans-${Math.random().toString(36).slice(2, 7)}`,
        type: "t_molding",
        label: "Hallway Transition (T-Molding)",
        pieces: 1,
        costPerPiece: 32,
      },
    ],
  }
}

export function createBlankFlooringScope(): FlooringScope {
  return {
    jobType: "installation",
    refinishService: "sand_stain_clear",
    refinishAreaSource: "manual",
    refinishManualSqFt: 0,
    refinishSellingRatePerSqFt: 8,
    refinishStairs: [],
    refinishRepairs: [],
    rooms: [createBlankFlooringRoom("Main Room")],
    defaultWastePercent: 10,
    dumpsterFee: 150,
    overheadPercent: 10,
    profitPercent: 20,
    profitMode: "margin",
    notes: "Prices include standard subfloor sweep, straight lay pattern, and manufacturer warranty guidelines.",
  }
}
