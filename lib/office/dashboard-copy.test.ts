import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  officeAreas,
  officeEmptyStage,
  officeInView,
  officeLabel,
  officeNextAction,
  officeNoMatch,
  officeOnSite,
  officeScheduleTitle,
  officeStageName,
} from "./dashboard-copy.ts"

describe("office dashboard language", () => {
  it("keeps the dashboard in English until the switch moves to Spanish", () => {
    assert.equal(officeLabel("Dashboard", "en"), "Dashboard")
    assert.equal(officeLabel("New estimate", "en"), "New estimate")
    assert.equal(officeStageName("lead", "Lead", "en"), "Lead")
    assert.equal(officeEmptyStage("lead", "No walkthroughs waiting.", "en"), "No walkthroughs waiting.")
    assert.equal(officeNextAction("lead", "Mark sent", "en"), "Mark sent")
    assert.equal(officeInView(4, "$1,962.50", "en"), "4 in view · $1,962.50 priced")
    assert.equal(officeNoMatch("Lena", "en"), "No jobs match “Lena”.")
    assert.equal(officeAreas(["Primary bedroom"], "en"), "Primary bedroom")
    assert.equal(officeOnSite("2026-10-29", "en"), "On site Thu, Oct 29")
    assert.equal(officeScheduleTitle("Lena Brooks", "en"), "Schedule Lena Brooks")
  })

  it("translates the office chrome, the stage columns, and the room names", () => {
    assert.equal(officeLabel("Dashboard", "es"), "Tablero")
    assert.equal(officeLabel("Sales Pipeline", "es"), "Pipeline de ventas")
    assert.equal(officeLabel("Work Orders", "es"), "Órdenes de trabajo")
    assert.equal(officeLabel("Sign out", "es"), "Salir")
    assert.equal(officeLabel("New estimate", "es"), "Nuevo estimado")
    assert.equal(officeStageName("lead", "Lead", "es"), "Prospecto")
    assert.equal(officeStageName("estimate_sent", "Estimate Sent", "es"), "Estimado enviado")
    assert.equal(officeStageName("scheduled", "Scheduled", "es"), "Programado")
    assert.equal(officeStageName("completed", "Completed", "es"), "Terminado")
    assert.equal(officeEmptyStage("scheduled", "No days on the calendar.", "es"), "No hay días en el calendario.")
    assert.equal(officeNextAction("estimate_sent", "Schedule", "es"), "Programar")
    assert.equal(officeNextAction("completed", null, "es"), null)
    assert.equal(officeInView(4, "$1,962.50", "es"), "4 a la vista · $1,962.50 con precio")
    assert.equal(officeNoMatch("Lena", "es"), "Ningún trabajo coincide con “Lena”.")
    assert.equal(officeAreas([], "es"), "Todavía no hay áreas")
    assert.equal(officeAreas(["Primary bedroom", "Lena Brooks"], "es"), "Dormitorio principal · Lena Brooks")
    assert.equal(officeLabel("Crew sheet", "es"), "Hoja de cuadrilla")
    assert.equal(officeScheduleTitle("Lena Brooks", "es"), "Programar Lena Brooks")
  })
})
