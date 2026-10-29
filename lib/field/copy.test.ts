import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fieldChecklistLabel, fieldCopy, fieldHours, fieldJobHeading, fieldUnit } from "./copy.ts"

describe("field language", () => {
  it("keeps the crew sheet in English until the switch moves to Spanish", () => {
    const english = fieldCopy("en")
    assert.equal(english.workOrdersTitle, "Work Orders")
    assert.equal(english.checklist, "Checklist")
    assert.equal(fieldChecklistLabel("Cover floors, furniture, and fixtures", "en"), "Cover floors, furniture, and fixtures")
    assert.equal(fieldChecklistLabel("Paint Living room", "en"), "Paint Living room")
    assert.equal(fieldHours(24.5, "en"), "24.5 hr")
    assert.equal(fieldUnit("hr", "en"), "hr")
  })

  it("translates the work order, the job card, and the daily tasks", () => {
    const spanish = fieldCopy("es")
    assert.equal(spanish.workOrdersTitle, "Órdenes de trabajo")
    assert.equal(spanish.dispatch, "Despacho")
    assert.equal(spanish.checklist, "Tareas del día")
    assert.equal(spanish.status.scheduled, "Programado")
    assert.equal(fieldChecklistLabel("Cover floors, furniture, and fixtures", "es"), "Cubrir pisos, muebles y accesorios")
    assert.equal(fieldChecklistLabel("Patch, sand, and caulk", "es"), "Resanar, lijar y sellar juntas")
    assert.equal(fieldChecklistLabel("Walk the punch list", "es"), "Revisar la lista de detalles")
    assert.equal(fieldChecklistLabel("Clean up and haul trash", "es"), "Limpiar y sacar la basura")
    assert.equal(fieldChecklistLabel("Paint Living room", "es"), "Pintar Living room")
    assert.equal(fieldChecklistLabel("Custom note from the office", "es"), "Custom note from the office")
    assert.equal(fieldHours(24.5, "es"), "24.5 h")
    assert.equal(fieldUnit("Job", "es"), "Trabajo")
    assert.equal(spanish.photoTag("before"), "Antes")
    assert.equal(spanish.photoLink("Prep · Kitchen"), "Preparación · Kitchen")
    assert.equal(fieldJobHeading("Project In Progress", "es"), "Proyecto en proceso")
    assert.equal(fieldJobHeading("Custom column", "es"), "Custom column")
  })
})
