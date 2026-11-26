import assert from "node:assert/strict"
import { test } from "node:test"
import { calculateFlooringQuote, recomputeRoomGeometry } from "./calculate.ts"
import { createBlankFlooringRoom, createBlankFlooringScope } from "./defaults.ts"
import { parseFlooringRoomScan, scanFeetInches } from "./room-scan.ts"

test("an irregular scanned floor uses the confirmed area and perimeter in both quote modes", () => {
  const scan = parseFlooringRoomScan(JSON.stringify({
    version: 1, name: "Kitchen", lengthFt: 16, widthFt: 12, areaSqFt: 154.56, perimeterFt: 55.6,
  }))
  const room = recomputeRoomGeometry({
    ...createBlankFlooringRoom(scan.name),
    length: scanFeetInches(scan.lengthFt),
    width: scanFeetInches(scan.widthFt),
    scanGeometry: { areaSqFt: scan.areaSqFt, perimeterFt: scan.perimeterFt },
    additionsSqFt: 2,
  })
  assert.equal(room.grossSqFt, 154.56)
  assert.equal(room.netSqFt, 156.56)
  assert.equal(room.perimeterFt, 55.6)
  const scope = { ...createBlankFlooringScope(), rooms: [room] }
  assert.equal(calculateFlooringQuote(scope).netSqFt, 156.56)
  assert.equal(calculateFlooringQuote({ ...scope, jobType: "refinish", refinishAreaSource: "rooms" }).netSqFt, 156.56)
})

test("scan import rejects unsupported versions and invalid measurements", () => {
  const sample = { version: 1, lengthFt: 10, widthFt: 12, areaSqFt: 120, perimeterFt: 44 }
  for (const patch of [{ version: 2 }, { areaSqFt: -1 }, { perimeterFt: "44" }, { lengthFt: 0 }]) {
    assert.throws(() => parseFlooringRoomScan(JSON.stringify({ ...sample, ...patch })))
  }
  assert.deepEqual(scanFeetInches(12.99), { feet: 13, inches: 0 })
})
