import type { FeetInches } from "./multi-trade-types.ts"

/** Converts feet and inches to exact decimal feet */
export function toDecimalFeet(dim?: FeetInches | null): number {
  if (!dim) return 0
  const ft = Number.isFinite(dim.feet) ? Math.max(0, dim.feet) : 0
  const inches = Number.isFinite(dim.inches) ? Math.max(0, dim.inches) : 0
  return Number((ft + inches / 12).toFixed(4))
}

/** Converts decimal feet to standard feet and whole/fractional inches */
export function fromDecimalFeet(decimalFeet?: number | null): FeetInches {
  if (!decimalFeet || !Number.isFinite(decimalFeet) || decimalFeet <= 0) return { feet: 0, inches: 0 }
  const totalInches = Math.round(decimalFeet * 12)
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return { feet, inches }
}

/** Formats feet and inches for UI display e.g. 12' 6" */
export function formatFeetInches(dim?: FeetInches | null): string {
  if (!dim) return `0' 0"`
  const ft = Number.isFinite(dim.feet) ? Math.max(0, dim.feet) : 0
  const inches = Number.isFinite(dim.inches) ? Math.max(0, dim.inches) : 0
  return `${ft}' ${inches}"`
}

/** Parses user input into feet and inches (e.g. "12' 6\"", "12-6", "12.5", "12 ft 6 in", "12") */
export function parseFeetInches(raw: string | number): FeetInches {
  if (typeof raw === "number") {
    return fromDecimalFeet(raw)
  }
  const clean = String(raw ?? "").trim().toLowerCase()
  if (!clean) return { feet: 0, inches: 0 }

  // 1. Pure decimal e.g. "12.5"
  const decimalMatch = clean.match(/^(\d+)\.(\d+)$/)
  if (decimalMatch && decimalMatch[1] && decimalMatch[2]) {
    return fromDecimalFeet(parseFloat(clean))
  }

  // 2. Pattern: 12' 6" or 12'6 or 12-6 or 12ft 6in or 12 ft 6
  const ftInMatch = clean.match(/^(\d+)\s*(?:'|ft|feet|-|\s)\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches)?$/)
  if (ftInMatch && ftInMatch[1] && ftInMatch[2]) {
    const feet = Math.floor(parseFloat(ftInMatch[1]))
    const inches = parseFloat(ftInMatch[2])
    return { feet, inches: Math.min(11.875, inches) }
  }

  // 3. Whole number e.g. "12"
  const wholeMatch = clean.match(/^(\d+)$/)
  if (wholeMatch && wholeMatch[1]) {
    return { feet: parseInt(wholeMatch[1], 10), inches: 0 }
  }

  // 4. Feet only with symbol e.g. "12'" or "12ft"
  const feetOnlyMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)$/)
  if (feetOnlyMatch && feetOnlyMatch[1]) {
    return { feet: Math.floor(parseFloat(feetOnlyMatch[1])), inches: 0 }
  }

  return { feet: 0, inches: 0 }
}

/** Computes square footage from length and width in feet + inches */
export function areaSqFt(length: FeetInches, width: FeetInches): number {
  const l = toDecimalFeet(length)
  const w = toDecimalFeet(width)
  return Number((l * w).toFixed(2))
}

/** Computes perimeter in linear feet from length and width in feet + inches */
export function perimeterLinearFt(length: FeetInches, width: FeetInches): number {
  const l = toDecimalFeet(length)
  const w = toDecimalFeet(width)
  return Number((2 * (l + w)).toFixed(2))
}
