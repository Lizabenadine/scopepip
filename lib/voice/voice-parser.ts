/**
 * Natural Language Voice Command Parser for Painting Contractors.
 * 
 * Parses hands-free walkthrough estimating, lead creation, customer notes,
 * appointment scheduling, follow-ups, document generation, and navigation.
 */

import type { RateBasis } from "@/lib/types"

export type VoiceIntentType =
  | "ADD_ROOM"
  | "UPDATE_ROOM"
  | "ADD_SURFACE"
  | "REMOVE_SURFACE"
  | "ADD_JOB_NOTE"
  | "CLARIFY"
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
  itemCount?: number
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

export interface AddSurfaceAction {
  type: "ADD_SURFACE"
  surfaceName: string
  rateId: string
  category: "Exterior" | "Interior" | "Custom"
  linearFt?: number
  sqft?: number
  count?: number
  lengthFt?: number
  widthFt?: number
  heightFt?: number
  coatCount: number
  isOneOff?: boolean
  oneOffBasis?: RateBasis
  oneOffSpeed?: number
  requiresConfirmation: boolean
  summary: string
}

export interface RemoveSurfaceAction {
  type: "REMOVE_SURFACE"
  surfaceKeyword: string
  roomName?: string
  requiresConfirmation: boolean
  summary: string
}

export interface UpdateRoomAction {
  type: "UPDATE_ROOM"
  roomName: string
  openingsToAdd?: VoiceOpeningSpec[]
  surfacesToAdd?: VoiceSurfaceSpec[]
  surfacesToSet?: VoiceSurfaceSpec[]
  lengthFt?: number
  widthFt?: number
  heightFt?: number
  requiresConfirmation: boolean
  summary: string
}

export interface AddJobNoteAction {
  type: "ADD_JOB_NOTE"
  noteType: "job" | "crew"
  text: string
  requiresConfirmation: boolean
  summary: string
}

export interface ClarifyAction {
  type: "CLARIFY"
  prompt: string
  missingField: "roomName" | "dimensions" | "linearFt" | "itemCount" | "widthFt" | "customMeasurements"
  context?: {
    entityKind: "room" | "exterior_surface" | "custom_surface"
    name: string
    rateId?: string
    surfaces?: VoiceSurfaceSpec[]
    openings?: VoiceOpeningSpec[]
    lengthFt?: number
    widthFt?: number
    heightFt?: number
    linearFt?: number
    sqft?: number
    count?: number
    step?: number
    isOneOff?: boolean
    oneOffBasis?: RateBasis
    oneOffSpeed?: number
  }
  partialRoom?: {
    roomName?: string
    lengthFt?: number
    widthFt?: number
    heightFt?: number
    surfaces?: VoiceSurfaceSpec[]
    openings?: VoiceOpeningSpec[]
  }
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
  | UpdateRoomAction
  | AddSurfaceAction
  | RemoveSurfaceAction
  | AddJobNoteAction
  | ClarifyAction
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
 * Known room names sorted longest-first so "master bedroom" is matched before "bedroom".
 */
export const KNOWN_ROOM_NAMES = [
  "master bedroom",
  "primary bedroom",
  "guest bedroom",
  "master bathroom",
  "master bath",
  "guest bathroom",
  "half bathroom",
  "half bath",
  "powder room",
  "living room",
  "family room",
  "dining room",
  "formal dining room",
  "breakfast nook",
  "laundry room",
  "utility room",
  "mud room",
  "mudroom",
  "bonus room",
  "game room",
  "sun room",
  "sunroom",
  "walk-in closet",
  "home office",
  "front porch",
  "back porch",
  "screened porch",
  "bedroom 1",
  "bedroom 2",
  "bedroom 3",
  "bedroom 4",
  "bedroom 5",
  "bath 1",
  "bath 2",
  "bath 3",
  "bedroom",
  "kitchen",
  "bathroom",
  "bath",
  "hallway",
  "hall",
  "entryway",
  "entry",
  "foyer",
  "corridor",
  "office",
  "den",
  "study",
  "library",
  "basement",
  "attic",
  "garage",
  "patio",
  "deck",
  "porch",
  "closet",
  "pantry",
  "stairway",
  "stairs",
  "stairwell",
  "exterior",
  "siding",
  "cabinets",
]

/**
 * Parses walkthrough estimating command:
 * Works regardless of natural speaking order:
 * e.g. "Add living room, 15 by 20, walls and ceiling"
 * "15 x 15 walls and ceilings living room"
 * "15 by 15 walls and ceilings living room"
 * "12 by 14 master bedroom two coats walls"
 * "Living room 15 by 20 walls and ceiling"
 * "15 x 15 walls and ceiling" (Clarification: missing room name)
 * "Add living room" (Clarification: missing dimensions)
 */
export function parseAddRoomCommand(transcript: string): AddRoomAction | ClarifyAction | null {
  const normalized = normalizeSpokenNumbers(transcript)

  // Explicitly ignore lead, customer, appointment, note, navigation commands
  if (/\b(?:lead|customer|client|appointment|visit|meeting|note|follow-?up|go\s+to|navigate\s+to)\b/i.test(normalized)) {
    return null
  }

  // 1. Dimensions extraction
  // Handles: "15 x 15", "15 by 15", "15*15", "15 by 20 by 9", "12 feet by 14 feet", "12' x 14'"
  const dimRegex = /\b(\d+(?:\.\d+)?)\s*(?:ft|feet|'|foot)?\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)(?:\s*(?:ft|feet|'|foot)?\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?))?(?:\s*(?:ft|feet|'|foot))?\b/i
  const dimMatch = normalized.match(dimRegex)

  let lengthFt = 0
  let widthFt = 0
  let heightFt = 8 // Scopepipe default residential height

  if (dimMatch) {
    lengthFt = parseFloat(dimMatch[1])
    widthFt = parseFloat(dimMatch[2])
    if (dimMatch[3]) {
      heightFt = parseFloat(dimMatch[3])
    }
  }

  // Check for standalone ceiling height: "9 foot ceiling", "ceiling 10 ft", "height 9"
  const ceilingHeightRegex = /(?:(\d+(?:\.\d+)?)\s*(?:ft|foot|feet|')?\s*(?:ceiling|ceilings|height)|(?:ceiling|ceilings|height)\s*(?:of|is|at)?\s*(\d+(?:\.\d+)?))/i
  const ceilingMatch = normalized.match(ceilingHeightRegex)
  if (ceilingMatch) {
    const val = ceilingMatch[1] || ceilingMatch[2]
    if (val) heightFt = parseFloat(val)
  }

  // 2. Room Name extraction
  let roomName: string | null = null

  // Search for known room names in the transcript
  for (const known of KNOWN_ROOM_NAMES) {
    const reg = new RegExp(`\\b${known}\\b`, "i")
    if (reg.test(normalized)) {
      roomName = titleCase(known)
      break
    }
  }

  // If not in known list, check for explicit add/create/walk pattern
  if (!roomName) {
    const addPrefixRegex = /\b(?:add|create|new|walk)\s+(?:a\s+|the\s+)?([a-z0-9\s'-]+?)(?:,|\s+(?:measuring|size|dimensions?|at|\d|with|\bft\b|\bby\b|\bx\b|$))/i
    const prefixMatch = normalized.match(addPrefixRegex)
    if (prefixMatch) {
      const candidate = prefixMatch[1].trim()
      if (candidate && !/^(?:room|area|measurements?|dimensions?)$/i.test(candidate)) {
        roomName = titleCase(candidate)
      }
    }
  }

  // 3. Coat count extraction: "two coats", "1 coat", "prime and 2 coats"
  let coatCount = 2 // Standard default
  const coatRegex = /(\d+)\s*(?:coat|coats)\b/i
  const coatMatch = normalized.match(coatRegex)
  if (coatMatch) {
    coatCount = Math.max(1, parseInt(coatMatch[1], 10))
  }

  // 4. Surfaces extraction: walls, ceiling, baseboards, doors, trim, crown molding, siding, cabinets
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
    const anySurfaceMentioned = hasWalls || hasCeiling || hasBaseboards || hasTrim || hasCrown || hasSiding || hasCabinets
    if (anySurfaceMentioned) {
      if (hasWalls) surfaces.push({ rateId: "walls", label: "Walls", coatCount })
      if (hasCeiling) surfaces.push({ rateId: "ceiling", label: "Ceiling", coatCount })
      if (hasBaseboards) surfaces.push({ rateId: "baseboards", label: "Baseboards", coatCount })
      if (hasTrim && !hasBaseboards) surfaces.push({ rateId: "baseboards", label: "Trim", coatCount })
      if (hasCrown) surfaces.push({ rateId: "crown", label: "Crown Molding", coatCount })
      if (hasSiding) surfaces.push({ rateId: "siding", label: "Siding", coatCount })
      if (hasCabinets) surfaces.push({ rateId: "cabinet-doors", label: "Cabinets", coatCount })
    } else {
      // If no surfaces explicitly named, supply standard room surfaces
      if (roomName && roomName.toLowerCase().includes("exterior")) {
        surfaces.push({ rateId: "siding", label: "Siding", coatCount })
      } else if (roomName && roomName.toLowerCase().includes("cabinet")) {
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

  // 5. Openings extraction: doors and windows
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

  const hasDimensions = lengthFt > 0 && widthFt > 0

  // 6. Action determination:
  // Case A: Complete room with both name and dimensions
  if (roomName && hasDimensions) {
    const surfaceSummary = surfaces.map((s) => `${s.label} (${s.coatCount} coats)`).join(", ")
    const openingsSummary = openings.length > 0 ? `, Openings: ${openings.map((o) => `${o.count} ${o.kind}s`).join(", ")}` : ""
    const dimSummary = ` (${lengthFt}' × ${widthFt}' × ${heightFt}')`

    return {
      type: "ADD_ROOM",
      roomName,
      lengthFt,
      widthFt,
      heightFt,
      surfaces,
      openings,
      requiresConfirmation: false,
      summary: `Add ${roomName}${dimSummary} with ${surfaceSummary}${openingsSummary}.`,
    }
  }

  // Case B: Dimensions given, but NO room name spoken (e.g. "15 x 15 walls and ceilings")
  if (hasDimensions && !roomName) {
    const surfaceLabels = surfaces.map((s) => s.label).join(", ")
    return {
      type: "CLARIFY",
      missingField: "roomName",
      prompt: `Got ${lengthFt}' × ${widthFt}' (${heightFt}' ceiling) with ${surfaceLabels}. Which room is this for (e.g. Living Room, Bedroom, Kitchen)?`,
      partialRoom: { lengthFt, widthFt, heightFt, surfaces, openings },
      requiresConfirmation: false,
      summary: `Need room name for ${lengthFt}' × ${widthFt}' area.`,
    }
  }

  // Case C: Room name given with estimating intent, but NO dimensions spoken (e.g. "Add living room" or "Living room walls and ceiling")
  const hasAddKeyword = /\b(?:add|create|new|walk)\b/i.test(normalized)
  const hasSurfaceKeyword = hasWalls || hasCeiling || hasBaseboards || hasTrim || hasCrown || hasSiding || hasCabinets
  if (roomName && !hasDimensions && (hasAddKeyword || hasSurfaceKeyword)) {
    const surfaceLabels = surfaces.map((s) => s.label).join(", ")
    return {
      type: "CLARIFY",
      missingField: "dimensions",
      prompt: `Adding ${roomName} with ${surfaceLabels}. What are the dimensions (e.g. 15 by 20)?`,
      partialRoom: { roomName, surfaces, openings, heightFt },
      requiresConfirmation: false,
      summary: `Need dimensions for ${roomName}.`,
    }
  }

  return null
}

/**
 * Resolves a spoken room phrase into a clean room title.
 */
export function resolveRoomName(raw: string): string | null {
  const cleaned = raw.replace(/[.,!?;:]+$/, "").trim().toLowerCase()
  for (const known of KNOWN_ROOM_NAMES) {
    if (cleaned === known) {
      return titleCase(known)
    }
  }
  for (const known of KNOWN_ROOM_NAMES) {
    if (new RegExp(`\\b${known}\\b`, "i").test(cleaned)) {
      return titleCase(known)
    }
  }
  for (const known of KNOWN_ROOM_NAMES) {
    if (cleaned.includes(known) || known.includes(cleaned)) {
      return titleCase(known)
    }
  }
  if (cleaned.length >= 3 && !/^(?:room|area|estimate|job|wall|walls|ceiling|ceilings|door|doors|window|windows)$/i.test(cleaned)) {
    return titleCase(cleaned)
  }
  return null
}

/**
 * Parses follow-up commands to add doors, windows, surfaces, or adjust measurements on an existing room:
 * e.g. "Add two doors to the living room", "Add 3 windows to kitchen", "Add baseboards to living room",
 * "Set living room ceiling height to 10 feet", "Set living room to 16 by 20"
 */
export function parseUpdateRoomCommand(transcript: string): UpdateRoomAction | null {
  const norm = normalizeSpokenNumbers(transcript).trim()

  // 1. Check dimension/ceiling height adjustments:
  // e.g. "Set living room ceiling height to 10 feet" or "Change living room height to 10 feet"
  const heightRegex = /\b(?:set|change|make|update)\s+(?:the\s+)?([a-z0-9\s'-]+?)\s+(?:ceiling\s+height|height)\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:ft|feet|'|foot)?\b/i
  const heightMatch = norm.match(heightRegex)
  if (heightMatch) {
    const rawRoom = heightMatch[1].trim()
    const heightFt = parseFloat(heightMatch[2])
    const roomName = resolveRoomName(rawRoom)
    if (roomName && heightFt > 0) {
      return {
        type: "UPDATE_ROOM",
        roomName,
        heightFt,
        requiresConfirmation: false,
        summary: `Set ${roomName} ceiling height to ${heightFt}'.`,
      }
    }
  }

  // e.g. "Set living room dimensions to 16 by 20" or "Change living room to 16 by 20" or "Change the bedroom walls to 15 by 20"
  const dimUpdateRegex = /\b(?:set|change|update)\s+(?:the\s+)?([a-z0-9\s'-]+?)(?:\s+(?:dimensions?|size|walls?))?\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:ft|feet|'|foot)?\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)\b/i
  const dimMatch = norm.match(dimUpdateRegex)
  if (dimMatch) {
    const rawRoom = dimMatch[1].trim()
    const lengthFt = parseFloat(dimMatch[2])
    const widthFt = parseFloat(dimMatch[3])
    const roomName = resolveRoomName(rawRoom)
    if (roomName && lengthFt > 0 && widthFt > 0) {
      return {
        type: "UPDATE_ROOM",
        roomName,
        lengthFt,
        widthFt,
        requiresConfirmation: false,
        summary: `Set ${roomName} dimensions to ${lengthFt}' × ${widthFt}'.`,
      }
    }
  }

  // e.g. "The living room needs walls and ceilings" or "Living room needs walls and ceiling"
  const needsMatch = norm.match(/(?:the\s+)?([a-z0-9\s'-]+?)\s+(?:needs|takes|gets|has)\s+(.+)/i)
  if (needsMatch) {
    const rawRoom = needsMatch[1].trim()
    const rawSurfaces = needsMatch[2].trim()
    const roomName = resolveRoomName(rawRoom)
    if (roomName) {
      const surfaces: VoiceSurfaceSpec[] = []
      let coatCount = 2
      const coatMatch = rawSurfaces.match(/(\d+)\s*(?:coat|coats)\b/i)
      if (coatMatch) coatCount = parseInt(coatMatch[1], 10)

      if (/\b(walls?|wall)\b/i.test(rawSurfaces)) surfaces.push({ rateId: "walls", label: "Walls", coatCount })
      if (/\b(ceilings?|ceiling)\b/i.test(rawSurfaces)) surfaces.push({ rateId: "ceiling", label: "Ceiling", coatCount })
      if (/\b(baseboards?|baseboard)\b/i.test(rawSurfaces)) surfaces.push({ rateId: "baseboards", label: "Baseboards", coatCount })
      if (/\b(trim|casings?)\b/i.test(rawSurfaces) && !/\bbaseboards?\b/i.test(rawSurfaces)) surfaces.push({ rateId: "baseboards", label: "Trim", coatCount })
      if (/\b(crown|crown molding)\b/i.test(rawSurfaces)) surfaces.push({ rateId: "crown", label: "Crown Molding", coatCount })
      if (/\b(siding)\b/i.test(rawSurfaces)) surfaces.push({ rateId: "siding", label: "Siding", coatCount })
      if (/\b(cabinets?|cabinet doors?)\b/i.test(rawSurfaces)) surfaces.push({ rateId: "cabinet-doors", label: "Cabinets", coatCount })

      if (surfaces.length > 0) {
        return {
          type: "UPDATE_ROOM",
          roomName,
          surfacesToSet: surfaces,
          surfacesToAdd: surfaces,
          requiresConfirmation: false,
          summary: `Set ${roomName} surfaces to ${surfaces.map((s) => s.label).join(" and ")}.`,
        }
      }
    }
  }

  // 2. Check "Add [items] to/in/for [room]"
  // e.g. "Add two doors to the living room", "Add 3 windows in kitchen", "Add baseboards to living room"
  const addToRoomRegex = /\b(?:add|include|put|install)\s+(.+?)\s+(?:to|in|into|for)\s+(?:the\s+)?([a-z0-9\s'-]+)$/i
  const addMatch = norm.match(addToRoomRegex)
  if (!addMatch) return null

  const itemsPart = addMatch[1].trim()
  const rawRoom = addMatch[2].trim()

  // Make sure itemsPart is not another full room definition with dimensions (which belongs to ADD_ROOM)
  if (/\b\d+\s*(?:x|by|\*)\s*\d+\b/i.test(itemsPart)) {
    return null
  }

  const roomName = resolveRoomName(rawRoom)
  if (!roomName) return null

  // Extract openings from itemsPart
  const openings: VoiceOpeningSpec[] = []
  // Doors
  const doorsRegex = /(\d+)\s*(?:door|doors)\b/i
  const doorsMatch = itemsPart.match(doorsRegex)
  if (doorsMatch) {
    openings.push({ kind: "door", count: parseInt(doorsMatch[1], 10) })
  } else if (/\ba\s+door\b/i.test(itemsPart)) {
    openings.push({ kind: "door", count: 1 })
  }

  // Windows
  const windowsRegex = /(\d+)\s*(?:window|windows)\b/i
  const windowsMatch = itemsPart.match(windowsRegex)
  if (windowsMatch) {
    openings.push({ kind: "window", count: parseInt(windowsMatch[1], 10) })
  } else if (/\ba\s+window\b/i.test(itemsPart)) {
    openings.push({ kind: "window", count: 1 })
  }

  // Extract surfaces from itemsPart
  const surfaces: VoiceSurfaceSpec[] = []
  let coatCount = 2
  const coatMatch = itemsPart.match(/(\d+)\s*(?:coat|coats)\b/i)
  if (coatMatch) coatCount = parseInt(coatMatch[1], 10)

  if (/\b(walls?|wall)\b/i.test(itemsPart)) surfaces.push({ rateId: "walls", label: "Walls", coatCount })
  if (/\b(ceilings?|ceiling)\b/i.test(itemsPart)) surfaces.push({ rateId: "ceiling", label: "Ceiling", coatCount })
  if (/\b(baseboards?|baseboard)\b/i.test(itemsPart)) surfaces.push({ rateId: "baseboards", label: "Baseboards", coatCount })
  if (/\b(trim|casings?)\b/i.test(itemsPart) && !/\bbaseboards?\b/i.test(itemsPart)) surfaces.push({ rateId: "baseboards", label: "Trim", coatCount })
  if (/\b(crown|crown molding)\b/i.test(itemsPart)) surfaces.push({ rateId: "crown", label: "Crown Molding", coatCount })
  if (/\b(siding)\b/i.test(itemsPart)) surfaces.push({ rateId: "siding", label: "Siding", coatCount })
  if (/\b(cabinets?|cabinet doors?)\b/i.test(itemsPart)) surfaces.push({ rateId: "cabinet-doors", label: "Cabinets", coatCount })

  if (openings.length === 0 && surfaces.length === 0) {
    return null
  }

  const itemsList: string[] = []
  if (openings.length > 0) {
    itemsList.push(...openings.map((o) => `${o.count} ${o.kind}${o.count > 1 ? "s" : ""}`))
  }
  if (surfaces.length > 0) {
    itemsList.push(...surfaces.map((s) => s.label))
  }

  return {
    type: "UPDATE_ROOM",
    roomName,
    openingsToAdd: openings.length > 0 ? openings : undefined,
    surfacesToAdd: surfaces.length > 0 ? surfaces : undefined,
    requiresConfirmation: false,
    summary: `Add ${itemsList.join(" and ")} to ${roomName}.`,
  }
}

/**
 * Known exterior surface definitions and templates.
 */
export interface ExteriorSurfaceDef {
  id: string
  name: string
  aliases: string[]
  unit: "lnft" | "sqft" | "items"
  rateId: string
  askWidth?: boolean
}

export const EXTERIOR_SURFACE_DEFS: ExteriorSurfaceDef[] = [
  {
    id: "eaves",
    name: "Exterior Eaves",
    aliases: ["exterior eaves", "exterior eave", "eaves", "eave"],
    unit: "lnft",
    rateId: "eaves",
    askWidth: true,
  },
  {
    id: "fascia",
    name: "Fascia Boards",
    aliases: ["fascia boards", "fascia board", "fascia", "fascias"],
    unit: "lnft",
    rateId: "fascia",
  },
  {
    id: "soffit",
    name: "Soffits",
    aliases: ["exterior soffits", "exterior soffit", "soffits", "soffit"],
    unit: "sqft",
    rateId: "soffit",
  },
  {
    id: "gutters",
    name: "Gutters and Downspouts",
    aliases: ["gutters and downspouts", "downspouts", "downspout", "gutters", "gutter"],
    unit: "lnft",
    rateId: "gutters",
  },
  {
    id: "garage-doors",
    name: "Garage Doors",
    aliases: ["garage doors", "garage door"],
    unit: "items",
    rateId: "garage-doors",
  },
  {
    id: "entry-doors",
    name: "Entry Doors",
    aliases: ["entry doors", "entry door", "front doors", "front door", "exterior doors", "exterior door"],
    unit: "items",
    rateId: "entry-door",
  },
  {
    id: "siding",
    name: "Exterior Siding",
    aliases: ["exterior siding", "siding", "lap siding", "wood siding"],
    unit: "sqft",
    rateId: "siding",
  },
  {
    id: "stucco",
    name: "Stucco",
    aliases: ["stucco siding", "stucco"],
    unit: "sqft",
    rateId: "stucco",
  },
  {
    id: "exterior-trim",
    name: "Exterior Trim",
    aliases: ["exterior trim", "corner boards", "corner board", "window and door trim", "outside trim"],
    unit: "lnft",
    rateId: "exterior-trim",
  },
  {
    id: "shutters",
    name: "Shutters",
    aliases: ["shutters", "shutter"],
    unit: "items",
    rateId: "shutters",
  },
  {
    id: "deck",
    name: "Deck",
    aliases: ["deck stain", "decks", "deck"],
    unit: "sqft",
    rateId: "deck",
  },
  {
    id: "porch",
    name: "Porch",
    aliases: ["porch floor", "porch ceiling", "porches", "porch"],
    unit: "sqft",
    rateId: "porch",
  },
  {
    id: "railings",
    name: "Railings",
    aliases: ["deck railing", "deck railings", "handrail", "handrails", "railings", "railing"],
    unit: "lnft",
    rateId: "railings",
  },
  {
    id: "fence",
    name: "Fence",
    aliases: ["fence stain", "fences", "fence"],
    unit: "sqft",
    rateId: "fence",
  },
]

/**
 * Parses negative surface requests such as "Don't include the trim", "No baseboards", "Exclude ceiling"
 */
export function parseRemoveSurfaceCommand(transcript: string): RemoveSurfaceAction | null {
  const norm = normalizeSpokenNumbers(transcript).replace(/[.,!?;:]+$/, "").trim().toLowerCase()

  const removePatterns = [
    /\b(?:don't|do\s+not)\s+(?:include|paint|add|do|charge\s+for)\s+(?:the\s+)?([a-z0-9\s'-]+?)(?:\s+(?:in|for|from|on)\s+(?:the\s+)?([a-z0-9\s'-]+))?$/i,
    /\b(?:no|exclude|remove|skip|leave\s+out|without)\s+(?:the\s+)?([a-z0-9\s'-]+?)(?:\s+(?:in|for|from|on)\s+(?:the\s+)?([a-z0-9\s'-]+))?$/i,
  ]

  for (const pat of removePatterns) {
    const match = norm.match(pat)
    if (match) {
      const rawSurface = match[1].trim()
      const rawRoom = match[2]?.trim()

      const knownSurfaceKeywords = [
        "trim", "baseboards", "baseboard", "ceiling", "ceilings", "walls", "wall",
        "crown", "crown molding", "siding", "cabinets", "cabinet", "doors", "door",
        "windows", "window", "fascia", "eaves", "soffit", "soffits", "gutters", "shutters", "railings", "fence", "stucco"
      ]

      const foundKeyword = knownSurfaceKeywords.find(
        (k) => rawSurface === k || rawSurface.includes(k)
      )

      if (foundKeyword) {
        const roomName = rawRoom ? resolveRoomName(rawRoom) || undefined : undefined
        return {
          type: "REMOVE_SURFACE",
          surfaceKeyword: foundKeyword,
          roomName,
          requiresConfirmation: false,
          summary: roomName
            ? `Exclude ${foundKeyword} from ${roomName}.`
            : `Exclude ${foundKeyword} from current estimate.`,
        }
      }
    }
  }

  return null
}

/**
 * Parses exterior templates and unmodeled/custom painting surfaces from natural language.
 * Examples:
 * - "Exterior, we need to paint the eaves."
 * - "We need to paint the exterior eaves."
 * - "Add the fascia boards."
 * - "We're painting the soffits and gutters."
 * - "Add two garage doors."
 * - "Add pergola beams"
 * - "We need to paint the decorative columns"
 */
export function parseExteriorOrCustomSurfaceCommand(transcript: string): VoiceAction | null {
  const norm = normalizeSpokenNumbers(transcript).trim()
  const lower = norm.toLowerCase()

  // Guard: if it's explicitly a document or navigation or job note command, let those handle it
  if (/\b(?:generate|open|go\s+to|navigate|create\s+lead|schedule|customer\s+note|crew\s+note|job\s+note)\b/i.test(lower)) {
    return null
  }

  // Check if it's an exterior command or multi-surface exterior
  // e.g. "We're painting the soffits and gutters"
  const multiExteriorMatch = EXTERIOR_SURFACE_DEFS.filter((def) =>
    def.aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(lower))
  )

  if (multiExteriorMatch.length > 1) {
    // Both soffits and gutters, etc.
    const names = multiExteriorMatch.map((d) => d.name).join(" and ")
    const prompt = `Got it. How many square feet of ${multiExteriorMatch[0].name.toLowerCase()}, and linear feet of ${multiExteriorMatch[1].name.toLowerCase()}?`
    return {
      type: "CLARIFY",
      prompt,
      missingField: "linearFt",
      requiresConfirmation: false,
      summary: prompt,
      context: {
        entityKind: "exterior_surface",
        name: names,
        rateId: multiExteriorMatch[0].rateId,
        step: 1,
      },
    }
  }

  // Check single exterior surface definition
  const matchedDef = EXTERIOR_SURFACE_DEFS.find((def) =>
    def.aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(lower))
  )

  if (matchedDef) {
    // Check for measurements in the transcript
    const lnFtMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:linear\s+feet|linear\s+ft|ln\s+ft|linear|feet|foot|ft|')\b/i)
    const sqftMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:square\s+feet|square\s+ft|sq\s+ft|sqft)\b/i)
    const dimMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|'|foot)?\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)\b/i)
    const countMatch =
      norm.match(/(\d+)\s*(?:garage\s+doors?|entry\s+doors?|front\s+doors?|shutters?|doors?|items?)\b/i) ||
      norm.match(/\b(?:add|paint|include)?\s*(\d+)\s+[a-z\s'-]+/i)

    if (matchedDef.unit === "items") {
      let count = 0
      if (countMatch && parseInt(countMatch[1], 10) > 0) {
        count = parseInt(countMatch[1], 10)
      } else if (/\b(?:a|an|one)\s+(?:garage|entry|front|exterior)?\s*door\b/i.test(lower)) {
        count = 1
      }

      if (count > 0) {
        return {
          type: "ADD_SURFACE",
          surfaceName: matchedDef.name,
          rateId: matchedDef.rateId,
          category: "Exterior",
          count,
          coatCount: 2,
          requiresConfirmation: false,
          summary: `Add ${count} ${matchedDef.name} to estimate.`,
        }
      }

      // No count provided: ask
      const prompt = `How many ${matchedDef.name.toLowerCase()} are we painting?`
      return {
        type: "CLARIFY",
        prompt,
        missingField: "itemCount",
        requiresConfirmation: false,
        summary: prompt,
        context: {
          entityKind: "exterior_surface",
          name: matchedDef.name,
          rateId: matchedDef.rateId,
          step: 1,
        },
      }
    }

    if (matchedDef.unit === "lnft") {
      let linearFt = lnFtMatch ? parseFloat(lnFtMatch[1]) : undefined
      if (!linearFt && dimMatch) {
        linearFt = parseFloat(dimMatch[1])
      }

      if (linearFt && linearFt > 0) {
        // If it's eaves, check if width/depth was also spoken
        if (matchedDef.askWidth) {
          const widthMatch =
            norm.match(/(\d+(?:\.\d+)?)\s*(?:feet|foot|ft|')?\s*(?:width|depth|deep|wide)\b/i) ||
            (dimMatch ? { 1: dimMatch[2] } : null)
          if (widthMatch) {
            const widthFt = parseFloat(widthMatch[1])
            const sqft = linearFt * widthFt
            return {
              type: "ADD_SURFACE",
              surfaceName: `${matchedDef.name} (${linearFt}' × ${widthFt}' depth)`,
              rateId: matchedDef.rateId,
              category: "Exterior",
              linearFt,
              lengthFt: linearFt,
              widthFt,
              sqft,
              coatCount: 2,
              requiresConfirmation: false,
              summary: `Add ${matchedDef.name} (${linearFt}' × ${widthFt}' depth, ${linearFt} linear ft) to estimate.`,
            }
          }

          // Linear feet provided, but width/depth needed
          const prompt = "What's the width or depth of the eaves?"
          return {
            type: "CLARIFY",
            prompt,
            missingField: "widthFt",
            requiresConfirmation: false,
            summary: prompt,
            context: {
              entityKind: "exterior_surface",
              name: matchedDef.name,
              rateId: matchedDef.rateId,
              linearFt,
              step: 2,
            },
          }
        }

        return {
          type: "ADD_SURFACE",
          surfaceName: `${matchedDef.name} (${linearFt} linear ft)`,
          rateId: matchedDef.rateId,
          category: "Exterior",
          linearFt,
          coatCount: 2,
          requiresConfirmation: false,
          summary: `Add ${matchedDef.name} (${linearFt} linear ft) to estimate.`,
        }
      }

      // Linear feet not provided
      const prompt =
        matchedDef.id === "eaves"
          ? "Got it. How many linear feet?"
          : `Got it. How many linear feet of ${matchedDef.name.toLowerCase()}?`

      return {
        type: "CLARIFY",
        prompt,
        missingField: "linearFt",
        requiresConfirmation: false,
        summary: prompt,
        context: {
          entityKind: "exterior_surface",
          name: matchedDef.name,
          rateId: matchedDef.rateId,
          step: 1,
        },
      }
    }

    if (matchedDef.unit === "sqft") {
      let sqft = sqftMatch ? parseFloat(sqftMatch[1]) : undefined
      if (!sqft && dimMatch) {
        sqft = parseFloat(dimMatch[1]) * parseFloat(dimMatch[2])
      }

      if (sqft && sqft > 0) {
        return {
          type: "ADD_SURFACE",
          surfaceName: `${matchedDef.name} (${sqft} sq ft)`,
          rateId: matchedDef.rateId,
          category: "Exterior",
          sqft,
          coatCount: 2,
          requiresConfirmation: false,
          summary: `Add ${matchedDef.name} (${sqft} sq ft) to estimate.`,
        }
      }

      const prompt = `Got it. How many square feet of ${matchedDef.name.toLowerCase()}?`
      return {
        type: "CLARIFY",
        prompt,
        missingField: "dimensions",
        requiresConfirmation: false,
        summary: prompt,
        context: {
          entityKind: "exterior_surface",
          name: matchedDef.name,
          rateId: matchedDef.rateId,
          step: 1,
        },
      }
    }
  }

  // Check for unmodeled / custom painting surfaces:
  // e.g. "Add pergola beams", "We need to paint the decorative columns", "Add corbels", "Add trellises"
  const customIntentMatch = norm.match(
    /\b(?:we\s+need\s+to\s+paint|we're\s+painting|we\s+are\s+painting|let's\s+paint|paint|add|include)\s+(?:the\s+)?([a-z0-9\s',.-]+)$/i
  )

  if (customIntentMatch) {
    let candidate = customIntentMatch[1].trim()
    candidate = candidate.replace(/[.,!?;:]+$/, "").trim()
    const candLower = candidate.toLowerCase()

    // Check if it's already a known room or generic prompt
    const isRoom = KNOWN_ROOM_NAMES.some((r) => candLower === r || candLower.includes(r))
    if (!isRoom && candidate.length > 2) {
      // Check for count or measurements
      const countMatch = candidate.match(/^(\d+)\s+([a-z0-9\s'-]+)$/i)
      const lnFtMatch = candidate.match(
        /([a-z0-9\s'-]+?),\s*(\d+(?:\.\d+)?)\s*(?:linear\s+feet|linear\s+ft|ln\s+ft|feet|foot|ft|')\b/i
      )
      const sqftMatch = candidate.match(
        /([a-z0-9\s'-]+?),\s*(\d+(?:\.\d+)?)\s*(?:square\s+feet|square\s+ft|sq\s+ft|sqft)\b/i
      )

      if (countMatch) {
        const count = parseInt(countMatch[1], 10)
        const name = titleCase(countMatch[2].trim())
        return {
          type: "ADD_SURFACE",
          surfaceName: name,
          rateId: `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          category: "Custom",
          count,
          coatCount: 2,
          isOneOff: true,
          oneOffBasis: "hours_per_item",
          oneOffSpeed: 1.5,
          requiresConfirmation: false,
          summary: `Add ${count} ${name} (custom line item) to estimate.`,
        }
      }

      if (lnFtMatch) {
        const name = titleCase(lnFtMatch[1].trim())
        const linearFt = parseFloat(lnFtMatch[2])
        return {
          type: "ADD_SURFACE",
          surfaceName: `${name} (${linearFt} ln ft)`,
          rateId: `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          category: "Custom",
          linearFt,
          coatCount: 2,
          isOneOff: true,
          oneOffBasis: "lnft_per_hour",
          oneOffSpeed: 25,
          requiresConfirmation: false,
          summary: `Add ${name} (${linearFt} linear ft, custom line item) to estimate.`,
        }
      }

      if (sqftMatch) {
        const name = titleCase(sqftMatch[1].trim())
        const sqft = parseFloat(sqftMatch[2])
        return {
          type: "ADD_SURFACE",
          surfaceName: `${name} (${sqft} sq ft)`,
          rateId: `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          category: "Custom",
          sqft,
          coatCount: 2,
          isOneOff: true,
          oneOffBasis: "sqft_per_hour",
          oneOffSpeed: 100,
          requiresConfirmation: false,
          summary: `Add ${name} (${sqft} sq ft, custom line item) to estimate.`,
        }
      }

      // No measurement provided: ask short, relevant question
      const name = titleCase(candidate)
      const prompt = `Got it. How many linear feet or items for ${name}?`
      return {
        type: "CLARIFY",
        prompt,
        missingField: "customMeasurements",
        requiresConfirmation: false,
        summary: prompt,
        context: {
          entityKind: "custom_surface",
          name,
          step: 1,
        },
      }
    }
  }

  return null
}

/**
 * Parses job and crew note commands:
 * e.g. "Add job note: Customer wants matte finish", "Add crew note: Gate code 4421"
 */
export function parseJobNoteCommand(transcript: string): AddJobNoteAction | null {
  const norm = transcript.trim()

  // Crew note: e.g. "Add crew note: watch for dogs" or "Crew note: gate code 1234"
  const crewMatch = norm.match(/\b(?:add\s+)?crew\s+note\s*[:=-]?\s*(.+)/i)
  if (crewMatch && crewMatch[1].trim()) {
    const text = crewMatch[1].trim()
    return {
      type: "ADD_JOB_NOTE",
      noteType: "crew",
      text,
      requiresConfirmation: false,
      summary: `Add crew note: "${text}".`,
    }
  }

  // Job note / estimate note: e.g. "Add job note: customer wants matte finish" or "Job note: ..."
  const jobMatch = norm.match(/\b(?:add\s+)?(?:job|estimate)\s+note\s*[:=-]?\s*(.+)/i)
  if (jobMatch && jobMatch[1].trim()) {
    const text = jobMatch[1].trim()
    return {
      type: "ADD_JOB_NOTE",
      noteType: "job",
      text,
      requiresConfirmation: false,
      summary: `Add job note: "${text}".`,
    }
  }

  // "Add note to estimate: ..."
  const toEstMatch = norm.match(/\badd\s+note\s+to\s+(?:the\s+)?estimate\s*[:=-]?\s*(.+)/i)
  if (toEstMatch && toEstMatch[1].trim()) {
    const text = toEstMatch[1].trim()
    return {
      type: "ADD_JOB_NOTE",
      noteType: "job",
      text,
      requiresConfirmation: false,
      summary: `Add job note: "${text}".`,
    }
  }

  return null
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

  // 1. Job / Crew Notes
  const jobNote = parseJobNoteCommand(cleaned)
  if (jobNote) {
    return { action: jobNote, rawTranscript: cleaned, confidence: 0.95 }
  }

  // 2. Remove surface (e.g. "Don't include the trim", "No baseboards")
  const removeSurface = parseRemoveSurfaceCommand(cleaned)
  if (removeSurface) {
    return { action: removeSurface, rawTranscript: cleaned, confidence: 0.95 }
  }

  // 3. Follow-up Room Updates (doors, windows, surfaces, dimensions, "change bedroom walls to 15 by 20")
  const updateRoom = parseUpdateRoomCommand(cleaned)
  if (updateRoom) {
    return { action: updateRoom, rawTranscript: cleaned, confidence: 0.95 }
  }

  // 4. Exterior & Custom Surfaces (e.g. "Exterior, we need to paint the eaves", "Add the fascia boards", "Add two garage doors", "Add pergola beams")
  const extOrCustom = parseExteriorOrCustomSurfaceCommand(cleaned)
  if (extOrCustom) {
    return { action: extOrCustom, rawTranscript: cleaned, confidence: 0.95 }
  }

  // 5. Walkthrough Estimating (Add Room)
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
