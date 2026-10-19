import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_ESTIMATE_SETTINGS,
  DEFAULT_PRODUCTION_RATES,
  PAYMENT_METHODS,
  documentedBedroom,
} from "../defaults.ts"
import { calculateEstimate } from "./calculate.ts"
import { copyArea, insertAfter } from "./copy.ts"
import {
  createAreaGroup,
  moveAreaGroup,
  placeArea,
  removeAreaGroup,
  renameAreaGroup,
  sectionByGroup,
} from "./groups.ts"
import { applySavedTemplate, captureEstimateTemplate } from "./saved-templates.ts"
import { areaFromTemplate } from "./templates.ts"

describe("area groups", () => {
  it("creates, renames, reorders, and moves a room without changing the bedroom price", () => {
    const upstairs = createAreaGroup("  Upstairs ")
    const front = createAreaGroup("Front of the house")
    assert.ok(upstairs)
    assert.ok(front)
    assert.equal(createAreaGroup("   "), null)
    if (!upstairs || !front) return

    const renamed = renameAreaGroup([upstairs, front], upstairs.id, "Upper floor")
    assert.equal(renamed[0]?.name, "Upper floor")
    assert.equal(renamed[1]?.name, "Front of the house")
    assert.deepEqual(
      moveAreaGroup(renamed, front.id, -1).map((group) => group.name),
      ["Front of the house", "Upper floor"],
    )
    assert.equal(moveAreaGroup(renamed, upstairs.id, -1), renamed)

    const bedroom = documentedBedroom()
    const placed = placeArea([bedroom], bedroom.id, upstairs.id)
    assert.equal(placed[0]?.groupId, upstairs.id)
    const cleared = placeArea(placed, bedroom.id, null)
    assert.equal(cleared[0]?.groupId, undefined)

    const plain = calculateEstimate({
      areas: [bedroom],
      lineItems: [],
      rates: DEFAULT_PRODUCTION_RATES,
      settings: DEFAULT_ESTIMATE_SETTINGS,
      paymentMethods: PAYMENT_METHODS,
    })
    const grouped = calculateEstimate({
      areas: placeArea([bedroom], bedroom.id, upstairs.id),
      lineItems: [],
      rates: DEFAULT_PRODUCTION_RATES,
      settings: DEFAULT_ESTIMATE_SETTINGS,
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(plain.wallSqFt, 432)
    assert.equal(plain.areas[0]?.surfaces.find((surface) => surface.id === "walls")?.allocatedHours, 5.5)
    assert.equal(plain.allocatedHours, 13.5)
    assert.equal(grouped.allocatedHours, 13.5)
    assert.equal(grouped.total, plain.total)
    assert.equal(grouped.wallSqFt, 432)
  })

  it("keeps a copied room in the same group, directly after the original", () => {
    const upstairs = createAreaGroup("Upstairs")
    const front = createAreaGroup("Front of the house")
    assert.ok(upstairs && front)
    if (!upstairs || !front) return
    const bedroom = { ...documentedBedroom(), groupId: upstairs.id }
    const hall = { ...documentedBedroom(), id: "hall", name: "Hall", groupId: front.id }
    const copy = copyArea(bedroom)
    assert.equal(copy.groupId, upstairs.id)
    assert.notEqual(copy.id, bedroom.id)
    const areas = insertAfter([bedroom, hall], bedroom.id, copy)
    const sections = sectionByGroup(areas, [upstairs, front], (area) => area.groupId)
    assert.deepEqual(
      sections.map((section) => [section.groupName, section.items.map((area) => area.name)]),
      [
        ["Upstairs", ["Bedroom", "Bedroom copy"]],
        ["Front of the house", ["Hall"]],
      ],
    )
  })

  it("lists ungrouped rooms first and drops an empty group unless the editor asks for it", () => {
    const upstairs = createAreaGroup("Upstairs")
    assert.ok(upstairs)
    if (!upstairs) return
    const kitchen = { ...documentedBedroom(), id: "kitchen", name: "Kitchen" }
    const bedroom = { ...documentedBedroom(), groupId: upstairs.id }
    const sections = sectionByGroup([bedroom, kitchen], [upstairs], (area) => area.groupId)
    assert.deepEqual(
      sections.map((section) => [section.groupName, section.items.map((area) => area.name)]),
      [
        [null, ["Kitchen"]],
        ["Upstairs", ["Bedroom"]],
      ],
    )
    const removed = removeAreaGroup([upstairs], [bedroom], upstairs.id)
    assert.equal(removed.groups.length, 0)
    assert.equal(removed.areas[0]?.groupId, undefined)
    const empty = sectionByGroup([], [upstairs], () => null, { includeEmpty: true })
    assert.equal(empty[0]?.groupName, "Upstairs")
    assert.equal(empty[0]?.items.length, 0)
  })

  it("saves group names on a template and restores them with new ids", () => {
    const upstairs = createAreaGroup("Upstairs")
    assert.ok(upstairs)
    if (!upstairs) return
    const bedroom = { ...documentedBedroom(), groupId: upstairs.id }
    const saved = captureEstimateTemplate({
      name: "Upper floor",
      kind: "interior",
      title: "Upstairs repaint",
      areas: [bedroom],
      areaGroups: [upstairs],
      lineItems: [],
      now: "2026-10-19T00:00:00.000Z",
    })
    assert.ok(saved)
    if (!saved) return
    assert.equal(saved.areaGroups?.[0]?.name, "Upstairs")
    assert.equal(saved.areas[0]?.groupId, upstairs.id)

    const applied = applySavedTemplate(saved)
    assert.equal(applied.areaGroups[0]?.name, "Upstairs")
    assert.notEqual(applied.areaGroups[0]?.id, upstairs.id)
    assert.equal(applied.areas[0]?.groupId, applied.areaGroups[0]?.id)
    assert.notEqual(applied.areas[0]?.id, bedroom.id)
    applied.areaGroups[0]!.name = "Changed"
    assert.equal(saved.areaGroups?.[0]?.name, "Upstairs")

    const premade = areaFromTemplate("bedroom")
    assert.equal(premade?.groupId, undefined)
    const plain = captureEstimateTemplate({
      name: "Plain bedroom",
      kind: "interior",
      title: "",
      areas: [documentedBedroom()],
      lineItems: [],
    })
    assert.equal(plain?.areaGroups, undefined)
    assert.equal(applySavedTemplate(plain!).areaGroups.length, 0)
  })
})
