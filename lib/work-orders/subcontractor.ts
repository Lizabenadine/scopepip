import type { CrewSheet } from "./crew-sheet.ts"

export interface PaintColorSpec {
  id: string
  area: string
  brand: string
  product: string
  colorNameCode: string
  sheen: string
}

export interface HybridItem {
  id: string
  description: string
  quantity: number
  unit: string
  notes?: string
}

export interface WorkOrderData {
  jobId: string
  dateGenerated: string
  companyName: string
  companyAddress: string
  companyPhone: string
  salespersonName: string
  salespersonEmail: string
  customerName: string
  customerPhone: string
  customerEmail: string
  jobAddress: string
  jobName: string
  companyCamUrl?: string
  prepTasks: string[]
  applicationAreas: string[]
  exclusions: string[]
  colorSpecs: PaintColorSpec[]
  hybridItems: HybridItem[]
  subSignature?: string
  subSignedDate?: string
}

export interface SubcontractorSource {
  sheet: CrewSheet
  jobId: string
  dateGenerated: string
  companyName: string
  companyAddress: string
  companyPhone: string
  salespersonName: string
  salespersonEmail: string
  companyCamUrl?: string
  exclusions?: string[]
  subSignature?: string
  subSignedDate?: string
}

const EXCLUSION = /^(skip|exclude|excluded|not included|do not)\b/i

export function generatedOn(iso: string | null | undefined): string {
  if (!iso) return ""
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? ""
}

export function subcontractorSignature(
  name: string,
  signedDate: string,
): { subSignature: string; subSignedDate: string } | null {
  const subSignature = name.trim()
  if (!subSignature) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(signedDate)) return null
  return { subSignature, subSignedDate: signedDate }
}

function noteLines(text: string): string[] {
  return text
    .split(/\n+| · /)
    .flatMap((line) => line.split(/(?<=\.)\s+/))
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
}

function isExclusion(line: string): boolean {
  return EXCLUSION.test(line)
}

function unique(lines: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const line of lines) {
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(line)
  }
  return result
}

function roundQuantity(value: number): number {
  return Math.round(value * 100) / 100
}

function colorSpecs(sheet: CrewSheet): PaintColorSpec[] {
  const groups = new Map<string, string[]>()
  for (const area of sheet.areas) {
    for (const surface of area.surfaces) {
      if (!surface.productName || surface.productName === "Prep") continue
      const place = `${area.name} ${surface.internalLabel.toLowerCase()} (${surface.quantityLabel})`
      const places = groups.get(surface.productName) ?? []
      places.push(place)
      groups.set(surface.productName, places)
    }
  }
  return [...groups.entries()].map(([product, places], index) => ({
    id: `color-${index + 1}`,
    area: places.join(", "),
    brand: "",
    product,
    colorNameCode: "Not specified",
    sheen: "Not specified",
  }))
}

function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim())
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString()
  } catch {
    return undefined
  }
  return undefined
}

export function toSubcontractorOrder(source: SubcontractorSource): WorkOrderData {
  const { sheet } = source
  const noted: string[] = []
  for (const area of sheet.areas) noted.push(...noteLines(area.prepNote))
  for (const area of sheet.areas) {
    for (const surface of area.surfaces) noted.push(...noteLines(surface.crewNote))
  }
  noted.push(...noteLines(sheet.crewNote))
  noted.push(...(source.exclusions ?? []).flatMap(noteLines))

  const exclusions = unique(noted.filter(isExclusion))
  const exclusionKeys = new Set(exclusions.map((line) => line.toLowerCase()))
  const extraPrep = noted.filter((line) => !exclusionKeys.has(line.toLowerCase()) && !isExclusion(line))

  const checklist = sheet.checklist.map((item) => item.label.trim()).filter(Boolean)
  const early = checklist.filter((label) => !label.startsWith("Paint ") && !/^(walk the punch|clean up)/i.test(label))
  const closing = checklist.filter((label) => /^(walk the punch|clean up)/i.test(label))

  const prepTasks = unique([...early, ...extraPrep, ...closing])
  const applicationAreas = sheet.areas.map((area) => {
    const surfaces = area.surfaces.map((surface) => surface.internalLabel).join(", ")
    return surfaces
      ? `${area.name} (${area.dimensionLabel}): ${surfaces}`
      : `${area.name} (${area.dimensionLabel})`
  })

  const hybridItems: HybridItem[] = [
    ...sheet.areas.map((area) => ({
      id: area.id,
      description: area.name,
      quantity: 1,
      unit: "Job",
      notes: area.surfaces.map((surface) => surface.internalLabel).join(", ") || undefined,
    })),
    ...sheet.lineItems.map((line) => ({
      id: line.id,
      description: line.label,
      quantity: line.allocatedHours > 0 ? roundQuantity(line.allocatedHours) : 1,
      unit: line.allocatedHours > 0 ? "hr" : "Ea",
      notes: line.crewNote.trim() || undefined,
    })),
  ]

  return {
    jobId: source.jobId,
    dateGenerated: generatedOn(source.dateGenerated),
    companyName: source.companyName.trim() || "ScopePipe",
    companyAddress: source.companyAddress.trim(),
    companyPhone: source.companyPhone.trim(),
    salespersonName: source.salespersonName.trim(),
    salespersonEmail: source.salespersonEmail.trim(),
    customerName: sheet.clientName,
    customerPhone: sheet.phone,
    customerEmail: sheet.email,
    jobAddress: sheet.address,
    jobName: `${sheet.clientName} - ${sheet.title}`,
    companyCamUrl: safeHttpUrl(source.companyCamUrl),
    prepTasks,
    applicationAreas,
    exclusions,
    colorSpecs: colorSpecs(sheet),
    hybridItems,
    subSignature: source.subSignature?.trim() || undefined,
    subSignedDate: source.subSignedDate?.trim() || undefined,
  }
}
