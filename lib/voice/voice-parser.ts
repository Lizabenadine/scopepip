/**
 * Natural Language Voice Command Parser for Painting Contractors.
 * 
 * Parses hands-free walkthrough estimating, lead creation, customer notes,
 * appointment scheduling, follow-ups, document generation, and navigation.
 */

export type VoiceIntentType =
  | "ADD_ROOM"
  | "CREATE_LEAD"
  | "ADD_CUSTOMER_NOTE"
  | "SCHEDULE_APPOINTMENT"
  | "UPDATE_CRM_RECORD"
  | "GENERATE_DOCUMENT"
  | "NAVIGATE"
  | "DICTATE_TEXT"

export interface VoiceSurfaceSpec {
  rateId: string
  label: string
  coatCount: number
}

export interface VoiceOpeningSpec {
  kind: "door" | "window"
  count: number
}

export interface AddRoomAction {
  type: "ADD_ROOM"
  roomName: string
  lengthFt: number
  widthFt: number
  heightFt: number
  surfaces: VoiceSurfaceSpec[]
  openings: VoiceOpeningSpec[]
  requiresConfirmation: boolean
  summary: string
}

export interface CreateLeadAction {
  type: "CREATE_LEAD"
  name: string
  phone: string
  email: string
  address: string
  service: string
  requiresConfirmation: boolean
  summary: string
}

export interface AddCustomerNoteAction {
  type: "ADD_CUSTOMER_NOTE"
  targetName: string
  note: string
  requiresConfirmation: boolean
  summary: string
}

export interface ScheduleAppointmentAction {
  type: "SCHEDULE_APPOINTMENT"
  clientName: string
  date: string // YYYY-MM-DD
  time: string // HH:mm or formatted e.g. "2:00 PM"
  address?: string
  displayDateTime: string
  requiresConfirmation: boolean
  summary: string
}

export interface UpdateCrmRecordAction {
  type: "UPDATE_CRM_RECORD"
  clientName: string
  action: "follow_up" | "advance_stage" | "set_stage" | "mark_accepted"
  stage?: string
  requiresConfirmation: boolean
  summary: string
}

export interface GenerateDocumentAction {
  type: "GENERATE_DOCUMENT"
  documentType: "estimate" | "work_order" | "paint_list"
  requiresConfirmation: boolean
  summary: string
}

export interface NavigateAction {
  type: "NAVIGATE"
  destination: string
  label: string
  requiresConfirmation: boolean
  summary: string
}

export interface DictateTextAction {
  type: "DICTATE_TEXT"
  text: string
  requiresConfirmation: boolean
  summary: string
}

export type VoiceAction =
  | AddRoomAction
  | CreateLeadAction
  | AddCustomerNoteAction
  | ScheduleAppointmentAction
  | UpdateCrmRecordAction
  | GenerateDocumentAction
  | NavigateAction
  | DictateTextAction

export interface ParsedVoiceResult {
  action: VoiceAction
  rawTranscript: string
  confidence: number
}

// Spoken numbers dictionary (0-99)
const SPOKEN_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}

/**
 * Replaces spoken number words with Arabic numerals.
 * e.g., "fifteen by twenty" -> "15 by 20", "two coats" -> "2 coats"
 */
export function normalizeSpokenNumbers(text: string): string {
  let normalized = text.toLowerCase()

  // Replace compound tens (e.g. "twenty five" or "twenty-five" -> 25)
  const compoundRegex = /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[-\s](one|two|three|four|five|six|seven|eight|nine)\b/gi
  normalized = normalized.replace(compoundRegex, (_, tens: string, units: string) => {
    const t = SPOKEN_NUMBERS[tens.toLowerCase()] ?? 0
    const u = SPOKEN_NUMBERS[units.toLowerCase()] ?? 0
    return String(t + u)
  })

  // Replace single number words
  for (const [word, num] of Object.entries(SPOKEN_NUMBERS)) {
    const reg = new RegExp(`\\b${word}\\b`, "gi")
    normalized = normalized.replace(reg, String(num))
  }

  return normalized
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .trim()
}

/**
 * Parses date references like "tomorrow", "Friday", "next Monday", "October 24", etc.
 */
export function parseRelativeDate(text: string, referenceDate: Date = new Date()): { dateIso: string; displayDate: string } {
  const norm = text.toLowerCase()
  const target = new Date(referenceDate.getTime())

  if (norm.includes("tomorrow")) {
    target.setDate(target.getDate() + 1)
  } else if (norm.includes("today")) {
    // keep today
  } else {
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    for (let i = 0; i < daysOfWeek.length; i++) {
      const dayName = daysOfWeek[i]
      if (norm.includes(dayName)) {
        const currentDay = target.getDay()
        let diff = i - currentDay
        if (diff <= 0 || norm.includes(`next ${dayName}`)) {
          diff += 7
        }
        target.setDate(target.getDate() + diff)
        break
      }
    }
  }

  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, "0")
  const d = String(target.getDate()).padStart(2, "0")
  const dateIso = `${y}-${m}-${d}`

  const displayDate = target.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return { dateIso, displayDate }
}

/**
 * Extracts time like "2 PM", "10:30 AM", "14:00", "9 AM".
 */
export function parseTime(text: string): { time24: string; displayTime: string } {
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  const match = text.match(timeRegex)
  if (!match) {
    return { time24: "09:00", displayTime: "9:00 AM" }
  }

  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? match[2] : "00"
  const meridiem = match[3]?.toLowerCase()

  if (meridiem === "pm" && hours < 12) {
    hours += 12
  } else if (meridiem === "am" && hours === 12) {
    hours = 0
  }

  const time24 = `${String(hours).padStart(2, "0")}:${minutes}`
  const displayHours = hours % 12 || 12
  const displayMeridiem = hours >= 12 ? "PM" : "AM"
  const displayTime = `${displayHours}:${minutes} ${displayMeridiem}`

  return { time24, displayTime }
}

/**
 * Parses walkthrough estimating command:
 * e.g. "Add living room, 15 by 20, walls and ceiling"
 * "Add master bedroom, 14 by 16 by 9, two coats walls"
 * "Add 2 doors, 3 windows to kitchen"
 */
export function parseAddRoomCommand(transcript: string): AddRoomAction | null {
  const normalized = normalizeSpokenNumbers(transcript)

  // Explicitly ignore lead, customer, appointment, note commands
  if (/\b(?:lead|customer|client|appointment|visit|meeting|note|follow-?up)\b/i.test(normalized)) {
    return null
  }

  // Must have an "add [room]..." or "new room..." pattern
  const addRoomPattern = /\b(?:add|create|new|include)\s+(?:a\s+|the\s+)?([a-z0-9\s'-]+?)(?:,|\s+(?:measuring|size|dimensions?|at|\d|with|\bft\b|\bby\b|\bx\b))/i
  const simpleAddPattern = /\b(?:add|new)\s+(living room|master bedroom|bedroom|kitchen|dining room|bathroom|hallway|office|basement|garage|exterior|patio|closet|laundry|entryway|foyer)\b/i

  let roomMatch = normalized.match(addRoomPattern)
  if (!roomMatch) {
    roomMatch = normalized.match(simpleAddPattern)
  }

  // If not explicitly "add room", check if it starts with room dimension phrasing: "Living room 15 by 20..."
  if (!roomMatch) {
    const startsWithRoom = /^(living room|master bedroom|bedroom(?:\s+\d)?|kitchen|dining room|bathroom|hallway|office|basement|garage|exterior|patio|closet|laundry|entryway|foyer)\b/i
    roomMatch = normalized.match(startsWithRoom)
  }

  if (!roomMatch) return null

  let rawRoomName = roomMatch[1].trim()
  // Clean up any extraneous words
  rawRoomName = rawRoomName.replace(/\b(?:room|area)\s+called\s+/i, "")
  const roomName = titleCase(rawRoomName)

  // Extract dimensions: "15 by 20", "15x20", "15 by 20 by 9", "12 feet by 14 feet"
  const dimRegex = /(\d+(?:\.\d+)?)\s*(?:ft|feet|'|x|by|\*)\s*(\d+(?:\.\d+)?)(?:\s*(?:ft|feet|'|x|by|\*)\s*(\d+(?:\.\d+)?))?/i
  const dimMatch = normalized.match(dimRegex)

  let lengthFt = 0
  let widthFt = 0
  let heightFt = 8 // Default residential height

  if (dimMatch) {
    lengthFt = parseFloat(dimMatch[1])
    widthFt = parseFloat(dimMatch[2])
    if (dimMatch[3]) {
      heightFt = parseFloat(dimMatch[3])
    }
  }

  // Check for standalone ceiling height: "9 foot ceiling", "ceiling 10 ft", "height 9"
  const ceilingHeightRegex = /(?:(\d+(?:\.\d+)?)\s*(?:ft|foot|feet|')\s*(?:ceiling|ceilings|height)|(?:ceiling|ceilings|height)\s*(?:of|is|at)?\s*(\d+(?:\.\d+)?))/i
  const ceilingMatch = normalized.match(ceilingHeightRegex)
  if (ceilingMatch) {
    const val = ceilingMatch[1] || ceilingMatch[2]
    if (val) heightFt = parseFloat(val)
  }

  // Extract coat counts if mentioned: "two coats", "1 coat", "prime and 2 coats"
  let coatCount = 2 // Standard default
  const coatRegex = /(\d+)\s*(?:coat|coats)\b/i
  const coatMatch = normalized.match(coatRegex)
  if (coatMatch) {
    coatCount = Math.max(1, parseInt(coatMatch[1], 10))
  }

  // Extract surfaces: walls, ceiling, baseboards, doors, trim, crown molding, siding, cabinets
  const surfaces: VoiceSurfaceSpec[] = []
  const hasWalls = /\b(walls?|wall)\b/i.test(normalized)
  const hasCeiling = /\b(ceilings?|ceiling)\b/i.test(normalized)
  const hasBaseboards = /\b(baseboards?|baseboard)\b/i.test(normalized)
  const hasTrim = /\b(trim|casings?)\b/i.test(normalized)
  const hasCrown = /\b(crown|crown molding)\b/i.test(normalized)
  const hasSiding = /\b(siding)\b/i.test(normalized)
  const hasCabinets = /\b(cabinets?|cabinet doors?)\b/i.test(normalized)
  const wallsOnly = /\bwalls?\s+only\b/i.test(normalized)

  if (wallsOnly) {
    surfaces.push({ rateId: "walls", label: "Walls", coatCount })
  } else {
    if (hasWalls) surfaces.push({ rateId: "walls", label: "Walls", coatCount })
    if (hasCeiling) surfaces.push({ rateId: "ceiling", label: "Ceiling", coatCount })
    if (hasBaseboards) surfaces.push({ rateId: "baseboards", label: "Baseboards", coatCount })
    if (hasTrim && !hasBaseboards) surfaces.push({ rateId: "baseboards", label: "Trim", coatCount })
    if (hasCrown) surfaces.push({ rateId: "crown-molding", label: "Crown Molding", coatCount })
    if (hasSiding) surfaces.push({ rateId: "siding", label: "Siding", coatCount })
    if (hasCabinets) surfaces.push({ rateId: "cabinet-doors", label: "Cabinets", coatCount })

    // If no surfaces explicitly named, supply standard room surfaces
    if (surfaces.length === 0) {
      if (roomName.toLowerCase().includes("exterior")) {
        surfaces.push({ rateId: "siding", label: "Siding", coatCount })
      } else if (roomName.toLowerCase().includes("cabinet")) {
        surfaces.push({ rateId: "cabinet-doors", label: "Cabinets", coatCount })
      } else {
        surfaces.push(
          { rateId: "walls", label: "Walls", coatCount },
          { rateId: "ceiling", label: "Ceiling", coatCount },
          { rateId: "baseboards", label: "Baseboards", coatCount },
        )
      }
    }
  }

  // Extract openings: doors and windows
  const openings: VoiceOpeningSpec[] = []
  const doorsRegex = /(\d+)\s*(?:door|doors)\b/i
  const doorsMatch = normalized.match(doorsRegex)
  if (doorsMatch) {
    openings.push({ kind: "door", count: parseInt(doorsMatch[1], 10) })
  }

  const windowsRegex = /(\d+)\s*(?:window|windows)\b/i
  const windowsMatch = normalized.match(windowsRegex)
  if (windowsMatch) {
    openings.push({ kind: "window", count: parseInt(windowsMatch[1], 10) })
  }

  const surfaceSummary = surfaces.map((s) => `${s.label} (${s.coatCount} coats)`).join(", ")
  const openingsSummary = openings.length > 0 ? `, Openings: ${openings.map((o) => `${o.count} ${o.kind}s`).join(", ")}` : ""
  const dimSummary = lengthFt > 0 && widthFt > 0 ? ` (${lengthFt}' × ${widthFt}' × ${heightFt}')` : ""

  return {
    type: "ADD_ROOM",
    roomName,
    lengthFt,
    widthFt,
    heightFt,
    surfaces,
    openings,
    requiresConfirmation: false, // Walkthrough estimating is hands-free; room is populated directly with instant undo
    summary: `Add ${roomName}${dimSummary} with ${surfaceSummary}${openingsSummary}.`,
  }
}

/**
 * Parses lead creation command:
 * e.g. "Create lead John Smith, 503-555-1234, john@example.com, 123 Oak St, interior repaint"
 */
export function parseCreateLeadCommand(transcript: string): CreateLeadAction | null {
  const norm = normalizeSpokenNumbers(transcript)

  const leadPrefixRegex = /\b(?:create|new|add)\s+(?:lead|customer|client)\s+([^,]+)/i
  const match = norm.match(leadPrefixRegex)
  if (!match) return null

  let remaining = transcript.replace(leadPrefixRegex, "").trim()
  let name = titleCase(match[1].trim())

  // If the captured name included phone or email, split it
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

  let phone = ""
  const phoneMatch = transcript.match(phoneRegex)
  if (phoneMatch) {
    phone = phoneMatch[0].trim()
    name = name.replace(phoneRegex, "").trim()
    remaining = remaining.replace(phoneRegex, "").trim()
  }

  let email = ""
  const emailMatch = transcript.match(emailRegex)
  if (emailMatch) {
    email = emailMatch[0].trim()
    name = name.replace(emailRegex, "").trim()
    remaining = remaining.replace(emailRegex, "").trim()
  }

  // Clean trailing punctuation or separators from name
  name = name.replace(/^for\s+/i, "").replace(/[,:]+$/, "").trim()

  // Extract address
  let address = ""
  const addressRegex = /\b(\d+\s+[A-Za-z0-9\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place))\b/i
  const addressMatch = transcript.match(addressRegex)
  if (addressMatch) {
    address = addressMatch[1].trim()
    remaining = remaining.replace(addressMatch[0], "").trim()
  } else {
    const addressTagRegex = /\b(?:address|at)\s+([^,]+)/i
    const tagMatch = remaining.match(addressTagRegex)
    if (tagMatch) {
      address = tagMatch[1].trim()
      remaining = remaining.replace(tagMatch[0], "").trim()
    }
  }

  // Extract service or project notes
  let service = remaining
    .replace(/^[,:\s]+/, "")
    .replace(/\b(?:service|notes?|type|project)\s*[:=]?\s*/i, "")
    .trim()

  if (!service) {
    if (/\binterior\b/i.test(transcript)) service = "Interior Repaint"
    else if (/\bexterior\b/i.test(transcript)) service = "Exterior Repaint"
    else if (/\bcabinet\b/i.test(transcript)) service = "Cabinet Refinishing"
  }

  return {
    type: "CREATE_LEAD",
    name,
    phone,
    email,
    address,
    service,
    requiresConfirmation: true, // Safety confirmation before writing new customer to CRM
    summary: `Create lead for ${name}${phone ? ` (${phone})` : ""}${address ? ` at ${address}` : ""}${service ? ` for ${service}` : ""}.`,
  }
}

/**
 * Parses customer note command:
 * e.g. "Add note to John Smith: wants satin finish on trim"
 * "Add customer note for Sarah: gate code 4421"
 */
export function parseCustomerNoteCommand(transcript: string): AddCustomerNoteAction | null {
  const noteRegex = /\b(?:add\s+(?:customer\s+|client\s+)?note\s+(?:to|for)|customer\s+note\s+(?:for|to))\s+([^:]+?)(?::|\s+that\s+|\s+saying\s+)(.+)/i
  const match = transcript.match(noteRegex)
  if (!match) return null

  const targetName = titleCase(match[1].trim())
  const note = match[2].trim()

  return {
    type: "ADD_CUSTOMER_NOTE",
    targetName,
    note,
    requiresConfirmation: true, // Safety confirmation before modifying CRM records
    summary: `Add note to ${targetName}: "${note}".`,
  }
}

/**
 * Parses appointment scheduling command:
 * e.g. "Schedule appointment with Sarah Connor tomorrow at 2 PM"
 * "Schedule visit with John Smith on Friday at 10 AM at 123 Oak St"
 */
export function parseScheduleAppointmentCommand(transcript: string): ScheduleAppointmentAction | null {
  const scheduleRegex = /\b(?:schedule|book)\s+(?:an?\s+)?(?:appointment|visit|estimate|meeting)\s+(?:with|for)\s+([^,]+?)(?:\s+(?:on|for|at|tomorrow|next|this|today))(.+)/i
  const match = transcript.match(scheduleRegex)
  if (!match) return null

  const clientName = titleCase(match[1].trim())
  const timeAndDatePart = match[2].trim()

  const { dateIso, displayDate } = parseRelativeDate(timeAndDatePart)
  const { time24, displayTime } = parseTime(timeAndDatePart)

  // Optional address in scheduling command
  let address: string | undefined
  const addressRegex = /\b(\d+\s+[A-Za-z\s]+?\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place))\b/i
  const addressMatch = timeAndDatePart.match(addressRegex)
  if (addressMatch) {
    address = addressMatch[1].trim()
  }

  const displayDateTime = `${displayDate} at ${displayTime}`

  return {
    type: "SCHEDULE_APPOINTMENT",
    clientName,
    date: dateIso,
    time: time24,
    address,
    displayDateTime,
    requiresConfirmation: true, // Safety confirmation before scheduling visit
    summary: `Schedule estimate visit with ${clientName} on ${displayDateTime}${address ? ` at ${address}` : ""}.`,
  }
}

/**
 * Parses CRM record update command:
 * e.g. "Set follow-up for John Smith"
 * "Advance sales stage for Sarah Connor"
 * "Mark estimate for Mike as accepted"
 */
export function parseUpdateCrmCommand(transcript: string): UpdateCrmRecordAction | null {
  const norm = transcript.toLowerCase()

  // Follow-up
  const followUpRegex = /\b(?:set\s+follow-?up|follow\s+up)\s+(?:for|with)\s+([^,.]+)/i
  const followMatch = transcript.match(followUpRegex)
  if (followMatch) {
    const clientName = titleCase(followMatch[1].trim())
    return {
      type: "UPDATE_CRM_RECORD",
      clientName,
      action: "follow_up",
      requiresConfirmation: true,
      summary: `Set active follow-up pursuit for ${clientName}.`,
    }
  }

  // Advance stage
  const advanceRegex = /\b(?:advance|move)\s+(?:stage|sales\s+stage)\s+(?:for|of)\s+([^,.]+)/i
  const advanceMatch = transcript.match(advanceRegex)
  if (advanceMatch) {
    const clientName = titleCase(advanceMatch[1].trim())
    return {
      type: "UPDATE_CRM_RECORD",
      clientName,
      action: "advance_stage",
      requiresConfirmation: true,
      summary: `Advance sales pipeline stage for ${clientName}.`,
    }
  }

  // Mark accepted
  const acceptRegex = /\b(?:mark|set)\s+(?:estimate|proposal|job)\s+(?:for\s+)?([^,.]+?)\s+(?:as\s+)?accepted\b/i
  const acceptMatch = transcript.match(acceptRegex)
  if (acceptMatch) {
    const clientName = titleCase(acceptMatch[1].trim())
    return {
      type: "UPDATE_CRM_RECORD",
      clientName,
      action: "mark_accepted",
      requiresConfirmation: true,
      summary: `Mark estimate for ${clientName} as accepted.`,
    }
  }

  return null
}

/**
 * Parses document generation command:
 * e.g. "Generate estimate", "Generate work order", "Generate paint material list"
 */
export function parseGenerateDocumentCommand(transcript: string): GenerateDocumentAction | null {
  const norm = transcript.toLowerCase()

  if (/\b(?:generate|create|new|start|open)\s+(?:an?\s+)?(?:estimate|proposal|bid|quote)\b/i.test(norm)) {
    return {
      type: "GENERATE_DOCUMENT",
      documentType: "estimate",
      requiresConfirmation: false,
      summary: "Create a new estimate draft.",
    }
  }

  if (/\b(?:generate|create|open|show|view)\s+(?:the\s+)?(?:work\s+order|crew\s+sheet)\b/i.test(norm)) {
    return {
      type: "GENERATE_DOCUMENT",
      documentType: "work_order",
      requiresConfirmation: false,
      summary: "Open work orders and crew sheets.",
    }
  }

  if (/\b(?:generate|calculate|show|view|open)\s+(?:the\s+)?(?:paint\s+(?:materials?\s+)?list|paint\s+buy\s+list|materials?\s+list|store\s+list)\b/i.test(norm)) {
    return {
      type: "GENERATE_DOCUMENT",
      documentType: "paint_list",
      requiresConfirmation: false,
      summary: "Generate paint materials store buy list.",
    }
  }

  return null
}

/**
 * Parses navigation command:
 * e.g. "Go to sales pipeline", "Open estimator", "Go to dashboard", "Open calendar"
 */
export function parseNavigationCommand(transcript: string): NavigateAction | null {
  const norm = transcript.toLowerCase()

  if (!/\b(?:go\s+to|open|navigate\s+to|show\s+me|switch\s+to)\b/i.test(norm)) {
    return null
  }

  if (/\b(dashboard|home|overview)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/dashboard", label: "Dashboard", requiresConfirmation: false, summary: "Navigate to Dashboard." }
  }
  if (/\b(sales\s+pipeline|pipeline|leads|board)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/sales-pipeline", label: "Sales Pipeline", requiresConfirmation: false, summary: "Navigate to Sales Pipeline." }
  }
  if (/\b(estimator|estimate|estimates|new\s+estimate)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/estimate", label: "Estimator", requiresConfirmation: false, summary: "Navigate to Estimator." }
  }
  if (/\b(clients|customers)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/clients", label: "Clients", requiresConfirmation: false, summary: "Navigate to Clients." }
  }
  if (/\b(work\s+orders|crew\s+sheets|crew\s+sheet)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/work-orders", label: "Work Orders", requiresConfirmation: false, summary: "Navigate to Work Orders." }
  }
  if (/\b(dispatch|map|scheduling)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/dispatch", label: "Dispatch & Map", requiresConfirmation: false, summary: "Navigate to Dispatch & Map." }
  }
  if (/\b(calendar|schedule)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/calendar", label: "Calendar", requiresConfirmation: false, summary: "Navigate to Calendar." }
  }
  if (/\b(sketches|sketch|daily\s+sketch|notes)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/sketches", label: "Daily Sketch & Notes", requiresConfirmation: false, summary: "Navigate to Daily Sketch & Notes." }
  }
  if (/\b(invoices|payments|billing)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/payments", label: "Invoices & Payments", requiresConfirmation: false, summary: "Navigate to Invoices & Payments." }
  }
  if (/\b(settings|company\s+profile|rates|rate\s+card)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/settings", label: "Settings", requiresConfirmation: false, summary: "Navigate to Settings." }
  }
  if (/\b(help|guides|help\s+center|tutorials)\b/i.test(norm)) {
    return { type: "NAVIGATE", destination: "/help", label: "Help Center", requiresConfirmation: false, summary: "Navigate to Help Center." }
  }

  return null
}

/**
 * Master parser: receives raw speech transcript and returns the recognized intent and entity payload.
 */
export function parseVoiceCommand(rawTranscript: string): ParsedVoiceResult {
  const cleaned = rawTranscript.trim()
  if (!cleaned) {
    return {
      action: { type: "DICTATE_TEXT", text: "", requiresConfirmation: false, summary: "No speech recognized." },
      rawTranscript: "",
      confidence: 0,
    }
  }

  // 1. Walkthrough Estimating (Add Room)
  const addRoom = parseAddRoomCommand(cleaned)
  if (addRoom) {
    return { action: addRoom, rawTranscript: cleaned, confidence: 0.95 }
  }

  // 2. Lead Creation
  const createLead = parseCreateLeadCommand(cleaned)
  if (createLead) {
    return { action: createLead, rawTranscript: cleaned, confidence: 0.9 }
  }

  // 3. Customer Notes
  const customerNote = parseCustomerNoteCommand(cleaned)
  if (customerNote) {
    return { action: customerNote, rawTranscript: cleaned, confidence: 0.9 }
  }

  // 4. Scheduling Appointments
  const schedule = parseScheduleAppointmentCommand(cleaned)
  if (schedule) {
    return { action: schedule, rawTranscript: cleaned, confidence: 0.9 }
  }

  // 5. CRM Record Updates & Follow-ups
  const crmUpdate = parseUpdateCrmCommand(cleaned)
  if (crmUpdate) {
    return { action: crmUpdate, rawTranscript: cleaned, confidence: 0.9 }
  }

  // 6. Document Generation
  const docGen = parseGenerateDocumentCommand(cleaned)
  if (docGen) {
    return { action: docGen, rawTranscript: cleaned, confidence: 0.95 }
  }

  // 7. Navigation
  const nav = parseNavigationCommand(cleaned)
  if (nav) {
    return { action: nav, rawTranscript: cleaned, confidence: 0.95 }
  }

  // 8. Fallback to freeform dictation
  return {
    action: {
      type: "DICTATE_TEXT",
      text: cleaned,
      requiresConfirmation: false,
      summary: `Dictated note: "${cleaned}"`,
    },
    rawTranscript: cleaned,
    confidence: 0.7,
  }
}
