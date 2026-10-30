import type { ScopeState } from "../data/seed.ts"
import type { Estimate, EstimateSettings, ProductionRate } from "../types.ts"
import type { UserRole } from "./role.ts"

const MANAGER_PREFIXES = ["/dispatch", "/work-orders", "/payments"]

const ESTIMATOR_PREFIXES = [
  "/dashboard",
  "/sales-pipeline",
  "/estimate",
  "/estimates",
  "/clients",
  "/appointments",
  "/calendar",
  "/proposal",
  "/follow-ups",
  "/inbox",
]

export function managerCanOpen(pathname: string): boolean {
  return matchesPrefix(pathname, MANAGER_PREFIXES)
}

export function estimatorCanOpen(pathname: string): boolean {
  if (pathname.endsWith("/pay")) return false
  return matchesPrefix(pathname, ESTIMATOR_PREFIXES)
}

export function roleCanOpen(role: UserRole, pathname: string): boolean {
  if (role === "owner") return true
  if (role === "project_manager") return managerCanOpen(pathname)
  return estimatorCanOpen(pathname)
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function scopeKey(estimate: Estimate): string {
  return JSON.stringify({
    title: estimate.title,
    areas: estimate.areas,
    lineItems: estimate.lineItems,
    notes: estimate.notes,
    clientStatus: estimate.clientStatus,
    stageId: estimate.stageId,
  })
}

function lockedSettings(incoming: EstimateSettings, company: EstimateSettings, prior?: EstimateSettings): EstimateSettings {
  const source = prior ?? company
  return {
    ...incoming,
    hourlyRate: source.hourlyRate,
    hourlyRateBuild: source.hourlyRateBuild,
    generalHourlyRate: source.generalHourlyRate,
    typeHourlyRates: source.typeHourlyRates,
    materialMarkup: source.materialMarkup,
    minimumJobCharge: source.minimumJobCharge,
  }
}

function lockedRates(incoming: ProductionRate[], locked: ProductionRate[]): ProductionRate[] {
  return incoming.map((rate) => {
    if (rate.oneOff) return rate
    const previous = locked.find((item) => item.id === rate.id)
    if (!previous) return { ...rate, productCostPerGallon: 0, customHourlyRate: null }
    return {
      ...rate,
      coatRates: previous.coatRates.map((entry) => ({ ...entry })),
      primerRate: previous.primerRate,
      productCostPerGallon: previous.productCostPerGallon,
      customHourlyRate: previous.customHourlyRate,
    }
  })
}

/** An estimator can change the bid. The company rate card, costs, and crew assignments stay with the owner. */
export function bookForEstimator(previous: ScopeState, next: ScopeState, userId: string): ScopeState {
  return {
    ...next,
    productionRates: previous.productionRates,
    estimateSettings: previous.estimateSettings,
    learnedPaces: previous.learnedPaces,
    paymentMethods: previous.paymentMethods,
    workOrders: previous.workOrders,
    estimates: next.estimates.map((estimate) => {
      const prior = previous.estimates.find((item) => item.id === estimate.id)
      const claim = !prior || scopeKey(prior) !== scopeKey(estimate)
      return {
        ...estimate,
        estimatorId: prior?.estimatorId ?? (claim ? userId : undefined),
        rates: lockedRates(estimate.rates, prior?.rates ?? previous.productionRates),
        settings: lockedSettings(estimate.settings, previous.estimateSettings, prior?.settings),
        paymentStatus: prior?.paymentStatus ?? "unpaid",
        depositReceipt: prior?.depositReceipt ?? null,
        credits: prior?.credits,
        quickbooksInvoiceId: prior?.quickbooksInvoiceId,
        quickbooksSyncedAt: prior?.quickbooksSyncedAt,
      }
    }),
  }
}

export function estimatorPerformance(estimates: Estimate[], userId: string): {
  bidsSent: number
  wins: number
  winRate: number | null
  followUps: number
} {
  const mine = estimates.filter((estimate) => estimate.estimatorId === userId)
  const sent = mine.filter((estimate) => estimate.clientStatus !== "draft")
  const wins = mine.filter((estimate) => estimate.clientStatus === "accepted" || Boolean(estimate.acceptedAt))
  return {
    bidsSent: sent.length,
    wins: wins.length,
    winRate: sent.length > 0 ? Math.round((wins.length / sent.length) * 100) : null,
    followUps: mine.filter((estimate) => estimate.followUp?.status === "active").length,
  }
}
