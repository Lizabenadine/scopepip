import { areaSqFt, perimeterLinearFt, toDecimalFeet } from "../estimate/dimensions.ts"
import type {
  FlooringBuyListItem,
  FlooringQuote,
  FlooringRoom,
  FlooringScope,
} from "../estimate/multi-trade-types.ts"
import { FLOORING_MATERIAL_LABELS } from "./defaults.ts"

/**
 * Recomputes geometry for a single flooring room:
 * - Gross area = reviewed scan area or Length × Width
 * - Deductions = Sum of deduction areas (islands, fireplaces, stairwells)
 * - Net area = Gross area - Deductions + Additions
 * - Perimeter = scan boundary or 2 × (Length + Width)
 */
export function recomputeRoomGeometry(room: FlooringRoom): FlooringRoom {
  const gross = room.scanGeometry?.areaSqFt ?? areaSqFt(room.length, room.width)
  const deductionsTotal = room.deductions.reduce((sum, d) => {
    const dSqFt = areaSqFt(d.length, d.width)
    return sum + dSqFt
  }, 0)
  const additions = Number.isFinite(room.additionsSqFt) ? Math.max(0, room.additionsSqFt) : 0
  const net = Math.max(0, Number((gross - deductionsTotal + additions).toFixed(2)))
  const perim = room.scanGeometry?.perimeterFt ?? perimeterLinearFt(room.length, room.width)

  return {
    ...room,
    grossSqFt: gross,
    netSqFt: net,
    perimeterFt: perim,
  }
}

/**
 * Calculates complete flooring quote and purchasing buy-list.
 * Ensures:
 * 1. Material is purchased in whole cartons/boxes, rounded UP.
 * 2. Waste allowances are accurately calculated on net area.
 * 3. Underlayment, mortar, grout, and patch are calculated in full rolls/bags.
 * 4. Overhead and profit markup are applied cleanly without double-counting.
 */
export function calculateFlooringQuote(
  scope: FlooringScope,
  settings?: { taxPercent?: number; taxBasis?: "materials_only" | "total_job" }
): FlooringQuote {
  // ============================================================================
  // REFINISH EXISTING HARDWOOD
  // ============================================================================
  if (scope.jobType === "refinish") {
    const areaSource = scope.refinishAreaSource ?? "manual"
    let totalNetSqFt = 0
    let totalGrossSqFt = 0

    if (areaSource === "manual") {
      totalNetSqFt = Math.max(0, Number(scope.refinishManualSqFt ?? 0))
      totalGrossSqFt = totalNetSqFt
    } else {
      for (const rawRoom of scope.rooms || []) {
        const room = recomputeRoomGeometry(rawRoom)
        totalNetSqFt += room.netSqFt
        totalGrossSqFt += room.grossSqFt
      }
      totalNetSqFt = Number(totalNetSqFt.toFixed(2))
      totalGrossSqFt = Number(totalGrossSqFt.toFixed(2))
    }

    const rate = Math.max(0, Number(scope.refinishSellingRatePerSqFt ?? 0))
    const refinishBasePrice = Number((totalNetSqFt * rate).toFixed(2))

    // Optional stairs add-ons
    const stairsTotal = Number(
      (scope.refinishStairs || [])
        .reduce((sum, item) => {
          const itemTotal =
            item.total !== undefined && item.total > 0
              ? item.total
              : (item.quantity || 0) * (item.unitPrice || 0)
          return sum + Number(itemTotal)
        }, 0)
        .toFixed(2)
    )

    // Optional repairs add-ons
    const repairsTotal = Number(
      (scope.refinishRepairs || [])
        .reduce((sum, item) => {
          const itemTotal =
            item.total !== undefined && item.total > 0
              ? item.total
              : (item.quantity || 0) * (item.unitPrice || 0)
          return sum + Number(itemTotal)
        }, 0)
        .toFixed(2)
    )

    // Base price is selling rate (which already includes overhead & margin)
    // Overhead and profit are skipped
    const subtotal = Number((refinishBasePrice + stairsTotal + repairsTotal).toFixed(2))
    const overhead = 0
    const profit = 0

    // Tax settings application
    const taxPercent = scope.taxPercent ?? settings?.taxPercent ?? 0
    const taxBasis = scope.taxBasis ?? settings?.taxBasis ?? "total_job"
    let tax = 0
    if (taxPercent > 0) {
      if (taxBasis === "total_job") {
        tax = Number(((subtotal * taxPercent) / 100).toFixed(2))
      }
      // "materials_only" has 0 material tax basis for refinishing services
    }

    const total = Number((subtotal + tax).toFixed(2))

    return {
      jobType: "refinish",
      refinishService: scope.refinishService ?? "sand_stain_clear",
      refinishSellingRate: rate,
      refinishBasePrice,
      stairsTotal,
      repairsTotal,
      tax,
      netSqFt: totalNetSqFt,
      grossSqFt: totalGrossSqFt,
      totalBoxes: 0,
      materialCost: 0,
      laborCost: refinishBasePrice,
      prepCost: 0,
      demoCost: 0,
      trimCost: 0,
      transitionsCost: 0,
      dumpsterFee: 0,
      subtotal,
      overhead,
      profit,
      effectiveMarginPercent: 0,
      effectiveMarkupPercent: 0,
      total,
      buyList: [],
    }
  }

  // ============================================================================
  // INSTALL NEW FLOORING
  // ============================================================================
  let totalNetSqFt = 0
  let totalGrossSqFtWithWaste = 0
  let totalBoxes = 0
  let totalMaterialCost = 0
  let totalLaborCost = 0
  let totalPrepCost = 0
  let totalDemoCost = 0
  let totalTrimCost = 0
  let totalTransitionsCost = 0

  const buyListMap = new Map<string, FlooringBuyListItem>()

  function addBuyListItem(item: FlooringBuyListItem) {
    const existing = buyListMap.get(item.id)
    if (existing) {
      existing.estimatedQuantity += item.estimatedQuantity
      existing.purchasingQuantity += item.purchasingQuantity
      existing.totalCost += item.totalCost
    } else {
      buyListMap.set(item.id, { ...item })
    }
  }

  for (const rawRoom of scope.rooms || []) {
    const room = recomputeRoomGeometry(rawRoom)
    totalNetSqFt += room.netSqFt

    // 1. Flooring Material & Cartons
    const wasteFactor = 1 + (room.wastePercent ?? 10) / 100
    const grossNeeded = Number((room.netSqFt * wasteFactor).toFixed(2))
    totalGrossSqFtWithWaste += grossNeeded

    const sqFtPerBox = room.sqFtPerBox > 0 ? room.sqFtPerBox : 20
    const boxes = Math.ceil(grossNeeded / sqFtPerBox)
    totalBoxes += boxes

    const purchasedSqFt = Number((boxes * sqFtPerBox).toFixed(2))
    const roomMaterialCost = Number((purchasedSqFt * room.materialCostPerSqFt).toFixed(2))
    totalMaterialCost += roomMaterialCost

    // Add to buy-list
    const labelName = room.materialName || FLOORING_MATERIAL_LABELS[room.materialType] || "Flooring"
    addBuyListItem({
      id: `fl-box-${room.materialType}-${sqFtPerBox}`,
      category: "flooring",
      label: `${labelName} (${sqFtPerBox} sq ft/box)`,
      estimatedQuantity: Number(grossNeeded.toFixed(1)),
      purchasingQuantity: boxes,
      unit: "boxes",
      unitCost: Number((sqFtPerBox * room.materialCostPerSqFt).toFixed(2)),
      totalCost: roomMaterialCost,
    })

    // 2. Flooring Install Labor
    const roomLaborCost = Number((room.netSqFt * room.installCostPerSqFt).toFixed(2))
    totalLaborCost += roomLaborCost

    // 3. Underlayment
    if (room.underlaymentType && room.underlaymentType !== "none") {
      const underlaymentCost = Number((room.netSqFt * (room.underlaymentCostPerSqFt || 0.45)).toFixed(2))
      totalMaterialCost += underlaymentCost

      // Rolls: typically 100 sq ft per roll
      const rollsNeeded = Math.ceil((room.netSqFt * 1.05) / 100)
      const rollLabel =
        room.underlaymentType === "moisture_barrier"
          ? "Sound & Moisture Underlayment (100 sf roll)"
          : room.underlaymentType === "cork"
          ? "Acoustical Cork Underlayment (100 sf roll)"
          : room.underlaymentType === "cement_backer"
          ? "Cement Backerboard 3'x5' (15 sf sheet)"
          : "2mm Foam Underlayment (100 sf roll)"

      const rollUnit = room.underlaymentType === "cement_backer" ? "sheets" : "rolls"
      const unitDivisor = room.underlaymentType === "cement_backer" ? 15 : 100
      const unitsNeeded = Math.ceil((room.netSqFt * 1.05) / unitDivisor)

      addBuyListItem({
        id: `fl-underlayment-${room.underlaymentType}`,
        category: "underlayment",
        label: rollLabel,
        estimatedQuantity: room.netSqFt,
        purchasingQuantity: unitsNeeded,
        unit: rollUnit,
        unitCost: Number(((underlaymentCost / Math.max(1, unitsNeeded))).toFixed(2)),
        totalCost: underlaymentCost,
      })
    }

    // 4. Mortar & Grout for Tile
    if (room.materialType.startsWith("tile_")) {
      const mortarBags = Math.ceil(room.netSqFt / 50)
      const groutBags = Math.ceil(room.netSqFt / 100)
      const mortarCost = mortarBags * 24
      const groutCost = groutBags * 28

      totalMaterialCost += mortarCost + groutCost

      addBuyListItem({
        id: "fl-thinset-mortar",
        category: "mortar_grout",
        label: "Polymer-Modified Thinset Mortar (50 lb bag)",
        estimatedQuantity: room.netSqFt,
        purchasingQuantity: mortarBags,
        unit: "bags",
        unitCost: 24,
        totalCost: mortarCost,
      })

      addBuyListItem({
        id: "fl-tile-grout",
        category: "mortar_grout",
        label: "All-in-One Sanded Tile Grout (25 lb bag)",
        estimatedQuantity: room.netSqFt,
        purchasingQuantity: groutBags,
        unit: "bags",
        unitCost: 28,
        totalCost: groutCost,
      })
    }

    // 5. Demolition / Tear-Out
    if (room.removeExistingType && room.removeExistingType !== "none") {
      const demoCost = Number((room.netSqFt * (room.removeCostPerSqFt || 0.5)).toFixed(2))
      totalDemoCost += demoCost
    }

    // 6. Subfloor Prep
    if (room.subfloorPrepType && room.subfloorPrepType !== "none") {
      const prepCost = Number((room.netSqFt * (room.subfloorCostPerSqFt || 0.4)).toFixed(2))
      totalPrepCost += prepCost

      if (room.subfloorPrepType === "self_leveler") {
        const levelerBags = Math.ceil(room.netSqFt / 40)
        addBuyListItem({
          id: "fl-self-leveler",
          category: "subfloor",
          label: "Self-Leveling Underlayment (50 lb bag)",
          estimatedQuantity: room.netSqFt,
          purchasingQuantity: levelerBags,
          unit: "bags",
          unitCost: 36,
          totalCost: levelerBags * 36,
        })
      } else if (room.subfloorPrepType === "patch") {
        const patchBags = Math.ceil(room.netSqFt / 150)
        addBuyListItem({
          id: "fl-floor-patch",
          category: "subfloor",
          label: "Fast-Setting Floor Patch (25 lb bag)",
          estimatedQuantity: room.netSqFt,
          purchasingQuantity: patchBags,
          unit: "bags",
          unitCost: 22,
          totalCost: patchBags * 22,
        })
      }
    }

    // 7. Baseboards and Quarter Round
    if (room.includeQuarterRound) {
      // Linear feet with 10% waste for cutoffs
      const qrLinearFt = Math.ceil(room.perimeterFt * 1.1)
      const qrSticks = Math.ceil(qrLinearFt / 8) // 8 ft sticks
      const qrCost = Number((qrLinearFt * (room.quarterRoundCostPerFt || 1.5)).toFixed(2))
      totalTrimCost += qrCost

      addBuyListItem({
        id: "fl-trim-quarter-round",
        category: "trim",
        label: "Shoe / Quarter Round Molding (8' stick)",
        estimatedQuantity: room.perimeterFt,
        purchasingQuantity: qrSticks,
        unit: "sticks (8')",
        unitCost: Number((qrCost / Math.max(1, qrSticks)).toFixed(2)),
        totalCost: qrCost,
      })
    }

    if (room.includeBaseboard) {
      const bbLinearFt = Math.ceil(room.perimeterFt * 1.1)
      const bbSticks = Math.ceil(bbLinearFt / 12) // 12 ft boards
      const bbCost = Number((bbLinearFt * (room.baseboardCostPerFt || 3.5)).toFixed(2))
      totalTrimCost += bbCost

      addBuyListItem({
        id: "fl-trim-baseboard",
        category: "trim",
        label: "Baseboard Trim (12' board)",
        estimatedQuantity: room.perimeterFt,
        purchasingQuantity: bbSticks,
        unit: "boards (12')",
        unitCost: Number((bbCost / Math.max(1, bbSticks)).toFixed(2)),
        totalCost: bbCost,
      })
    }

    // 8. Transitions
    for (const t of room.transitions || []) {
      const cost = Number((t.pieces * t.costPerPiece).toFixed(2))
      totalTransitionsCost += cost
      addBuyListItem({
        id: `fl-transition-${t.type}`,
        category: "transition",
        label: `${t.label || t.type} (78" transition strip)`,
        estimatedQuantity: t.pieces,
        purchasingQuantity: t.pieces,
        unit: "pieces",
        unitCost: t.costPerPiece,
        totalCost: cost,
      })
    }
  }

  const dumpsterFee = Number(scope.dumpsterFee || 0)
  const subtotal = Number(
    (
      totalMaterialCost +
      totalLaborCost +
      totalPrepCost +
      totalDemoCost +
      totalTrimCost +
      totalTransitionsCost +
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

  const taxPercent = scope.taxPercent ?? settings?.taxPercent ?? 0
  const taxBasis = scope.taxBasis ?? settings?.taxBasis ?? "total_job"
  let tax = 0
  if (taxPercent > 0) {
    const taxable =
      taxBasis === "materials_only"
        ? totalMaterialCost + totalTrimCost + totalTransitionsCost
        : costBasis + profit
    tax = Number(((taxable * taxPercent) / 100).toFixed(2))
  }

  const total = Number((costBasis + profit + tax).toFixed(2))

  return {
    jobType: "installation",
    netSqFt: Number(totalNetSqFt.toFixed(2)),
    grossSqFt: Number(totalGrossSqFtWithWaste.toFixed(2)),
    totalBoxes,
    materialCost: totalMaterialCost,
    laborCost: totalLaborCost,
    prepCost: totalPrepCost,
    demoCost: totalDemoCost,
    trimCost: totalTrimCost,
    transitionsCost: totalTransitionsCost,
    dumpsterFee,
    subtotal,
    overhead,
    profit,
    effectiveMarginPercent,
    effectiveMarkupPercent,
    tax,
    total,
    buyList: Array.from(buyListMap.values()),
  }
}
