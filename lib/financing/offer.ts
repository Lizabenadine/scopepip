import type { EstimateSettings } from "../types.ts"

export interface FinancingTerms {
  enabled: boolean
  aprPercent: number
  months: number
  lender: string
  applyUrl: string
}

export function financingTerms(settings: Pick<
  EstimateSettings,
  "financingEnabled" | "financingApr" | "financingMonths" | "financingLender" | "financingApplyUrl"
>): FinancingTerms {
  const apr = Number(settings.financingApr)
  const months = Number(settings.financingMonths)
  return {
    enabled: settings.financingEnabled !== false,
    aprPercent: Number.isFinite(apr) ? clamp(apr, 0, 99.99) : 9.99,
    months: Number.isFinite(months) ? Math.round(clamp(months, 1, 120)) : 12,
    lender: settings.financingLender?.trim() ?? "",
    applyUrl: httpsUrl(settings.financingApplyUrl),
  }
}

/** Standard monthly payment for the proposal total. Zero APR splits the total evenly. */
export function monthlyPayment(principal: number, aprPercent: number, months: number): number {
  if (!Number.isFinite(principal) || principal <= 0 || months <= 0) return 0
  const monthlyRate = aprPercent / 100 / 12
  if (monthlyRate === 0) return roundCents(principal / months)
  const factor = (1 + monthlyRate) ** months
  return roundCents((principal * monthlyRate * factor) / (factor - 1))
}

function httpsUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""
  try {
    const url = new URL(trimmed)
    return url.protocol === "https:" ? url.toString() : ""
  } catch {
    return ""
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}
