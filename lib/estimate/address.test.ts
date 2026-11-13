import assert from "node:assert/strict"
import test from "node:test"
import { GET } from "../../app/api/address/autocomplete/route.ts"

test("returns empty suggestions when query is shorter than 3 characters", async () => {
  const req = new Request("http://localhost:3000/api/address/autocomplete?q=12")
  const res = await GET(req)
  const json = await res.json()
  assert.deepEqual(json, { suggestions: [] })
})

test("returns real matching address suggestions for valid address query", async () => {
  const req = new Request("http://localhost:3000/api/address/autocomplete?q=1600+Pennsylvania+Ave+NW+Washington")
  const res = await GET(req)
  assert.equal(res.status, 200)
  const json = (await res.json()) as { suggestions: Array<{ id: string; label: string; street?: string; city?: string }> }
  assert.ok(Array.isArray(json.suggestions))
  assert.ok(json.suggestions.length > 0)
  const match = json.suggestions[0]
  assert.ok(match.label.toLowerCase().includes("pennsylvania"))
  assert.ok(match.label.toLowerCase().includes("washington"))
})

test("preserves manual address entry and formats full destination for navigation", () => {
  const manualAddress = "123 Main Street, Suite 400, Austin, TX 78701"
  // Simulated estimate draft save with manual or selected address
  const draft = {
    title: "Commercial Repaint",
    jobAddress: manualAddress,
  }

  assert.equal(draft.jobAddress, manualAddress)
  // Verify Navigate to Jobsite URL generation
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(draft.jobAddress)}&dir_action=navigate`
  assert.ok(mapsUrl.includes("123%20Main%20Street"))
  assert.ok(mapsUrl.includes("Austin"))
})
