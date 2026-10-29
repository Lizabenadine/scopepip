export const FIELD_LANGUAGES = ["en", "es"] as const

export type FieldLanguage = (typeof FIELD_LANGUAGES)[number]

export const FIELD_LANGUAGE_KEY = "scopepipe.fieldLanguage"

export function readFieldLanguage(): FieldLanguage {
  if (typeof window === "undefined") return "en"
  return window.localStorage.getItem(FIELD_LANGUAGE_KEY) === "es" ? "es" : "en"
}

export function writeFieldLanguage(language: FieldLanguage): void {
  window.localStorage.setItem(FIELD_LANGUAGE_KEY, language)
  window.dispatchEvent(new Event("scopepipe-field-language"))
}

export function fieldLocale(language: FieldLanguage): string {
  return language === "es" ? "es-US" : "en-US"
}
