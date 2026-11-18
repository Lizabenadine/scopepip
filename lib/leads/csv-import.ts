import type { ScopeState } from "../data/seed.ts"
import { phoneKey } from "../messages/thread.ts"
import { createProposalToken } from "../proposals/token.ts"
import { createWorkOrder } from "../work-orders/defaults.ts"
import type { Client, Estimate } from "../types.ts"

export interface CsvRawRow {
  [key: string]: string
}

export interface CsvColumnMapping {
  nameCol?: string
  firstNameCol?: string
  lastNameCol?: string
  emailCol?: string
  phoneCol?: string
  addressCol?: string
  cityCol?: string
  stateCol?: string
  zipCol?: string
  notesCol?: string
}

export interface ParsedCsvLead {
  rowNumber: number
  name: string
  email: string
  phone: string
  address: string
  notes: string
  status: "valid" | "duplicate" | "invalid"
  duplicateReason?: string
  invalidReason?: string
}

export interface CsvPreviewResult {
  headers: string[]
  mapping: CsvColumnMapping
  totalRows: number
  validCount: number
  duplicateCount: number
  invalidCount: number
  leads: ParsedCsvLead[]
}

export interface CsvImportResult {
  ok: boolean
  total: number
  imported: number
  skipped: number
  failed: number
  state: ScopeState
  createdEstimateIds: string[]
}

/**
 * Parses raw CSV text into a 2D array of strings conforming to RFC 4180.
 * Properly handles quotes, escaped quotes (""), commas, CRLF / LF.
 */
export function parseCsvText(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "") // strip BOM
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const nextChar = clean[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        currentRow.push(currentField.trim())
        currentField = ""
      } else if (char === "\r") {
        if (nextChar === "\n") i++
        currentRow.push(currentField.trim())
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow)
        }
        currentRow = []
        currentField = ""
      } else if (char === "\n") {
        currentRow.push(currentField.trim())
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow)
        }
        currentRow = []
        currentField = ""
      } else {
        currentField += char
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[-_#\.]/g, " ")
    .replace(/\s+/g, " ")
}

/**
 * Automatically recognizes common column headings for name, email, phone, address, and notes.
 */
export function detectColumnMapping(headers: string[]): CsvColumnMapping {
  const mapping: CsvColumnMapping = {}
  const normalized = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }))

  for (const { original, norm } of normalized) {
    // Single Name column
    if (!mapping.nameCol) {
      if (
        [
          "name",
          "full name",
          "fullname",
          "lead name",
          "customer name",
          "client name",
          "contact name",
          "contact",
          "customer",
          "lead",
          "homeowner",
          "client",
        ].includes(norm)
      ) {
        mapping.nameCol = original
        continue
      }
    }

    // First Name
    if (!mapping.firstNameCol && ["first name", "firstname", "first", "given name", "fname"].includes(norm)) {
      mapping.firstNameCol = original
      continue
    }

    // Last Name
    if (!mapping.lastNameCol && ["last name", "lastname", "last", "surname", "family name", "lname"].includes(norm)) {
      mapping.lastNameCol = original
      continue
    }

    // Email
    if (
      !mapping.emailCol &&
      ["email", "e mail", "email address", "e mail address", "mail", "contact email", "primary email"].includes(norm)
    ) {
      mapping.emailCol = original
      continue
    }

    // Phone
    if (
      !mapping.phoneCol &&
      [
        "phone",
        "phone number",
        "phonenumber",
        "telephone",
        "mobile",
        "cell",
        "tel",
        "cell phone",
        "mobile phone",
        "primary phone",
        "contact phone",
      ].includes(norm)
    ) {
      mapping.phoneCol = original
      continue
    }

    // Address
    if (
      !mapping.addressCol &&
      [
        "address",
        "street",
        "street address",
        "job address",
        "property address",
        "location",
        "site address",
        "address line 1",
        "address 1",
      ].includes(norm)
    ) {
      mapping.addressCol = original
      continue
    }

    // City
    if (!mapping.cityCol && ["city", "town"].includes(norm)) {
      mapping.cityCol = original
      continue
    }

    // State
    if (!mapping.stateCol && ["state", "province", "region"].includes(norm)) {
      mapping.stateCol = original
      continue
    }

    // Zip
    if (!mapping.zipCol && ["zip", "zipcode", "zip code", "postal", "postal code"].includes(norm)) {
      mapping.zipCol = original
      continue
    }

    // Notes / Description
    if (
      !mapping.notesCol &&
      [
        "notes",
        "note",
        "message",
        "comments",
        "comment",
        "description",
        "details",
        "service",
        "service requested",
        "project",
        "project title",
        "project description",
        "inquiry",
        "scope",
      ].includes(norm)
    ) {
      mapping.notesCol = original
      continue
    }
  }

  return mapping
}

/**
 * Previews a parsed CSV against the existing CRM database state, detecting duplicates and invalid rows.
 */
export function previewCsvLeads(
  csvText: string,
  state: { clients: Client[]; estimates: Estimate[] },
  customMapping?: Partial<CsvColumnMapping>,
): CsvPreviewResult {
  const rows = parseCsvText(csvText)
  if (rows.length === 0) {
    return {
      headers: [],
      mapping: {},
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      leads: [],
    }
  }

  const headers = rows[0]
  const mapping = { ...detectColumnMapping(headers), ...customMapping }
  const dataRows = rows.slice(1)

  // Pre-build lookup sets of existing CRM clients and leads for duplicate detection
  const existingPhones = new Set<string>()
  const existingEmails = new Set<string>()

  for (const client of state.clients) {
    const key = phoneKey(client.phone)
    if (key) existingPhones.add(key)
    const email = client.email.trim().toLowerCase()
    if (email) existingEmails.add(email)
  }

  const seenCsvPhones = new Set<string>()
  const seenCsvEmails = new Set<string>()

  const leads: ParsedCsvLead[] = []

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx]
    const rowNumber = idx + 2 // 1-based, accounting for header row

    // Extract values based on mapping
    const getVal = (colName?: string): string => {
      if (!colName) return ""
      const colIndex = headers.indexOf(colName)
      return colIndex >= 0 && colIndex < row.length ? row[colIndex].trim() : ""
    }

    // Name
    let name = getVal(mapping.nameCol)
    if (!name && (mapping.firstNameCol || mapping.lastNameCol)) {
      const first = getVal(mapping.firstNameCol)
      const last = getVal(mapping.lastNameCol)
      name = [first, last].filter(Boolean).join(" ").trim()
    }

    // Email
    const email = getVal(mapping.emailCol).toLowerCase()

    // Phone
    const phone = getVal(mapping.phoneCol)

    // Address
    let address = getVal(mapping.addressCol)
    const city = getVal(mapping.cityCol)
    const st = getVal(mapping.stateCol)
    const zip = getVal(mapping.zipCol)
    const cityStateZip = [city, [st, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
    if (cityStateZip) {
      address = address ? `${address}, ${cityStateZip}` : cityStateZip
    }

    // Notes
    const notes = getVal(mapping.notesCol)

    // Validation
    let status: "valid" | "duplicate" | "invalid" = "valid"
    let duplicateReason: string | undefined
    let invalidReason: string | undefined

    if (!name) {
      status = "invalid"
      invalidReason = "Missing contact name"
    } else if (!phone && !email) {
      status = "invalid"
      invalidReason = "Requires phone number or email"
    } else if (email && !email.includes("@")) {
      status = "invalid"
      invalidReason = "Invalid email format"
    }

    // Duplicate detection (only if otherwise valid)
    if (status === "valid") {
      const phoneDigits = phoneKey(phone)
      if (phoneDigits) {
        if (existingPhones.has(phoneDigits)) {
          status = "duplicate"
          duplicateReason = `Phone number already exists in CRM (${phone})`
        } else if (seenCsvPhones.has(phoneDigits)) {
          status = "duplicate"
          duplicateReason = `Duplicate phone number within this CSV (${phone})`
        }
      }

      if (status === "valid" && email) {
        if (existingEmails.has(email)) {
          status = "duplicate"
          duplicateReason = `Email already exists in CRM (${email})`
        } else if (seenCsvEmails.has(email)) {
          status = "duplicate"
          duplicateReason = `Duplicate email within this CSV (${email})`
        }
      }
    }

    if (status === "valid") {
      const pKey = phoneKey(phone)
      if (pKey) seenCsvPhones.add(pKey)
      if (email) seenCsvEmails.add(email)
    }

    leads.push({
      rowNumber,
      name,
      email,
      phone,
      address,
      notes,
      status,
      duplicateReason,
      invalidReason,
    })
  }

  const validCount = leads.filter((l) => l.status === "valid").length
  const duplicateCount = leads.filter((l) => l.status === "duplicate").length
  const invalidCount = leads.filter((l) => l.status === "invalid").length

  return {
    headers,
    mapping,
    totalRows: dataRows.length,
    validCount,
    duplicateCount,
    invalidCount,
    leads,
  }
}

/**
 * Saves valid parsed leads into the CRM database state, skipping duplicates and invalid rows.
 * Creates a Client and an Estimate in stage 'lead' (salesStage 'cold') for each valid lead.
 */
export function applyCsvLeadRows(
  state: ScopeState,
  parsedLeads: ParsedCsvLead[],
  now = new Date().toISOString(),
): CsvImportResult {
  const validLeads = parsedLeads.filter((l) => l.status === "valid")
  const skipped = parsedLeads.filter((l) => l.status === "duplicate").length
  const failed = parsedLeads.filter((l) => l.status === "invalid").length

  if (validLeads.length === 0) {
    return {
      ok: true,
      total: parsedLeads.length,
      imported: 0,
      skipped,
      failed,
      state,
      createdEstimateIds: [],
    }
  }

  const stageId =
    state.stages.find((stage) => stage.slug === "lead")?.id ?? state.stages[0]?.id ?? "stage-lead"

  let nextClients = [...state.clients]
  const newEstimates: Estimate[] = []
  const createdEstimateIds: string[] = []

  for (const item of validLeads) {
    const clientId = crypto.randomUUID()
    const estimateId = crypto.randomUUID()
    createdEstimateIds.push(estimateId)

    const client: Client = {
      id: clientId,
      name: item.name,
      phone: item.phone,
      email: item.email,
      address: item.address,
      notes: item.notes,
      createdAt: now,
      updatedAt: now,
    }
    nextClients = [client, ...nextClients]

    const titleLine = item.notes?.split("\n")[0]?.trim()
    const title = titleLine && titleLine.length <= 80 ? titleLine : item.address || "New lead"

    const estimate: Estimate = {
      id: estimateId,
      clientId,
      stageId,
      title,
      jobAddress: item.address,
      areas: [],
      lineItems: [],
      rates: state.productionRates.map((rate) => ({
        ...rate,
        coatRates: rate.coatRates.map((entry) => ({ ...entry })),
      })),
      settings: { ...state.estimateSettings },
      scheduledOn: null,
      notes: item.notes || "Imported from CSV.",
      crewNote: "",
      acceptedAt: null,
      publicToken: createProposalToken(),
      clientStatus: "draft",
      signature: null,
      paymentStatus: "unpaid",
      depositReceipt: null,
      leadSource: "csv",
      tags: ["csv-import"],
      salesperson: "",
      salesStage: "cold",
      createdAt: now,
      updatedAt: now,
    }
    newEstimates.push(estimate)
  }

  const nextWorkOrders = newEstimates.map(createWorkOrder)

  const nextState: ScopeState = {
    ...state,
    clients: nextClients,
    estimates: [...newEstimates, ...state.estimates],
    workOrders: [...nextWorkOrders, ...state.workOrders],
  }

  return {
    ok: true,
    total: parsedLeads.length,
    imported: validLeads.length,
    skipped,
    failed,
    state: nextState,
    createdEstimateIds,
  }
}
