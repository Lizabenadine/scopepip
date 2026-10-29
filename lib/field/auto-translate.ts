import { PAINTING_TERMS, translatePainting } from "./terms.ts"

const MAX_CHARS = 800

const KNOWN = new Set(
  PAINTING_TERMS.flatMap((term) => term.en.toLowerCase().split(/[^a-z]+/)).filter((word) => word.length >= 4),
)

export function needsRemoteTranslation(english: string, spanish: string): boolean {
  const words = english.toLowerCase().match(/[a-z]{4,}/g) ?? []
  const after = spanish.toLowerCase()
  return words.some((word) => after.includes(word) && !KNOWN.has(word))
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

async function googleTranslate(text: string, key: string, fetchImpl: FetchLike): Promise<string | null> {
  try {
    const response = await fetchImpl(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: text, source: "en", target: "es", format: "text" }),
      },
    )
    if (!response.ok) return null
    const body = (await response.json()) as { data?: { translations?: { translatedText?: string }[] } }
    const translated = readText(body.data?.translations?.[0]?.translatedText)
    return translated || null
  } catch {
    return null
  }
}

async function openAiTranslate(text: string, key: string, fetchImpl: FetchLike): Promise<string | null> {
  try {
    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Translate painting estimate notes from English to Spanish for a crew in the United States. Keep names, addresses, and numbers. Reply with the Spanish only.",
          },
          { role: "user", content: text },
        ],
      }),
    })
    if (!response.ok) return null
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    const translated = readText(body.choices?.[0]?.message?.content)
    return translated || null
  } catch {
    return null
  }
}

async function myMemoryTranslate(text: string, fetchImpl: FetchLike): Promise<string | null> {
  try {
    const response = await fetchImpl(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`,
    )
    if (!response.ok) return null
    const body = (await response.json()) as { responseData?: { translatedText?: string } }
    const translated = readText(body.responseData?.translatedText)
    if (!translated || /MYMEMORY WARNING/i.test(translated) || translated.toLowerCase() === text.toLowerCase()) return null
    return translated
  } catch {
    return null
  }
}

/** Spanish to store beside an estimator note. A configured API wins. The painting dictionary covers the rest. */
export async function translateToSpanish(text: string, fetchImpl: FetchLike = fetch): Promise<string> {
  const trimmed = text.trim().slice(0, MAX_CHARS)
  if (!trimmed) return ""
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim()
  if (googleKey) {
    const remote = await googleTranslate(trimmed, googleKey, fetchImpl)
    if (remote) return remote
  }
  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  if (openAiKey) {
    const remote = await openAiTranslate(trimmed, openAiKey, fetchImpl)
    if (remote) return remote
  }
  const local = translatePainting(trimmed, "es")
  if (!needsRemoteTranslation(trimmed, local)) return local
  const remote = await myMemoryTranslate(trimmed, fetchImpl)
  return remote || local
}
