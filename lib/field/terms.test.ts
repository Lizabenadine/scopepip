import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { PAINTING_TERMS, translatePainting } from "./terms.ts"

describe("painting terms", () => {
  it("keeps proposal lines and the crew sheet in English", () => {
    assert.equal(translatePainting("Primary bedroom", "en"), "Primary bedroom")
    assert.equal(translatePainting("Walls painted the full number of coats.", "en"), "Walls painted the full number of coats.")
  })

  it("maps the painting words a crew and a homeowner read", () => {
    const spanish = new Map(PAINTING_TERMS.map((term) => [term.en, term.es]))
    assert.equal(spanish.get("prep"), "preparación")
    assert.equal(spanish.get("prime"), "imprimación")
    assert.equal(spanish.get("coat"), "mano")
    assert.equal(spanish.get("sanding"), "lijado")
    assert.equal(spanish.get("caulking"), "calafateo")
    assert.equal(spanish.get("bedroom"), "dormitorio")
    assert.equal(spanish.get("trim"), "moldura")
    assert.equal(spanish.get("drywall"), "tablaroca")
    assert.equal(spanish.get("work order"), "orden de trabajo")
    assert.equal(spanish.get("deposit"), "depósito")

    assert.equal(translatePainting("Prep", "es"), "Preparación")
    assert.equal(translatePainting("Prime", "es"), "Imprimación")
    assert.equal(translatePainting("2 coats", "es"), "2 manos")
    assert.equal(translatePainting("Sanding", "es"), "Lijado")
    assert.equal(translatePainting("Caulking", "es"), "Calafateo")
    assert.equal(translatePainting("Primary bedroom", "es"), "Dormitorio principal")
    assert.equal(translatePainting("Trim package", "es"), "Paquete de moldura")
    assert.equal(translatePainting("Walls · Drywall", "es"), "Paredes · Tablaroca")
    assert.equal(translatePainting("Work Order", "es"), "Orden de trabajo")
    assert.equal(translatePainting("Deposit required (50%)", "es"), "Depósito requerido (50%)")
    assert.equal(
      translatePainting("Walls painted the full number of coats.", "es"),
      "Paredes pintadas con todas las manos.",
    )
    assert.equal(
      translatePainting("Patching, sanding, caulking, and masking.", "es"),
      "Resane, lijado, calafateo y enmascarado.",
    )
    assert.equal(translatePainting("Lena Brooks", "es"), "Lena Brooks")
    assert.equal(translatePainting("22 Cedar Court", "es"), "22 Cedar Court")
  })
})
