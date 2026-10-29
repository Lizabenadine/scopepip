import type { FieldLanguage } from "./language.ts"

/** Painting words and the phrases that use them. Longer phrases are matched first. */
export const PAINTING_TERMS: { en: string; es: string }[] = [
  { en: "drywall walls painted the full number of coats", es: "paredes de tablaroca pintadas con todas las manos" },
  { en: "wood walls painted the full number of coats", es: "paredes de madera pintadas con todas las manos" },
  { en: "masonry walls painted the full number of coats", es: "paredes de mampostería pintadas con todas las manos" },
  { en: "metal walls painted the full number of coats", es: "paredes de metal pintadas con todas las manos" },
  { en: "walls painted the full number of coats", es: "paredes pintadas con todas las manos" },
  { en: "ceiling painted the full number of coats", es: "techo pintado con todas las manos" },
  { en: "baseboards brushed the full number of coats", es: "rodapiés pintados con todas las manos" },
  { en: "patching, sanding, caulking, and masking", es: "resane, lijado, calafateo y enmascarado" },
  { en: "the crew work order is with your painter", es: "la orden de trabajo de la cuadrilla está con su pintor" },
  { en: "painted the full number of coats", es: "pintado con todas las manos" },
  { en: "deposit paid / scheduled", es: "depósito pagado / programado" },
  { en: "baseboard and casing", es: "rodapié y marco" },
  { en: "deposit required", es: "depósito requerido" },
  { en: "primary bedroom", es: "dormitorio principal" },
  { en: "optional add-ons", es: "extras opcionales" },
  { en: "included items", es: "partidas incluidas" },
  { en: "additional items", es: "partidas adicionales" },
  { en: "pressure washing", es: "lavado a presión" },
  { en: "closet shelves", es: "repisas del clóset" },
  { en: "cabinet doors", es: "puertas de gabinete" },
  { en: "window frames", es: "marcos de ventana" },
  { en: "door & frame, 1 side", es: "puerta y marco, 1 lado" },
  { en: "door and frame", es: "puerta y marco" },
  { en: "surface prep", es: "preparación de superficie" },
  { en: "standard prep", es: "preparación estándar" },
  { en: "waiting room", es: "sala de espera" },
  { en: "cabinet paint", es: "pintura para gabinetes" },
  { en: "ceiling paint", es: "pintura para techo" },
  { en: "accent wall", es: "pared de acento" },
  { en: "trim package", es: "paquete de moldura" },
  { en: "living room", es: "sala" },
  { en: "trim paint", es: "pintura para moldura" },
  { en: "wall paint", es: "pintura para paredes" },
  { en: "pay deposit", es: "pagar depósito" },
  { en: "sq ft walls", es: "pies cuadrados de pared" },
  { en: "medium prep", es: "preparación media" },
  { en: "heavy prep", es: "preparación fuerte" },
  { en: "light prep", es: "preparación ligera" },
  { en: "high access", es: "acceso alto" },
  { en: "work order", es: "orden de trabajo" },
  { en: "hall wall", es: "pared del pasillo" },
  { en: "sq ft", es: "pies cuadrados" },
  { en: "caulking", es: "calafateo" },
  { en: "sanding", es: "lijado" },
  { en: "bedroom", es: "dormitorio" },
  { en: "drywall", es: "tablaroca" },
  { en: "deposit", es: "depósito" },
  { en: "ceiling", es: "techo" },
  { en: "primer", es: "imprimación" },
  { en: "walls", es: "paredes" },
  { en: "prime", es: "imprimación" },
  { en: "coats", es: "manos" },
  { en: "caulk", es: "calafateo" },
  { en: "prep", es: "preparación" },
  { en: "coat", es: "mano" },
  { en: "trim", es: "moldura" },
]

const ordered = [...PAINTING_TERMS].sort((left, right) => right.en.length - left.en.length)

const termPattern = new RegExp(
  ordered
    .map((term) => `(?<![A-Za-z])${term.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`)
    .join("|"),
  "gi",
)

function matchCase(source: string, translated: string): string {
  if (source === source.toLocaleUpperCase("en-US") && source !== source.toLocaleLowerCase("en-US")) {
    return translated.toLocaleUpperCase("es-US")
  }
  if (source[0] === source[0]?.toLocaleUpperCase("en-US")) {
    return `${translated[0]?.toLocaleUpperCase("es-US") ?? ""}${translated.slice(1)}`
  }
  return translated
}

/** Swap known painting words on a proposal line or a crew sheet. Names and prices stay put. */
export function translatePainting(text: string, language: FieldLanguage): string {
  if (language === "en" || !text) return text
  return text.replace(termPattern, (match) => {
    const term = ordered.find((item) => item.en.toLowerCase() === match.toLowerCase())
    return term ? matchCase(match, term.es) : match
  })
}

/** Prefer the Spanish saved beside the English. Otherwise use the painting dictionary. */
export function paintingText(english: string, stored: string | undefined, language: FieldLanguage): string {
  if (language !== "es") return english
  const saved = stored?.trim()
  if (saved) return saved
  return translatePainting(english, "es")
}
