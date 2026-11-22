import type {
  DrywallAssemblyTemplate,
  DrywallBoardSize,
  DrywallBoardType,
  DrywallFinishLevel,
  DrywallRoom,
  DrywallScope,
} from "../estimate/multi-trade-types.ts"

export const DRYWALL_BOARD_LABELS: Record<DrywallBoardType, string> = {
  half_standard: '1/2" Standard Drywall',
  five_eighths_fire: '5/8" Type X Fire-Rated Drywall',
  half_moisture: '1/2" Moisture & Mold Resistant (Greenboard)',
  half_ceiling: '1/2" High-Strength Sag-Resistant Ceiling Board',
  quarter_flex: '1/4" Flexible Repair Drywall',
  cement_board: '1/2" Cement Backerboard (Durock/Hardie)',
}

export const DRYWALL_BOARD_SIZE_SPECS: Record<
  DrywallBoardSize,
  { label: string; sqFt: number; lengthFt: number; widthFt: number }
> = {
  "4x8": { label: "4' x 8' (32 sq ft)", sqFt: 32, lengthFt: 8, widthFt: 4 },
  "4x10": { label: "4' x 10' (40 sq ft)", sqFt: 40, lengthFt: 10, widthFt: 4 },
  "4x12": { label: "4' x 12' (48 sq ft)", sqFt: 48, lengthFt: 12, widthFt: 4 },
  "54x12": { label: "54\" x 12' (54 sq ft) for 9ft ceilings", sqFt: 54, lengthFt: 12, widthFt: 4.5 },
}

export const DRYWALL_FINISH_LEVEL_LABELS: Record<DrywallFinishLevel, { name: string; description: string; costPerSqFt: number }> = {
  0: { name: "Level 0 — No Taping", description: "Boards hung only. No joint tape or compound. Used for temporary dust partitions.", costPerSqFt: 0 },
  1: { name: "Level 1 — Fire Taping", description: "Tape embedded in compound at all joints and interior angles. Smoke/fire barrier in attics and plenums.", costPerSqFt: 0.35 },
  2: { name: "Level 2 — Water Resistant / Garage", description: "Tape embedded with 1 thin coat over tape and fastener heads. Substrate for tile backer or garage walls.", costPerSqFt: 0.55 },
  3: { name: "Level 3 — Heavy Texture Base", description: "Tape embedded + 2 coats over joints, 1 coat over angles. Ready for heavy orange peel or knockdown texture.", costPerSqFt: 0.85 },
  4: { name: "Level 4 — Standard Residential", description: "Tape embedded + 3 coats over joints, 2 coats over angles. Sanded smooth for flat paint or light texture.", costPerSqFt: 1.25 },
  5: { name: "Level 5 — Premium Full Skim Coat", description: "Level 4 finish PLUS a complete thin skim coat over the entire surface to equalize suction under critical light.", costPerSqFt: 1.95 },
}

export const DRYWALL_ASSEMBLY_TEMPLATES: DrywallAssemblyTemplate[] = [
  {
    id: "template-residential-l4",
    name: "Residential Level 4 Finish",
    description: "Standard 1/2\" residential drywall with Level 4 smooth finish for flat paints and light texture.",
    boardType: "half_standard",
    boardSize: "4x8",
    wastePercent: 10,
    finishLevel: 4,
    texture: "orange_peel",
    boardCostPerSheet: 14.5,
    hangCostPerSqFt: 0.65,
    finishCostPerSqFt: 1.25,
    insulationType: "none",
    insulationCostPerSqFt: 0,
  },
  {
    id: "template-high-end-l5",
    name: "High-End Architectural Level 5",
    description: "Premium smooth Level 5 skim coat over 4x12 sheets for flawless look under critical lighting.",
    boardType: "half_standard",
    boardSize: "4x12",
    wastePercent: 12,
    finishLevel: 5,
    texture: "smooth",
    boardCostPerSheet: 21.75,
    hangCostPerSqFt: 0.75,
    finishCostPerSqFt: 1.95,
    insulationType: "sound_safensound",
    insulationCostPerSqFt: 1.15,
  },
  {
    id: "template-garage-fire",
    name: "Garage 5/8\" Fire-Rated Wall",
    description: "5/8\" Type X fire-rated drywall with Level 2 fire tape finish for code compliance.",
    boardType: "five_eighths_fire",
    boardSize: "4x8",
    wastePercent: 10,
    finishLevel: 2,
    texture: "none",
    boardCostPerSheet: 18.5,
    hangCostPerSqFt: 0.75,
    finishCostPerSqFt: 0.55,
    insulationType: "r19_batt",
    insulationCostPerSqFt: 0.95,
  },
]

export function createBlankDrywallRoom(name = "Main Room"): DrywallRoom {
  return {
    id: `dw-room-${Math.random().toString(36).slice(2, 9)}`,
    name,
    length: { feet: 16, inches: 0 },
    width: { feet: 12, inches: 0 },
    height: { feet: 8, inches: 0 },
    includeCeiling: true,
    includeWalls: true,
    openings: [
      {
        id: "door-1",
        type: "standard_door",
        name: "Entry Door (3'x6'8\")",
        width: { feet: 3, inches: 0 },
        height: { feet: 6, inches: 8 },
        sqFt: 20,
      },
      {
        id: "win-1",
        type: "window",
        name: "Window (3'x5')",
        width: { feet: 3, inches: 0 },
        height: { feet: 5, inches: 0 },
        sqFt: 15,
      },
    ],
    netWallSqFt: 413,
    netCeilingSqFt: 192,
    totalNetSqFt: 605,
    boardType: "half_standard",
    boardSize: "4x8",
    wastePercent: 10,
    finishLevel: 4,
    texture: "orange_peel",
    boardCostPerSheet: 14.5,
    hangCostPerSqFt: 0.65,
    finishCostPerSqFt: 0,
    outsideCornerBeadFt: 16,
    cornerBeadCostPerFt: 0.75,
    insulationType: "none",
    insulationCostPerSqFt: 0,
    framingLinearFt: 0,
    framingCostPerFt: 0,
    notes: "",
  }
}

export function createBlankDrywallScope(): DrywallScope {
  return {
    rooms: [createBlankDrywallRoom("Great Room")],
    defaultWastePercent: 10,
    dumpsterFee: 150,
    overheadPercent: 10,
    profitPercent: 20,
    profitMode: "margin",
    notes: "Prices include standard fastener spacing, tape embedding, 3-coat joint compound, and dust control.",
  }
}
