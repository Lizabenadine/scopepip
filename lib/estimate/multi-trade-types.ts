/**
 * Multi-Trade Estimating Domain Models for Scopepipe
 * Supports Painting, Flooring, and Drywall with modular extension for future trades.
 */

export type TradeType = "painting" | "flooring" | "drywall"

export type FlooringJobType = "installation" | "refinish"
export type RefinishServiceType = "screen_recoat" | "sand_refinish" | "sand_stain_clear"
export type RefinishAreaSource = "manual" | "rooms"

export interface RefinishAddonItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

export interface FeetInches {
  feet: number
  inches: number
}

// ============================================================================
// FLOORING ESTIMATING MODEL
// ============================================================================

export type FlooringMaterialType =
  | "lvp"
  | "lvt"
  | "laminate"
  | "hardwood_engineered"
  | "hardwood_solid"
  | "tile_porcelain"
  | "tile_ceramic"
  | "tile_stone"
  | "carpet"
  | "carpet_tile"
  | "sheet_vinyl"

export interface FlooringDeduction {
  id: string
  name: string
  length: FeetInches
  width: FeetInches
  sqFt: number
}

export interface FlooringTransition {
  id: string
  type: "t_molding" | "reducer" | "end_cap" | "stair_nose" | "metal_edge"
  label: string
  pieces: number
  costPerPiece: number
}

export interface FlooringRoom {
  id: string
  name: string
  length: FeetInches
  width: FeetInches
  scanGeometry?: { areaSqFt: number; perimeterFt: number }
  grossSqFt: number
  deductions: FlooringDeduction[]
  additionsSqFt: number
  netSqFt: number
  perimeterFt: number
  materialType: FlooringMaterialType
  materialName: string
  sqFtPerBox: number
  wastePercent: number
  materialCostPerSqFt: number
  installCostPerSqFt: number
  underlaymentType: "none" | "foam_2mm" | "moisture_barrier" | "cork" | "cement_backer"
  underlaymentCostPerSqFt: number
  removeExistingType: "none" | "carpet_pad" | "tile" | "hardwood" | "vinyl"
  removeCostPerSqFt: number
  subfloorPrepType: "none" | "patch" | "self_leveler" | "plywood"
  subfloorCostPerSqFt: number
  includeBaseboard: boolean
  baseboardCostPerFt: number
  includeQuarterRound: boolean
  quarterRoundCostPerFt: number
  transitions: FlooringTransition[]
  notes?: string
}

export interface FlooringAssemblyTemplate {
  id: string
  name: string
  description: string
  materialType: FlooringMaterialType
  sqFtPerBox: number
  wastePercent: number
  materialCostPerSqFt: number
  installCostPerSqFt: number
  underlaymentType: "none" | "foam_2mm" | "moisture_barrier" | "cork" | "cement_backer"
  underlaymentCostPerSqFt: number
  removeExistingType: "none" | "carpet_pad" | "tile" | "hardwood" | "vinyl"
  removeCostPerSqFt: number
  subfloorPrepType: "none" | "patch" | "self_leveler" | "plywood"
  subfloorCostPerSqFt: number
  includeBaseboard: boolean
  baseboardCostPerFt: number
  includeQuarterRound: boolean
  quarterRoundCostPerFt: number
}

export interface FlooringScope {
  jobType?: FlooringJobType
  refinishService?: RefinishServiceType
  refinishAreaSource?: RefinishAreaSource
  refinishManualSqFt?: number
  refinishSellingRatePerSqFt?: number
  refinishStairs?: RefinishAddonItem[]
  refinishRepairs?: RefinishAddonItem[]
  taxPercent?: number
  taxBasis?: "materials_only" | "total_job"
  rooms: FlooringRoom[]
  defaultWastePercent: number
  dumpsterFee: number
  overheadPercent: number
  profitPercent: number
  profitMode?: "margin" | "markup"
  notes?: string
}

export interface FlooringBuyListItem {
  id: string
  category: "flooring" | "underlayment" | "subfloor" | "trim" | "transition" | "mortar_grout"
  label: string
  estimatedQuantity: number
  purchasingQuantity: number
  unit: string
  unitCost: number
  totalCost: number
}

export interface FlooringQuote {
  jobType?: FlooringJobType
  netSqFt: number
  grossSqFt: number
  totalBoxes: number
  materialCost: number
  laborCost: number
  prepCost: number
  demoCost: number
  trimCost: number
  transitionsCost: number
  dumpsterFee: number
  subtotal: number
  overhead: number
  profit: number
  effectiveMarginPercent: number
  effectiveMarkupPercent: number
  total: number
  buyList: FlooringBuyListItem[]
  refinishService?: RefinishServiceType
  refinishSellingRate?: number
  refinishBasePrice?: number
  stairsTotal?: number
  repairsTotal?: number
  tax?: number
}

// ============================================================================
// DRYWALL ESTIMATING MODEL
// ============================================================================

export type DrywallBoardType =
  | "half_standard"
  | "five_eighths_fire"
  | "half_moisture"
  | "half_ceiling"
  | "quarter_flex"
  | "cement_board"

export type DrywallBoardSize = "4x8" | "4x10" | "4x12" | "54x12"

export type DrywallFinishLevel = 0 | 1 | 2 | 3 | 4 | 5

export type DrywallTexture =
  | "smooth"
  | "orange_peel"
  | "knockdown"
  | "popcorn_removal"
  | "none"

export interface DrywallOpening {
  id: string
  type: "standard_door" | "double_door" | "window" | "large_cased" | "custom"
  name: string
  width: FeetInches
  height: FeetInches
  sqFt: number
}

export interface DrywallRoom {
  id: string
  name: string
  length: FeetInches
  width: FeetInches
  height: FeetInches
  includeCeiling: boolean
  includeWalls: boolean
  openings: DrywallOpening[]
  netWallSqFt: number
  netCeilingSqFt: number
  totalNetSqFt: number
  boardType: DrywallBoardType
  boardSize: DrywallBoardSize
  wastePercent: number
  finishLevel: DrywallFinishLevel
  texture: DrywallTexture
  boardCostPerSheet: number
  hangCostPerSqFt: number
  finishCostPerSqFt: number
  outsideCornerBeadFt: number
  cornerBeadCostPerFt: number
  insulationType: "none" | "r13_batt" | "r19_batt" | "r30_ceiling" | "sound_safensound"
  insulationCostPerSqFt: number
  framingLinearFt: number
  framingCostPerFt: number
  notes?: string
}

export interface DrywallAssemblyTemplate {
  id: string
  name: string
  description: string
  boardType: DrywallBoardType
  boardSize: DrywallBoardSize
  wastePercent: number
  finishLevel: DrywallFinishLevel
  texture: DrywallTexture
  boardCostPerSheet: number
  hangCostPerSqFt: number
  finishCostPerSqFt: number
  insulationType: "none" | "r13_batt" | "r19_batt" | "r30_ceiling" | "sound_safensound"
  insulationCostPerSqFt: number
}

export interface DrywallScope {
  rooms: DrywallRoom[]
  defaultWastePercent: number
  dumpsterFee: number
  overheadPercent: number
  profitPercent: number
  profitMode?: "margin" | "markup"
  notes?: string
}

export interface DrywallBuyListItem {
  id: string
  category: "board" | "mud" | "tape" | "fasteners" | "corner_bead" | "insulation" | "framing"
  label: string
  estimatedQuantity: number
  purchasingQuantity: number
  unit: string
  unitCost: number
  totalCost: number
}

export interface DrywallQuote {
  totalNetSqFt: number
  wallSqFt: number
  ceilingSqFt: number
  totalSheets: number
  boardMaterialCost: number
  jointCompoundCost: number
  fastenersAndTapeCost: number
  cornerBeadCost: number
  insulationCost: number
  framingCost: number
  hangingLaborCost: number
  finishingLaborCost: number
  dumpsterFee: number
  subtotal: number
  overhead: number
  profit: number
  effectiveMarginPercent: number
  effectiveMarkupPercent: number
  total: number
  buyList: DrywallBuyListItem[]
}

// ============================================================================
// COMBINED MULTI-TRADE MODEL
// ============================================================================

export interface TradeSummary {
  trade: TradeType
  label: string
  netQuantityLabel: string
  materialCost: number
  laborCost: number
  subtotal: number
  total: number
}

export interface MultiTradeQuote {
  trades: TradeType[]
  paintingTotal: number
  flooringTotal: number
  drywallTotal: number
  combinedSubtotal: number
  combinedOverhead: number
  combinedProfit: number
  combinedTotal: number
  depositAmount: number
  balanceAmount: number
  tradeSummaries: TradeSummary[]
  combinedBuyList: {
    trade: TradeType
    tradeLabel: string
    items: (FlooringBuyListItem | DrywallBuyListItem)[]
  }[]
}
