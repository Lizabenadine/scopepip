import type { FeetInches } from "../estimate/multi-trade-types.ts"

export interface FlooringRoomScan {
  name: string
  lengthFt: number
  widthFt: number
  areaSqFt: number
  perimeterFt: number
}

export const maxRoomScanBytes = 16_384

export function parseFlooringRoomScan(contents: string): FlooringRoomScan {
  const scan: unknown = JSON.parse(contents)
  if (typeof scan !== "object" || scan === null || !("version" in scan) || scan.version !== 1) {
    throw new Error("Choose a Scopepipe room scan exported by the iPhone scanner.")
  }

  function measurement(key: string, max: number) {
    const value = (scan as Record<string, unknown>)[key]
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > max) {
      throw new Error("The scan contains invalid measurements. Open it on your iPhone and export it again.")
    }
    return value
  }

  const name = "name" in scan && typeof scan.name === "string" ? scan.name.trim().slice(0, 80) : ""
  return {
    name,
    lengthFt: measurement("lengthFt", 1_000),
    widthFt: measurement("widthFt", 1_000),
    areaSqFt: measurement("areaSqFt", 100_000),
    perimeterFt: measurement("perimeterFt", 4_000),
  }
}

export function scanFeetInches(feet: number): FeetInches {
  const inches = Math.round(feet * 12)
  return { feet: Math.floor(inches / 12), inches: inches % 12 }
}
