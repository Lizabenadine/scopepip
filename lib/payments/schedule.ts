import { depositAmount } from "./deposit.ts"

export const SURFACE_TYPES = ["drywall", "siding", "trim_linear", "doors"] as const

export type SurfaceType = (typeof SURFACE_TYPES)[number]

export const JOB_SIDES = ["interior", "exterior"] as const

export type JobSide = (typeof JOB_SIDES)[number]

/** Drywall is an interior wall. Siding is the exterior wall. Trim and doors are used on both. */
export const SURFACES_FOR_SIDE: Record<JobSide, readonly SurfaceType[]> = {
  interior: ["drywall", "trim_linear", "doors"],
  exterior: ["siding", "trim_linear", "doors"],
}

export const DEFAULT_SURFACE_RATES: Record<SurfaceType, number> = {
  drywall: 150,
  siding: 120,
  trim_linear: 80,
  doors: 20,
}

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  drywall: "Drywall",
  siding: "Siding",
  trim_linear: "Trim",
  doors: "Doors",
}

export const SURFACE_UNITS: Record<SurfaceType, string> = {
  drywall: "sq ft",
  siding: "sq ft",
  trim_linear: "linear ft",
  doors: "count",
}

export interface SurfaceSpec {
  surfaceType: SurfaceType
  quantity: number
  productionRate: number
  coats: number
}

export interface PaymentMilestone {
  id: "deposit" | "start" | "completion"
  label: string
  percentage: number
  amount: number
  trigger: "acceptance" | "job_start" | "job_completion"
}

export interface LaborSchedule {
  totalLaborHours: number
  totalCost: number
  milestones: PaymentMilestone[]
}

export interface LaborScheduleInput {
  surfaces: unknown
  hourlyRate?: unknown
  depositPct?: unknown
  progressPct?: unknown
  completionPct?: unknown
}

export type LaborScheduleResult =
  | { ok: true; schedule: LaborSchedule }
  | { ok: false; error: string }

const DEFAULT_HOURLY_RATE = 65
const DEFAULT_DEPOSIT_PCT = 30
const DEFAULT_PROGRESS_PCT = 50
const DEFAULT_COMPLETION_PCT = 20

export function laborPaymentSchedule(input: LaborScheduleInput): LaborScheduleResult {
  if (!Array.isArray(input.surfaces)) return { ok: false, error: "surfaces array required" }

  const hourlyRate = percentOrDefault(input.hourlyRate, DEFAULT_HOURLY_RATE, "hourlyRate")
  if (!hourlyRate.ok) return hourlyRate
  const depositPct = percentOrDefault(input.depositPct, DEFAULT_DEPOSIT_PCT, "depositPct")
  if (!depositPct.ok) return depositPct
  const progressPct = percentOrDefault(input.progressPct, DEFAULT_PROGRESS_PCT, "progressPct")
  if (!progressPct.ok) return progressPct
  const completionPct = percentOrDefault(input.completionPct, DEFAULT_COMPLETION_PCT, "completionPct")
  if (!completionPct.ok) return completionPct
  if (Math.abs(depositPct.value + progressPct.value + completionPct.value - 100) > 0.001) {
    return { ok: false, error: "Deposit, progress, and completion percentages must add up to 100." }
  }

  let rawHours = 0
  for (const entry of input.surfaces) {
    const surface = readSurface(entry)
    if (!surface.ok) return surface
    if (surface.value.productionRate > 0) {
      rawHours += (surface.value.quantity * surface.value.coats) / surface.value.productionRate
    }
  }

  const totalLaborHours = roundCents(rawHours)
  const totalCost = roundCents(totalLaborHours * hourlyRate.value)
  const grandTotal = totalCost
  const deposit = depositAmount(grandTotal, depositPct.value)
  const progressAmount = roundCents((grandTotal * progressPct.value) / 100)
  const completionAmount = roundCents(grandTotal - deposit - progressAmount)

  return {
    ok: true,
    schedule: {
      totalLaborHours,
      totalCost,
      milestones: [
        {
          id: "deposit",
          label: "Deposit Upon Acceptance",
          percentage: depositPct.value,
          amount: deposit,
          trigger: "acceptance",
        },
        {
          id: "start",
          label: "Job Start Progress Payment",
          percentage: progressPct.value,
          amount: progressAmount,
          trigger: "job_start",
        },
        {
          id: "completion",
          label: "Final Balance Upon Completion",
          percentage: completionPct.value,
          amount: completionAmount,
          trigger: "job_completion",
        },
      ],
    },
  }
}

function readSurface(entry: unknown): { ok: true; value: SurfaceSpec } | { ok: false; error: string } {
  if (!entry || typeof entry !== "object") return { ok: false, error: "Each surface needs a type, quantity, rate, and coats." }
  const record = entry as Record<string, unknown>
  if (!isSurfaceType(record.surfaceType)) return { ok: false, error: "Each surface needs a type, quantity, rate, and coats." }
  const quantity = finite(record.quantity)
  const productionRate = finite(record.productionRate)
  const coats = finite(record.coats)
  if (quantity === null || quantity < 0 || productionRate === null || productionRate < 0 || coats === null || coats < 0) {
    return { ok: false, error: "Each surface needs a type, quantity, rate, and coats." }
  }
  return { ok: true, value: { surfaceType: record.surfaceType, quantity, productionRate, coats } }
}

function isSurfaceType(value: unknown): value is SurfaceType {
  return typeof value === "string" && (SURFACE_TYPES as readonly string[]).includes(value)
}

function percentOrDefault(
  value: unknown,
  fallback: number,
  name: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: fallback }
  const number = finite(value)
  if (number === null || number < 0 || (name !== "hourlyRate" && number > 100)) {
    return { ok: false, error: `${name} must be a positive number.` }
  }
  return { ok: true, value: number }
}

function finite(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return value
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}
