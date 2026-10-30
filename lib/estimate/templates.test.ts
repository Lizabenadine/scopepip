import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { documentedBedroom } from "../defaults.ts"
import { measureArea } from "./calculate.ts"
import { areaFromTemplate, areasFromEstimateTemplate, AREA_TEMPLATES, estimateTemplatesFor } from "./templates.ts"

describe("estimate templates", () => {
  it("keeps the bedroom template on the 12 by 15 by 8 room", () => {
    const area = areaFromTemplate("bedroom")
    const documented = documentedBedroom()
    assert.ok(area)
    if (!area) return
    assert.equal(area.lengthFt, 12)
    assert.equal(area.widthFt, 15)
    assert.equal(area.heightFt, 8)
    assert.deepEqual(
      area.surfaces.map((surface) => surface.rateId),
      documented.surfaces.map((surface) => surface.rateId),
    )
    assert.equal(measureArea(area).wallSqFt, 432)
    assert.notEqual(area.id, documented.id)
    const again = areaFromTemplate("bedroom")
    assert.notEqual(again?.id, area.id)
  })

  it("drops a whole interior onto separate areas", () => {
    const areas = areasFromEstimateTemplate("interior-repaint")
    assert.deepEqual(
      areas.map((area) => area.name),
      ["Living room", "Kitchen", "Bedroom", "Bathroom", "Hall"],
    )
    assert.equal(new Set(areas.map((area) => area.id)).size, areas.length)
    const bedroom = areas.find((area) => area.name === "Bedroom")
    assert.equal(bedroom?.lengthFt, 12)
    assert.equal(bedroom?.surfaces.some((surface) => surface.rateId === "window-frames" && surface.itemCount === 2), true)
  })

  it("prices an exterior wall from length times height", () => {
    const wall = areaFromTemplate("house-wall")
    assert.ok(wall)
    if (!wall) return
    assert.equal(wall.areaType, "surface")
    assert.equal(wall.surfaces[0]?.rateId, "siding")
    assert.equal(measureArea(wall).wallSqFt, 300)
    const fascia = areaFromTemplate("fascia")
    assert.equal(fascia && measureArea(fascia).perimeterLnFt, 80)
  })

  it("counts cabinet doors on the cabinet templates", () => {
    const kitchen = areaFromTemplate("kitchen-cabinets")
    const vanity = areaFromTemplate("bathroom-vanity")
    assert.equal(kitchen?.surfaces[0]?.itemCount, 18)
    assert.equal(vanity?.surfaces[0]?.itemCount, 4)
    const job = areasFromEstimateTemplate("cabinet-refinish")
    assert.equal(job.length, 2)
  })

  it("keeps a whole interior job and a whole exterior job in templates", () => {
    assert.deepEqual(
      estimateTemplatesFor("interior").map((template) => template.name),
      ["Interior repaint", "Bedrooms and hall"],
    )
    assert.deepEqual(
      estimateTemplatesFor("exterior").map((template) => template.name),
      ["Exterior repaint"],
    )
    const exterior = areasFromEstimateTemplate("exterior-repaint")
    assert.deepEqual(
      exterior.map((area) => area.name),
      ["House wall", "Fascia", "Soffit", "Shutters", "Front door"],
    )
  })

  it("covers interior, exterior, and cabinet starters", () => {
    const kinds = new Set(AREA_TEMPLATES.map((template) => template.kind))
    assert.deepEqual([...kinds], ["interior", "exterior", "cabinets"])
    assert.equal(areaFromTemplate("missing"), null)
    assert.deepEqual(areasFromEstimateTemplate("missing"), [])
  })
})
