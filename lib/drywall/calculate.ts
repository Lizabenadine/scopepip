import { areaSqFt, toDecimalFeet } from "../estimate/dimensions.ts"
import type {
  DrywallBuyListItem,
  DrywallQuote,
  DrywallRoom,
  DrywallScope,
} from "../estimate/multi-trade-types.ts"
import { DRYWALL_BOARD_LABELS, DRYWALL_BOARD_SIZE_SPECS, DRYWALL_FINISH_LEVEL_LABELS } from "./defaults.ts"

/**
 * Recomputes geometry for a drywall room:
 * - Gross ceiling area = Length × Width
 * - Gross wall area = 2 × (Length + Width) × Height
 * - Deductions = Openings area (doors, windows, archways)
 * - Net wall area = Gross wall area - Deductions
 * - Total net board area = (includeCeiling ? Ceiling : 0) + (includeWalls ? Net Walls : 0)
 */
export function recomputeDrywallRoomGeometry(room: DrywallRoom): DrywallRoom {
  const l = toDecimalFeet(room.length)
  const w = toDecimalFeet(room.width)
  const h = toDecimalFeet(room.height)

  const grossCeiling = room.includeCeiling ? Number((l * w).toFixed(2)) : 0
  const grossWalls = room.includeWalls ? Number((2 * (l + w) * h).toFixed(2)) : 0

  const openingsTotal = (room.openings || []).reduce((sum, op) => {
    const opSqFt = areaSqFt(op.width, op.height)
    return sum + opSqFt
  }, 0)

  const netWalls = Math.max(0, Number((grossWalls - openingsTotal).toFixed(2)))
  const totalNet = Number((grossCeiling + netWalls).toFixed(2))

  return {
    ...room,
    netCeilingSqFt: grossCeiling,
    netWallSqFt: netWalls,
    totalNetSqFt: totalNet,
  }
}

/**
 * Calculates complete drywall quote and purchasing buy-list.
 * Ensures:
 * 1. Sheet counts are rounded UP to whole boards based on board size.
 * 2. Waste allowances are accurately calculated.
 * 3. Fasteners, tape, compound buckets, and bead are calculated in practical purchasing units.
 * 4. Hanging and Level 0-5 finishing labor are priced accurately.
 */
export function calculateDrywallQuote(scope: DrywallScope): DrywallQuote {
  let totalNetSqFt = 0
  let totalWallSqFt = 0
  let totalCeilingSqFt = 0
  let totalSheets = 0
  let totalBoardMaterialCost = 0
  let totalCompoundCost = 0
  let totalFastenersAndTapeCost = 0
  let totalCornerBeadCost = 0
  let totalInsulationCost = 0
  let totalFramingCost = 0
  let totalHangingLaborCost = 0
  let totalFinishingLaborCost = 0

  const buyListMap = new Map<string, DrywallBuyListItem>()

  function addBuyListItem(item: DrywallBuyListItem) {
    const existing = buyListMap.get(item.id)
    if (existing) {
      existing.estimatedQuantity += item.estimatedQuantity
      existing.purchasingQuantity += item.purchasingQuantity
      existing.totalCost += item.totalCost
    } else {
      buyListMap.set(item.id, { ...item })
    }
  }

  for (const rawRoom of scope.rooms) {
    const room = recomputeDrywallRoomGeometry(rawRoom)
    totalNetSqFt += room.totalNetSqFt
    totalWallSqFt += room.netWallSqFt
    totalCeilingSqFt += room.netCeilingSqFt

    if (room.totalNetSqFt <= 0) continue

    // 1. Drywall Boards
    const wasteFactor = 1 + (room.wastePercent ?? 10) / 100
    const grossBoardArea = Number((room.totalNetSqFt * wasteFactor).toFixed(2))

    const sizeSpec = DRYWALL_BOARD_SIZE_SPECS[room.boardSize] || DRYWALL_BOARD_SIZE_SPECS["4x8"]
    const sqFtPerSheet = sizeSpec.sqFt
    const sheetsNeeded = Math.ceil(grossBoardArea / sqFtPerSheet)
    totalSheets += sheetsNeeded

    const boardCost = sheetsNeeded * (room.boardCostPerSheet || 14.5)
    totalBoardMaterialCost += boardCost

    const boardLabel = `${DRYWALL_BOARD_LABELS[room.boardType] || "Drywall"} — ${sizeSpec.label}`
    addBuyListItem({
      id: `dw-board-${room.boardType}-${room.boardSize}`,
      category: "board",
      label: boardLabel,
      estimatedQuantity: Number(grossBoardArea.toFixed(1)),
      purchasingQuantity: sheetsNeeded,
      unit: "sheets",
      unitCost: room.boardCostPerSheet || 14.5,
      totalCost: boardCost,
    })

    // 2. Fasteners (Screws)
    // ~32 screws per 4x8 sheet, 1,500 screws per 5 lb box (~45 sheets per 5 lb box)
    const totalScrews = sheetsNeeded * 32
    const screwBoxes = Math.ceil(totalScrews / 1500)
    const screwCost = screwBoxes * 18.0
    totalFastenersAndTapeCost += screwCost

    addBuyListItem({
      id: "dw-fasteners-screws",
      category: "fasteners",
      label: '1-1/4" Coarse Drywall Screws (5 lb box, ~1,500 pcs)',
      estimatedQuantity: totalScrews,
      purchasingQuantity: screwBoxes,
      unit: "boxes (5 lb)",
      unitCost: 18.0,
      totalCost: screwCost,
    })

    // 3. Joint Tape
    // 500 ft roll covers ~750 sq ft of board
    const tapeRolls = Math.ceil(room.totalNetSqFt / 750)
    const tapeCost = tapeRolls * 9.5
    totalFastenersAndTapeCost += tapeCost

    addBuyListItem({
      id: "dw-tape-paper",
      category: "tape",
      label: "Cross-Fiber Paper Joint Tape (500' roll)",
      estimatedQuantity: room.totalNetSqFt,
      purchasingQuantity: tapeRolls,
      unit: "rolls (500')",
      unitCost: 9.5,
      totalCost: tapeCost,
    })

    // 4. Joint Compound (Mud)
    // Standard Level 4 finish: 1 bucket (4.5 gal) covers ~450 sq ft
    // Level 5 skim coat requires +1 bucket per ~350 sq ft
    let mudCoverageSqFt = 450
    if (room.finishLevel === 5) {
      mudCoverageSqFt = 200 // More mud for full surface skim
    } else if (room.finishLevel <= 2) {
      mudCoverageSqFt = 700 // Less mud for fire-tape only
    }

    const mudBuckets = Math.ceil(room.totalNetSqFt / mudCoverageSqFt)
    const mudCost = mudBuckets * 21.5
    totalCompoundCost += mudCost

    addBuyListItem({
      id: "dw-compound-bucket",
      category: "mud",
      label: "All-Purpose Lightweight Joint Compound (4.5 gal pail)",
      estimatedQuantity: room.totalNetSqFt,
      purchasingQuantity: mudBuckets,
      unit: "pails (4.5 gal)",
      unitCost: 21.5,
      totalCost: mudCost,
    })

    // 5. Corner Bead
    if (room.outsideCornerBeadFt && room.outsideCornerBeadFt > 0) {
      const beadSticks = Math.ceil(room.outsideCornerBeadFt / 8)
      const beadCost = Number((room.outsideCornerBeadFt * (room.cornerBeadCostPerFt || 0.75)).toFixed(2))
      totalCornerBeadCost += beadCost

      addBuyListItem({
        id: "dw-corner-bead",
        category: "corner_bead",
        label: "Metal / Vinyl Corner Bead (8' stick)",
        estimatedQuantity: room.outsideCornerBeadFt,
        purchasingQuantity: beadSticks,
        unit: "sticks (8')",
        unitCost: Number((beadCost / Math.max(1, beadSticks)).toFixed(2)),
        totalCost: beadCost,
      })
    }

    // 6. Insulation
    if (room.insulationType && room.insulationType !== "none") {
      const insCost = Number((room.totalNetSqFt * (room.insulationCostPerSqFt || 0.95)).toFixed(2))
      totalInsulationCost += insCost

      const insBags = Math.ceil(room.totalNetSqFt / 80)
      addBuyListItem({
        id: `dw-insulation-${room.insulationType}`,
        category: "insulation",
        label: `${room.insulationType === "sound_safensound" ? "Safe'n'Sound Mineral Wool" : "Fiberglass Batt Insulation"} (covers 80 sf)`,
        estimatedQuantity: room.totalNetSqFt,
        purchasingQuantity: insBags,
        unit: "bags",
        unitCost: Number((insCost / Math.max(1, insBags)).toFixed(2)),
        totalCost: insCost,
      })
    }

    // 7. Framing
    if (room.framingLinearFt && room.framingLinearFt > 0) {
      const frameCost = Number((room.framingLinearFt * (room.framingCostPerFt || 4.5)).toFixed(2))
      totalFramingCost += frameCost

      const studsNeeded = Math.ceil(room.framingLinearFt / 1.33) + 2
      addBuyListItem({
        id: "dw-framing-studs",
        category: "framing",
        label: "Metal / Wood Framing Studs (16\" o.c.)",
        estimatedQuantity: room.framingLinearFt,
        purchasingQuantity: studsNeeded,
        unit: "studs",
        unitCost: Number((frameCost / Math.max(1, studsNeeded)).toFixed(2)),
        totalCost: frameCost,
      })
    }

    // 8. Hanging Labor
    const hangCost = Number((room.totalNetSqFt * (room.hangCostPerSqFt || 0.65)).toFixed(2))
    totalHangingLaborCost += hangCost

    // 9. Finishing Labor (based on Level 0-5)
    const levelSpec = DRYWALL_FINISH_LEVEL_LABELS[room.finishLevel] || DRYWALL_FINISH_LEVEL_LABELS[4]
    const effectiveFinishRate =
      room.finishCostPerSqFt !== undefined && room.finishCostPerSqFt > 0
        ? room.finishCostPerSqFt
        : levelSpec.costPerSqFt
    const finishCost = Number((room.totalNetSqFt * effectiveFinishRate).toFixed(2))
    totalFinishingLaborCost += finishCost
  }

  const dumpsterFee = Number(scope.dumpsterFee || 0)
  const subtotal = Number(
    (
      totalBoardMaterialCost +
      totalCompoundCost +
      totalFastenersAndTapeCost +
      totalCornerBeadCost +
      totalInsulationCost +
      totalFramingCost +
      totalHangingLaborCost +
      totalFinishingLaborCost +
      dumpsterFee
    ).toFixed(2)
  )

  const overheadPct = (scope.overheadPercent ?? 10) / 100
  const overhead = Number((subtotal * overheadPct).toFixed(2))
  const costBasis = subtotal + overhead

  let profit = 0
  let effectiveMarginPercent = 0
  let effectiveMarkupPercent = 0

  if (scope.profitMode === "margin") {
    // True Profit Margin: Margin % = Profit / Total
    // Total = CostBasis / (1 - MarginRate)
    const marginRate = Math.min(0.95, Math.max(0, (scope.profitPercent ?? 20) / 100))
    const totalWithMargin = marginRate >= 0.99 ? costBasis : costBasis / (1 - marginRate)
    profit = Number((totalWithMargin - costBasis).toFixed(2))
    effectiveMarginPercent = Number((marginRate * 100).toFixed(1))
    effectiveMarkupPercent = costBasis > 0 ? Number(((profit / costBasis) * 100).toFixed(1)) : 0
  } else {
    // Markup on Cost: Markup % = Profit / CostBasis
    // Profit = CostBasis * MarkupRate
    const markupRate = Math.max(0, (scope.profitPercent ?? 20) / 100)
    profit = Number((costBasis * markupRate).toFixed(2))
    effectiveMarkupPercent = Number((markupRate * 100).toFixed(1))
    const totalWithMarkup = costBasis + profit
    effectiveMarginPercent = totalWithMarkup > 0 ? Number(((profit / totalWithMarkup) * 100).toFixed(1)) : 0
  }

  const total = Number((costBasis + profit).toFixed(2))

  return {
    totalNetSqFt: Number(totalNetSqFt.toFixed(2)),
    wallSqFt: Number(totalWallSqFt.toFixed(2)),
    ceilingSqFt: Number(totalCeilingSqFt.toFixed(2)),
    totalSheets,
    boardMaterialCost: totalBoardMaterialCost,
    jointCompoundCost: totalCompoundCost,
    fastenersAndTapeCost: totalFastenersAndTapeCost,
    cornerBeadCost: totalCornerBeadCost,
    insulationCost: totalInsulationCost,
    framingCost: totalFramingCost,
    hangingLaborCost: totalHangingLaborCost,
    finishingLaborCost: totalFinishingLaborCost,
    dumpsterFee,
    subtotal,
    overhead,
    profit,
    effectiveMarginPercent,
    effectiveMarkupPercent,
    total,
    buyList: Array.from(buyListMap.values()),
  }
}
