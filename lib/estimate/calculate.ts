import { linePhoto } from "./line-photo.ts"
import type {
  AreaInput,
  AreaScope,
  CoatRate,
  EstimateCalculationResult,
  EstimateLineItem,
  EstimateSettings,
  LineItemInput,
  LineMaterial,
  PaymentMethod,
  PrepLevel,
  ProductionRate,
  RateCard,
  SurfaceInput,
  TaxBasis,
} from "../types.ts"
import {
  DEFAULT_MATERIAL_MARKUP,
  DEFAULT_RATE_CARD,
  MINIMUM_JOB_CHARGE,
  PREP_HOURS_PER_SQFT,
  SECOND_COAT_LABOR_FACTOR,
} from "../defaults.ts"

export interface AreaMeasures {
  wallSqFt: number
  ceilingSqFt: number
  perimeterLnFt: number
}

export interface PricedSurface {
  id: string
  areaId: string
  areaName: string
  internalLabel: string
  clientLabel: string
  quantity: number
  quantityUnit: string
  coatCount: number
  primerCoats: number
  rawHours: number
  allocatedHours: number
  rateLabel: string
  laborPrice: number
  paintGallons: number
  materialCost: number
  price: number
  productName: string
  clientDescription: string
  crewNote: string
  hideFromCustomer: boolean
  showCoats: boolean
  showPrice: boolean
  missingRate: boolean
}

export interface PricedMaterial {
  id: string
  name: string
  quantity: number
  unitPrice: number
  cost: number
}

export interface PricedLine {
  id: string
  label: string
  clientNote: string
  crewNote: string
  mode: LineItemInput["mode"]
  allocatedHours: number
  materialCost: number
  materials: PricedMaterial[]
  hiddenOnWorkOrder: boolean
  price: number
  detail: string
  /** Picture shown beside this line on the proposal. */
  photo?: string
}

export interface PricedArea {
  id: string
  name: string
  areaType: AreaInput["areaType"]
  lengthFt: number
  widthFt: number
  heightFt: number
  wallSqFt: number
  ceilingSqFt: number
  perimeterLnFt: number
  prepLevel: PrepLevel
  accessFactor: number
  crewNote: string
  surfaces: PricedSurface[]
  allocatedHours: number
  price: number
  clientPrice: number
}

export interface EstimateQuote {
  areas: PricedArea[]
  lineItems: PricedLine[]
  wallSqFt: number
  paintGallons: number
  allocatedHours: number
  laborPrice: number
  materialCost: number
  lineItemPrice: number
  subtotal: number
  discount: number
  tax: number
  pricedTotal: number
  total: number
  salesRate: number
  laborCostPerSqFt: number
  surcharge: number
  amountDue: number
  paymentMethodLabel: string
}

export interface ScopeInput {
  areas: AreaInput[]
  lineItems: LineItemInput[]
  rates: ProductionRate[]
  settings: EstimateSettings
  paymentMethods: PaymentMethod[]
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

function cents(value: number): number {
  return Math.round(nonNegative(value) * 100) / 100
}

/** Hours round up to the estimate increment. 5.08 hours at 0.5 becomes 5.5. */
export function roundHours(hours: number, increment: number): number {
  const safe = nonNegative(hours)
  if (increment <= 0) return Math.round(safe * 1000) / 1000
  const steps = Math.ceil(safe / increment - 1e-9)
  return Math.round(steps * increment * 1000) / 1000
}

export function roundMoney(value: number, mode: EstimateSettings["priceRounding"]): number {
  const safe = nonNegative(value)
  if (mode === "nearest") return Math.round(safe)
  if (mode === "up") return Math.ceil(safe - 1e-9)
  return cents(safe)
}

export function roundGallons(value: number, mode: EstimateSettings["materialRounding"]): number {
  const safe = nonNegative(value)
  if (mode === "nearest") return Math.round(safe)
  if (mode === "up") return Math.ceil(safe - 1e-9)
  return Math.round(safe * 100) / 100
}

export function roomSurfaces(lengthFt: number, widthFt: number, heightFt: number) {
  const length = nonNegative(lengthFt)
  const width = nonNegative(widthFt)
  const height = nonNegative(heightFt)
  return {
    wallSqFt: 2 * (length + width) * height,
    ceilingSqFt: length * width,
    trimLnFt: 2 * (length + width),
  }
}

export function measureArea(area: AreaInput): AreaMeasures {
  const room = roomSurfaces(area.lengthFt, area.widthFt, area.heightFt)
  if (area.areaType === "surface") {
    return {
      wallSqFt: nonNegative(area.lengthFt) * nonNegative(area.heightFt),
      ceilingSqFt: 0,
      perimeterLnFt: nonNegative(area.lengthFt),
    }
  }
  return {
    wallSqFt: room.wallSqFt,
    ceilingSqFt: room.ceilingSqFt,
    perimeterLnFt: room.trimLnFt,
  }
}

export function allocatedHoursFor(quantity: number, productionRate: number): number {
  const safeRate = nonNegative(productionRate)
  if (safeRate === 0) return 0
  return nonNegative(quantity) / safeRate
}

/** Area and trim rates are quantity ÷ hours. Item rates are hours ÷ quantity. */
export function timeBasedRate(quantity: number, hours: number, basis: "area" | "item"): number {
  const amount = nonNegative(quantity)
  const spent = nonNegative(hours)
  if (basis === "item") return amount === 0 ? 0 : spent / amount
  if (spent === 0) return 0
  return amount / spent
}

export function paintGallonsFor(totalSqFt: number, sqFtPerGallon: number, coatCount: number): number {
  const coverage = nonNegative(sqFtPerGallon)
  if (coverage === 0) return 0
  return (nonNegative(totalSqFt) / coverage) * nonNegative(coatCount)
}

export function laborCostFor(allocatedHours: number, laborRatePerHour: number): number {
  return nonNegative(allocatedHours) * nonNegative(laborRatePerHour)
}

export function materialCostFor(
  paintGallons: number,
  costPerGallon: number,
  materialMarkup: number,
): number {
  return nonNegative(paintGallons) * nonNegative(costPerGallon) * (1 + nonNegative(materialMarkup))
}

/** Each coat after the first adds `factor` times the first coat's hours. */
export function scaledCoatHours(firstCoatHours: number, coatCount: number, factor = SECOND_COAT_LABOR_FACTOR): number {
  const coats = Math.min(Math.round(nonNegative(coatCount)), 6)
  const first = nonNegative(firstCoatHours)
  if (coats === 0 || first === 0) return 0
  return first * (1 + nonNegative(factor) * (coats - 1))
}

export function prepHoursFor(wallSqFt: number, prepLevel: PrepLevel, prepHours: number | null | undefined): number {
  if (prepHours !== null && prepHours !== undefined && Number.isFinite(prepHours)) return nonNegative(prepHours)
  return nonNegative(wallSqFt) * (PREP_HOURS_PER_SQFT[prepLevel] ?? 0)
}

export function applyAccessFactor(hours: number, accessFactor: number | null | undefined): number {
  const factor = Number.isFinite(accessFactor) && (accessFactor ?? 0) > 0 ? (accessFactor as number) : 1
  return nonNegative(hours) * factor
}

export function taxFor(taxableJob: number, materialCost: number, taxPercent: number, taxBasis: TaxBasis): number {
  const base = taxBasis === "materials_only" ? nonNegative(materialCost) : nonNegative(taxableJob)
  return base * (nonNegative(taxPercent) / 100)
}

export function applyMinimumCharge(total: number, minimumJobCharge: number): number {
  return Math.max(nonNegative(total), nonNegative(minimumJobCharge))
}

/** Room or item math before a typed square-foot or linear-foot override. */
export function measuredQuantity(rate: ProductionRate, area: AreaInput, itemCount: number): number {
  const measures = measureArea(area)
  if (rate.measure === "walls" || rate.measure === "siding" || rate.measure === "soffit" || rate.measure === "wainscot" || rate.measure === "accent") {
    return measures.wallSqFt
  }
  if (rate.measure === "ceiling") return measures.ceilingSqFt
  if (rate.measure === "deck") return nonNegative(area.lengthFt) * nonNegative(area.widthFt)
  if (rate.measure === "trim" || rate.measure === "fascia" || rate.measure === "crown") return measures.perimeterLnFt
  return nonNegative(itemCount)
}

function quantityFor(rate: ProductionRate, area: AreaInput, surface: SurfaceInput): number {
  if (surface.quantityOverride !== null && Number.isFinite(surface.quantityOverride)) {
    return nonNegative(surface.quantityOverride)
  }
  return measuredQuantity(rate, area, surface.itemCount)
}

export function quantityUnit(rate: ProductionRate): string {
  if (rate.measure === "trim" || rate.measure === "fascia" || rate.measure === "crown") return "ln ft"
  if (rate.measure === "items" || rate.measure === "shutters") return "items"
  return "sq ft"
}

/** A typed hour amount is the time used. Access and hour rounding stay on calculated hours. */
function typedHours(surface: SurfaceInput): number | null {
  if (surface.hoursOverride === null || surface.hoursOverride === undefined) return null
  if (!Number.isFinite(surface.hoursOverride)) return null
  return nonNegative(surface.hoursOverride)
}

function coatBoxes(rate: ProductionRate): CoatRate[] {
  return rate.coatRates.filter(
    (entry) => Number.isFinite(entry.value) && entry.value >= 0 && Number.isFinite(entry.coats),
  )
}

/** Exact coat box, otherwise the nearest defined box. A tie uses the lower coat count. */
function nearestCoatBox(boxes: CoatRate[], coats: number): CoatRate | null {
  if (boxes.length === 0) return null
  const exact = boxes.find((entry) => entry.coats === coats)
  if (exact) return exact
  return boxes.reduce((best, entry) => {
    const distance = Math.abs(entry.coats - coats)
    const bestDistance = Math.abs(best.coats - coats)
    if (distance < bestDistance || (distance === bestDistance && entry.coats < best.coats)) return entry
    return best
  })
}

/**
 * A coat count above the highest box keeps that finished speed, then adds one
 * coat for each coat past it. The one-coat box is that extra coat when it exists.
 */
function finishProduction(
  rate: ProductionRate,
  quantity: number,
  coats: number,
  pricedByArea: boolean,
): { hours: number; price: number; labelSpeed: number | null; extraCoats: number } {
  const boxes = coatBoxes(rate)
  const empty = { hours: 0, price: 0, labelSpeed: null, extraCoats: 0 }
  if (boxes.length === 0 || coats <= 0) return empty
  const highest = boxes.reduce((best, entry) => (entry.coats > best.coats ? entry : best))
  const exact = boxes.find((entry) => entry.coats === coats)
  const extraCoats = !exact && coats > highest.coats ? coats - highest.coats : 0
  const base = exact ?? (extraCoats > 0 ? highest : nearestCoatBox(boxes, coats))
  if (!base) return empty
  const oneCoat = boxes.find((entry) => entry.coats === 1)
  const baseAmount = amountFor(rate, quantity, base.value, pricedByArea)
  const oneCoatAmount = oneCoat
    ? amountFor(rate, quantity, oneCoat.value, pricedByArea)
    : highest.coats > 0
      ? amountFor(rate, quantity, highest.value, pricedByArea) / highest.coats
      : 0
  const total = baseAmount + (extraCoats > 0 ? oneCoatAmount * extraCoats : 0)
  return pricedByArea
    ? { hours: 0, price: total, labelSpeed: base.value, extraCoats }
    : { hours: total, price: 0, labelSpeed: base.value, extraCoats }
}

function amountFor(rate: ProductionRate, quantity: number, speed: number, pricedByArea: boolean): number {
  if (pricedByArea) return quantity * speed
  return firstCoatHours(quantity, speed, rate.basis)
}

function accessFactorOf(area: AreaInput): number {
  return Number.isFinite(area.accessFactor) && (area.accessFactor ?? 0) > 0 ? (area.accessFactor as number) : 1
}

function firstCoatHours(quantity: number, speed: number, basis: ProductionRate["basis"]): number {
  if (speed <= 0) return 0
  if (basis === "hours_per_item") return quantity * speed
  if (basis === "sqft_per_hour" || basis === "lnft_per_hour") return quantity / speed
  return 0
}

function finishRateLabel(
  rate: ProductionRate,
  pricedByArea: boolean,
  finishSpeed: number | null,
  primerCoats: number,
): string {
  if (finishSpeed === null || finishSpeed <= 0) return primerCoats > 0 ? "Primer" : "No rate"
  const speed = String(Math.round(finishSpeed * 1000) / 1000)
  if (pricedByArea) {
    const unit = rate.basis === "dollars_per_lnft" ? "ln ft" : rate.basis === "dollars_per_item" ? "item" : "sq ft"
    return `$${speed} / ${unit}`
  }
  if (rate.basis === "hours_per_item") return `${speed} hrs/item`
  if (rate.basis === "lnft_per_hour") return `${speed} lnft/hr`
  return `${speed} sqft/hr`
}

function priceSurface(
  area: AreaInput,
  surface: SurfaceInput,
  rate: ProductionRate,
  settings: EstimateSettings,
): PricedSurface {
  const quantity = quantityFor(rate, area, surface)
  const finishCoats = Math.min(Math.round(nonNegative(surface.finishCoats ?? surface.coatCount)), 6)
  const primerCoats = Math.min(Math.round(nonNegative(surface.primerCoats ?? 0)), 6)
  const hourlyRate = rate.customHourlyRate ?? settings.hourlyRate
  const pricedByArea = rate.basis === "dollars_per_sqft" || rate.basis === "dollars_per_lnft" || rate.basis === "dollars_per_item"
  const finish = finishCoats > 0 ? finishProduction(rate, quantity, finishCoats, pricedByArea) : null
  const finishSpeed = finish?.labelSpeed ?? null
  const typed = typedHours(surface)
  let rawHours = 0
  let laborPrice = 0
  if (pricedByArea) {
    laborPrice = finish?.price ?? 0
    if (typed !== null) rawHours = typed
  } else if (typed !== null) {
    rawHours = typed
  } else {
    const primerSpeed = Number.isFinite(rate.primerRate) ? nonNegative(rate.primerRate) : 0
    const finishHours = finish?.hours ?? 0
    // Primer has one speed. Each primer coat takes that full time.
    const primerHours =
      primerCoats > 0 && primerSpeed > 0 ? firstCoatHours(quantity, primerSpeed, rate.basis) * primerCoats : 0
    rawHours = applyAccessFactor(finishHours + primerHours, accessFactorOf(area))
  }
  const allocatedHours = typed !== null ? typed : roundHours(rawHours, settings.hourRounding)
  if (!pricedByArea) laborPrice = allocatedHours * nonNegative(hourlyRate)
  const coverage = nonNegative(rate.coveragePerCoat)
  const itemGallons = rate.measure === "items" || rate.measure === "shutters"
  let paintGallons = 0
  if (coverage > 0) {
    paintGallons = itemGallons ? quantity * coverage * finishCoats : (quantity * finishCoats) / coverage
  }
  const primerCoverage = Number.isFinite(rate.primerCoveragePerCoat) ? nonNegative(rate.primerCoveragePerCoat) : 0
  if (primerCoverage > 0 && primerCoats > 0) {
    paintGallons += itemGallons ? quantity * primerCoverage * primerCoats : (quantity * primerCoats) / primerCoverage
  }
  paintGallons = roundGallons(paintGallons, settings.materialRounding)
  const materialMarkup = Number.isFinite(settings.materialMarkup)
    ? nonNegative(settings.materialMarkup)
    : DEFAULT_MATERIAL_MARKUP
  const materialCost = materialCostFor(
    paintGallons,
    rate.productCostPerGallon,
    materialMarkup,
  )
  const price = roundMoney(laborPrice + materialCost, settings.priceRounding)
  return {
    id: surface.id,
    areaId: area.id,
    areaName: area.name,
    internalLabel: rate.internalLabel,
    clientLabel: rate.clientLabel || rate.internalLabel,
    quantity,
    quantityUnit: quantityUnit(rate),
    coatCount: finishCoats,
    primerCoats,
    rawHours,
    allocatedHours,
    rateLabel:
      finish && finish.extraCoats > 0
        ? `${finishRateLabel(rate, pricedByArea, finishSpeed, primerCoats)} + ${finish.extraCoats} coat${finish.extraCoats === 1 ? "" : "s"}`
        : finishRateLabel(rate, pricedByArea, finishSpeed, primerCoats),
    laborPrice: cents(laborPrice),
    paintGallons,
    materialCost: cents(materialCost),
    price,
    productName: rate.productName,
    clientDescription: rate.clientDescription,
    crewNote: surface.crewNote || rate.crewNote,
    hideFromCustomer: surface.hideFromCustomer ?? rate.hideFromCustomer,
    showCoats: rate.showCoats,
    showPrice: rate.showPrice,
    missingRate: !pricedByArea && finishCoats > 0 && (finishSpeed === null || finishSpeed <= 0),
  }
}

function pricePrep(area: AreaInput, settings: EstimateSettings): PricedSurface | null {
  const measures = measureArea(area)
  const rawHours = applyAccessFactor(
    prepHoursFor(measures.wallSqFt, area.prepLevel ?? "none", area.prepHours),
    accessFactorOf(area),
  )
  if (rawHours <= 0) return null
  const allocatedHours = roundHours(rawHours, settings.hourRounding)
  const laborPrice = allocatedHours * nonNegative(settings.hourlyRate)
  return {
    id: `${area.id}-prep`,
    areaId: area.id,
    areaName: area.name,
    internalLabel: "Prep",
    clientLabel: "Surface prep",
    quantity: measures.wallSqFt,
    quantityUnit: "sq ft",
    coatCount: 0,
    primerCoats: 0,
    rawHours,
    allocatedHours,
    rateLabel: "Prep",
    laborPrice: cents(laborPrice),
    paintGallons: 0,
    materialCost: 0,
    price: roundMoney(laborPrice, settings.priceRounding),
    productName: "Prep",
    clientDescription: "Patching, sanding, caulking, and masking.",
    crewNote: area.crewNote,
    hideFromCustomer: false,
    showCoats: false,
    showPrice: false,
    missingRate: false,
  }
}

function priceMaterials(rows: LineMaterial[] | undefined): PricedMaterial[] {
  return (rows ?? []).map((row) => {
    const quantity = nonNegative(row.quantity)
    const unitPrice = nonNegative(row.unitPrice)
    return {
      id: row.id,
      name: row.name.trim() || "Material",
      quantity,
      unitPrice,
      cost: cents(quantity * unitPrice),
    }
  })
}

function priceLine(item: LineItemInput, settings: EstimateSettings): PricedLine {
  const hourlyRate = nonNegative(settings.hourlyRate)
  let allocatedHours = 0
  let rawPrice = 0
  let detail = ""
  if (item.mode === "hourly") {
    allocatedHours = roundHours(item.hours, settings.hourRounding)
    rawPrice = allocatedHours * hourlyRate
    detail = `${allocatedHours} hr`
  } else if (item.mode === "quantity") {
    allocatedHours = nonNegative(item.workOrderHours)
    rawPrice = nonNegative(item.units) * nonNegative(item.pricePerUnit)
    detail = `${item.units} × $${item.pricePerUnit}`
  } else {
    allocatedHours = nonNegative(item.workOrderHours)
    rawPrice = nonNegative(item.customPrice)
    detail = "Custom amount"
  }
  const materials = priceMaterials(item.materials)
  // The price field and each material row are both charged. Row cost is quantity × unit price.
  const materialCost = cents(materials.reduce((sum, row) => sum + row.cost, 0))
  const photo = linePhoto(item.photo)
  return {
    id: item.id,
    label: item.label.trim() || "Line item",
    clientNote: item.clientNote ?? "",
    crewNote: item.crewNote ?? "",
    mode: item.mode,
    allocatedHours,
    materialCost,
    materials,
    hiddenOnWorkOrder: Boolean(item.hiddenOnWorkOrder),
    price: roundMoney(rawPrice + materialCost, settings.priceRounding),
    detail,
    ...(photo ? { photo } : {}),
  }
}

export function calculateEstimate(input: ScopeInput): EstimateQuote {
  const settings = input.settings
  const rates = new Map(input.rates.map((rate) => [rate.id, rate]))
  const areas = input.areas.map((area) => {
    const measures = measureArea(area)
    const surfaces = area.surfaces.flatMap((surface) => {
      const rate = rates.get(surface.rateId)
      if (!rate) return []
      return [priceSurface(area, surface, rate, settings)]
    })
    const prep = pricePrep(area, settings)
    if (prep) surfaces.push(prep)
    return {
      id: area.id,
      name: area.name,
      areaType: area.areaType,
      lengthFt: area.lengthFt,
      widthFt: area.widthFt,
      heightFt: area.heightFt,
      ...measures,
      prepLevel: area.prepLevel ?? "none",
      accessFactor: accessFactorOf(area),
      crewNote: area.crewNote,
      surfaces,
      allocatedHours: surfaces.reduce((sum, surface) => sum + surface.allocatedHours, 0),
      price: cents(surfaces.reduce((sum, surface) => sum + surface.price, 0)),
      clientPrice: cents(surfaces.reduce((sum, surface) => sum + surface.price, 0)),
    }
  })
  const lineItems = input.lineItems
    .filter((item) => item.pending !== true && (item.optional !== true || item.selected !== false))
    .map((item) => priceLine(item, settings))
  const surfaces = areas.flatMap((area) => area.surfaces)
  const wallSqFt = areas.reduce((sum, area) => sum + area.wallSqFt, 0)
  const paintGallons = roundGallons(
    surfaces.reduce((sum, surface) => sum + surface.paintGallons, 0),
    "none",
  )
  const allocatedHours =
    surfaces.reduce((sum, surface) => sum + surface.allocatedHours, 0) +
    lineItems.reduce((sum, item) => sum + item.allocatedHours, 0)
  const laborPrice = cents(surfaces.reduce((sum, surface) => sum + surface.laborPrice, 0))
  const materialCost = cents(surfaces.reduce((sum, surface) => sum + surface.materialCost, 0))
  const materialTaxBase = cents(
    materialCost + lineItems.reduce((sum, item) => sum + item.materialCost, 0),
  )
  const lineItemPrice = cents(lineItems.reduce((sum, item) => sum + item.price, 0))
  const subtotal = cents(
    surfaces.reduce((sum, surface) => sum + surface.price, 0) + lineItemPrice,
  )
  const discount =
    settings.discountKind === "percent"
      ? cents(subtotal * (nonNegative(settings.discountValue) / 100))
      : cents(Math.min(subtotal, nonNegative(settings.discountValue)))
  const taxable = cents(subtotal - discount)
  const taxBasis = settings.taxBasis === "materials_only" ? "materials_only" : "total_job"
  const tax = cents(taxFor(taxable, materialTaxBase, settings.taxPercent, taxBasis))
  const pricedTotal = roundMoney(taxable + tax, settings.priceRounding)
  const minimumJobCharge = Number.isFinite(settings.minimumJobCharge)
    ? nonNegative(settings.minimumJobCharge)
    : MINIMUM_JOB_CHARGE
  const total = roundMoney(applyMinimumCharge(pricedTotal, minimumJobCharge), settings.priceRounding)
  const method = input.paymentMethods.find((item) => item.id === settings.paymentMethodId)
  const surchargeRate = nonNegative(settings.surchargePercent) / 100
  const surcharge = method && surchargeRate > 0 ? cents(total * surchargeRate) : 0
  // Hourly labor spread across wall area, including ceiling and trim hours.
  const laborCostPerSqFt = wallSqFt > 0 ? Math.round((laborPrice / wallSqFt) * 10000) / 10000 : 0

  return {
    areas,
    lineItems,
    wallSqFt,
    paintGallons,
    allocatedHours,
    laborPrice,
    materialCost,
    lineItemPrice,
    subtotal,
    discount,
    tax,
    pricedTotal,
    total,
    salesRate: allocatedHours > 0 ? Math.round((total / allocatedHours) * 100) / 100 : 0,
    laborCostPerSqFt,
    surcharge,
    amountDue: cents(total + surcharge),
    paymentMethodLabel: method?.label ?? "Payment",
  }
}

function productionLine(
  id: string,
  lineItemType: EstimateLineItem["lineItemType"],
  label: string,
  quantity: number,
  coatCount: number,
  productionRate: number,
  allocatedHours: number,
  paintGallons: number,
  card: RateCard,
): EstimateLineItem {
  return {
    id,
    lineItemType,
    label,
    quantity,
    coatCount,
    productionRate,
    allocatedHours,
    paintGallons,
    laborCost: cents(laborCostFor(allocatedHours, card.laborRatePerHour)),
    materialCost: cents(materialCostFor(paintGallons, card.costPerGallon, card.materialMarkup)),
  }
}

export function calculateProduction(
  areas: AreaScope[],
  card: RateCard = DEFAULT_RATE_CARD,
): EstimateCalculationResult {
  const lineItems: EstimateLineItem[] = []
  let wallSqFt = 0
  let ceilingSqFt = 0
  let trimLnFt = 0
  for (const area of areas) {
    const room = roomSurfaces(area.lengthFt, area.widthFt, area.heightFt)
    const finishCoats = nonNegative(area.coatCount)
    const primerCoats = nonNegative(area.primerCoats)
    const factor = card.secondCoatLaborFactor
    wallSqFt += room.wallSqFt
    ceilingSqFt += room.ceilingSqFt
    trimLnFt += room.trimLnFt
    const finishAndPrimer = (quantity: number, speed: number, primerSpeed: number, perItem: boolean) => {
      const first = perItem ? quantity * speed : allocatedHoursFor(quantity, speed)
      const primerFirst = perItem ? quantity * primerSpeed : allocatedHoursFor(quantity, primerSpeed)
      return applyAccessFactor(
        scaledCoatHours(first, finishCoats, factor) + scaledCoatHours(primerFirst, primerCoats, factor),
        area.accessFactor,
      )
    }
    const gallonsFor = (quantity: number) =>
      paintGallonsFor(quantity, card.sqFtPerGallon, finishCoats) +
      paintGallonsFor(quantity, card.primerSqFtPerGallon, primerCoats)
    const rows: EstimateLineItem[] = [
      productionLine(
        `${area.id}-wall`,
        "wall",
        "Walls",
        room.wallSqFt,
        finishCoats,
        card.wallSqFtPerHour,
        finishAndPrimer(room.wallSqFt, card.wallSqFtPerHour, card.primerSqFtPerHour, false),
        gallonsFor(room.wallSqFt),
        card,
      ),
      productionLine(
        `${area.id}-ceiling`,
        "ceiling",
        "Ceiling",
        room.ceilingSqFt,
        finishCoats,
        card.ceilingSqFtPerHour,
        finishAndPrimer(room.ceilingSqFt, card.ceilingSqFtPerHour, card.primerSqFtPerHour, false),
        gallonsFor(room.ceilingSqFt),
        card,
      ),
      productionLine(
        `${area.id}-trim`,
        "trim",
        "Baseboard and casing",
        room.trimLnFt,
        finishCoats,
        card.trimLnFtPerHour,
        finishAndPrimer(room.trimLnFt, card.trimLnFtPerHour, 0, false),
        0,
        card,
      ),
      productionLine(
        `${area.id}-door`,
        "door",
        "Doors",
        nonNegative(area.doorCount),
        finishCoats,
        card.doorHours,
        finishAndPrimer(nonNegative(area.doorCount), card.doorHours, 0, true),
        0,
        card,
      ),
      productionLine(
        `${area.id}-cabinet`,
        "cabinet_door",
        "Cabinet doors",
        nonNegative(area.cabinetDoorCount),
        finishCoats,
        card.cabinetDoorHours,
        finishAndPrimer(nonNegative(area.cabinetDoorCount), card.cabinetDoorHours, 0, true),
        0,
        card,
      ),
      productionLine(
        `${area.id}-prep`,
        "prep",
        "Prep",
        room.wallSqFt,
        0,
        0,
        applyAccessFactor(prepHoursFor(room.wallSqFt, area.prepLevel ?? "none", area.prepHours), area.accessFactor),
        0,
        card,
      ),
    ]
    lineItems.push(...rows.filter((row) => row.quantity > 0 && (row.allocatedHours > 0 || row.paintGallons > 0)))
  }
  const paintGallons = lineItems.reduce((sum, line) => sum + line.paintGallons, 0)
  const allocatedHours = lineItems.reduce((sum, line) => sum + line.allocatedHours, 0)
  const laborCost = cents(laborCostFor(allocatedHours, card.laborRatePerHour))
  const materialCost = cents(materialCostFor(paintGallons, card.costPerGallon, card.materialMarkup))
  const totalPrice = cents(laborCost + materialCost)
  // Markup on paint is the profit. Labor is billed at the labor rate.
  const grossProfit = cents(
    paintGallons * nonNegative(card.costPerGallon) * nonNegative(card.materialMarkup),
  )
  return {
    wallSqFt,
    ceilingSqFt,
    trimLnFt,
    paintGallons,
    allocatedHours,
    laborCost,
    materialCost,
    totalPrice,
    grossProfit,
    grossProfitMargin: totalPrice > 0 ? Math.round((grossProfit / totalPrice) * 10000) / 10000 : 0,
    laborCostPerSqFt: wallSqFt > 0 ? Math.round((laborCost / wallSqFt) * 10000) / 10000 : 0,
    lineItems,
  }
}
