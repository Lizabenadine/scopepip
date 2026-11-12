import assert from "node:assert/strict"
import { describe, it } from "node:test"

function appendDictatedTranscript(currentNotes: string, transcript: string): string {
  const cleanTranscript = transcript.trim()
  if (!cleanTranscript) return currentNotes
  const trimmedCurrent = currentNotes.trim()
  if (!trimmedCurrent) return cleanTranscript
  return `${trimmedCurrent} ${cleanTranscript}`
}

describe("Voice-to-Text Estimator Notes Integration", () => {
  it("appends transcribed speech to an empty notes field", () => {
    const result = appendDictatedTranscript("", "Two coats of semi-gloss on master bedroom trim.")
    assert.equal(result, "Two coats of semi-gloss on master bedroom trim.")
  })

  it("appends transcribed speech cleanly to existing notes with proper spacing", () => {
    const initial = "Patch drywall near entry."
    const dictated = "Prime bare spots before first coat."
    const result = appendDictatedTranscript(initial, dictated)
    assert.equal(result, "Patch drywall near entry. Prime bare spots before first coat.")
  })

  it("handles whitespace and multiline notes gracefully", () => {
    const initial = "Living Room:\n- Paint walls Revere Pewter"
    const dictated = "Customer wants matte finish instead of eggshell."
    const result = appendDictatedTranscript(initial, dictated)
    assert.equal(result, "Living Room:\n- Paint walls Revere Pewter Customer wants matte finish instead of eggshell.")
  })

  it("safely ignores empty or whitespace-only transcriptions", () => {
    const initial = "Existing notes text."
    const result = appendDictatedTranscript(initial, "   ")
    assert.equal(result, initial)
  })
})
