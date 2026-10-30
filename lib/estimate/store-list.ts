import { PAYMENT_METHODS } from "../defaults.ts"
import { roundGallons, calculateEstimate, type PricedArea } from "./calculate.ts"
import { ensureSubstrateRates } from "./substrate.ts"
import type { Estimate } from "../types.ts"

export interface StoreRoom {
  id: string
  areaName: string
  surfaceLabel: string
  paintGallons: number
  includesPrimer: boolean
}

/** Paint to buy. Dollar fields never enter this object. */
export interface StoreProduct {
  productName: string
  paintGallons: number
  buyGallons: number
  rooms: StoreRoom[]
}

export interface StoreList {
  estimateId: string
  title: string
  clientName: string
  address: string
  products: StoreProduct[]
  paintGallons: number
  buyGallons: number
}

function buyGallons(paintGallons: number): number {
  return Math.ceil(paintGallons - 1e-9)
}

function productsFromAreas(areas: PricedArea[]): StoreProduct[] {
  const grouped = new Map<string, StoreProduct>()
  for (const area of areas) {
    for (const surface of area.surfaces) {
      if (surface.paintGallons <= 0) continue
      const productName = surface.productName.trim()
      if (!productName || productName === "Prep") continue
      const key = productName.toLowerCase()
      const current = grouped.get(key) ?? {
        productName,
        paintGallons: 0,
        buyGallons: 0,
        rooms: [],
      }
      current.rooms.push({
        id: surface.id,
        areaName: area.name,
        surfaceLabel: surface.internalLabel,
        paintGallons: surface.paintGallons,
        includesPrimer: surface.primerCoats > 0,
      })
      current.paintGallons = roundGallons(current.paintGallons + surface.paintGallons, "none")
      current.buyGallons = buyGallons(current.paintGallons)
      grouped.set(key, current)
    }
  }
  return [...grouped.values()].sort((left, right) => right.paintGallons - left.paintGallons || left.productName.localeCompare(right.productName))
}

export function storeList(estimate: Estimate, clientName: string): StoreList {
  const quote = calculateEstimate({
    areas: estimate.areas,
    lineItems: estimate.lineItems,
    rates: ensureSubstrateRates(estimate.rates),
    settings: estimate.settings,
    paymentMethods: PAYMENT_METHODS,
  })
  const products = productsFromAreas(quote.areas)
  const paintGallons = roundGallons(
    products.reduce((sum, product) => sum + product.paintGallons, 0),
    "none",
  )
  return {
    estimateId: estimate.id,
    title: estimate.title,
    clientName: clientName.trim() || "Client",
    address: estimate.jobAddress.trim(),
    products,
    paintGallons,
    buyGallons: products.reduce((sum, product) => sum + product.buyGallons, 0),
  }
}
