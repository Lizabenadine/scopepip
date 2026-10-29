import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import { translateToSpanish } from "./auto-translate.ts"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("auto translate", () => {
  const previousGoogle = process.env.GOOGLE_TRANSLATE_API_KEY
  const previousOpenAi = process.env.OPENAI_API_KEY

  after(() => {
    if (previousGoogle === undefined) delete process.env.GOOGLE_TRANSLATE_API_KEY
    else process.env.GOOGLE_TRANSLATE_API_KEY = previousGoogle
    if (previousOpenAi === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previousOpenAi
  })

  it("keeps a painting phrase local when every word is already in the dictionary", async () => {
    delete process.env.GOOGLE_TRANSLATE_API_KEY
    delete process.env.OPENAI_API_KEY
    let called = false
    const spanish = await translateToSpanish("Prep the bedroom trim", async () => {
      called = true
      return jsonResponse({})
    })
    assert.equal(called, false)
    assert.equal(spanish, "Preparación the dormitorio moldura")
  })

  it("asks a translation service for a custom prep note and stores that Spanish", async () => {
    delete process.env.GOOGLE_TRANSLATE_API_KEY
    delete process.env.OPENAI_API_KEY
    const spanish = await translateToSpanish("Keep the new oak floors covered.", async (input) => {
      assert.match(String(input), /api\.mymemory\.translated\.net/)
      return jsonResponse({ responseData: { translatedText: "Mantén los pisos de roble cubiertos." } })
    })
    assert.equal(spanish, "Mantén los pisos de roble cubiertos.")
  })

  it("uses Google when that key is set", async () => {
    process.env.GOOGLE_TRANSLATE_API_KEY = "test-key"
    delete process.env.OPENAI_API_KEY
    const spanish = await translateToSpanish("Watch the north window.", async (input) => {
      assert.match(String(input), /translation\.googleapis\.com/)
      return jsonResponse({ data: { translations: [{ translatedText: "Cuida la ventana norte." }] } })
    })
    assert.equal(spanish, "Cuida la ventana norte.")
  })

  it("falls back to the dictionary when the service has nothing useful", async () => {
    delete process.env.GOOGLE_TRANSLATE_API_KEY
    delete process.env.OPENAI_API_KEY
    const spanish = await translateToSpanish("Keep the new oak floors covered.", async () => {
      return jsonResponse({ responseData: { translatedText: "MYMEMORY WARNING: query too long" } })
    })
    assert.match(spanish, /floors/)
  })
})
