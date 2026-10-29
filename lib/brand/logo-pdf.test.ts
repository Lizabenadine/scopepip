import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { textPdf } from "../proposals/pdf.ts"
import { pdfLogoFromBytes } from "./logo-pdf.ts"

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

describe("pdf logo", () => {
  it("draws a PNG logo above the company name in the proposal PDF", () => {
    const logo = pdfLogoFromBytes(new Uint8Array(PNG))
    assert.ok(logo)
    if (!logo) return
    assert.equal(logo.width, 1)
    assert.equal(logo.height, 1)
    assert.equal(logo.filter, "raw")
    const pdf = new TextDecoder().decode(textPdf(["PB Painting"], logo))
    assert.match(pdf, /^%PDF-1\.4/)
    assert.match(pdf, /\/Subtype \/Image/)
    assert.match(pdf, /\/Im1 Do/)
    assert.match(pdf, /PB Painting/)
  })

  it("leaves the PDF as text when the file is not a PNG or JPEG", () => {
    assert.equal(pdfLogoFromBytes(new Uint8Array([1, 2, 3, 4])), null)
    const pdf = new TextDecoder().decode(textPdf(["PB Painting"]))
    assert.equal(pdf.includes("/Subtype /Image"), false)
    assert.match(pdf, /PB Painting/)
  })
})
