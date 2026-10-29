import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_ESTIMATE_SETTINGS, PAYMENT_METHODS, blankLineItem } from "../defaults.ts"
import { calculateEstimate } from "./calculate.ts"
import { inspectLineVideo, lineVideo, lineVideoRange, lineVideoTooLarge } from "./line-video.ts"

const clip = "https://kavebhnmcdeptnpdlotz.supabase.co/storage/v1/object/public/line-videos/company/est/line/clip.mp4"

describe("line videos", () => {
  it("keeps a storage address beside the priced line and leaves the price alone", () => {
    const quote = calculateEstimate({
      areas: [],
      lineItems: [
        {
          ...blankLineItem("closet", "custom"),
          label: "Closet shelves",
          customPrice: 125,
          video: clip,
        },
      ],
      rates: [],
      settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(quote.lineItems[0]?.video, clip)
    assert.equal(quote.lineItems[0]?.price, 125)
    assert.equal(quote.total, 125)
  })

  it("drops a data url, a script, and a file that is not in the video bucket", () => {
    assert.equal(lineVideo("javascript:alert(1)"), undefined)
    assert.equal(lineVideo("data:video/mp4;base64,aaaa"), undefined)
    assert.equal(lineVideo("https://example.com/walkthrough.mp4"), undefined)
    assert.equal(
      lineVideo("/api/line-videos/695aebe9-bdcd-41b7-b311-ecd94ccb03e7"),
      "/api/line-videos/695aebe9-bdcd-41b7-b311-ecd94ccb03e7",
    )
    assert.equal(lineVideo(clip), clip)
  })

  it("accepts mp4, mov, and webm bytes and refuses anything else", () => {
    assert.equal(inspectLineVideo({ bytes: ftyp("isom") }).ok, true)
    const mov = inspectLineVideo({ bytes: ftyp("qt  ") })
    assert.equal(mov.ok && mov.contentType, "video/quicktime")
    const webm = inspectLineVideo({ bytes: Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0]) })
    assert.equal(webm.ok && webm.extension, ".webm")
    assert.equal(inspectLineVideo({ bytes: new Uint8Array() }).reason, "That video is empty.")
    assert.equal(inspectLineVideo({ bytes: Uint8Array.from([0xff, 0xd8, 0xff]) }).reason, "Choose an mp4, mov, or webm video.")
    const oversized = inspectLineVideo({ bytes: new Uint8Array(40 * 1024 * 1024 + 1) })
    assert.equal(oversized.ok, false)
    if (!oversized.ok) assert.equal(oversized.reason, lineVideoTooLarge())
  })

  it("streams a byte range and rejects a range past the end", () => {
    assert.deepEqual(lineVideoRange(1000, null), { start: 0, end: 999, status: 200 })
    assert.deepEqual(lineVideoRange(1000, "bytes=0-99"), { start: 0, end: 99, status: 206 })
    assert.deepEqual(lineVideoRange(1000, "bytes=-100"), { start: 900, end: 999, status: 206 })
    assert.equal(lineVideoRange(1000, "bytes=1000-"), null)
  })
})

function ftyp(brand: string): Uint8Array {
  const bytes = new Uint8Array(16)
  bytes[3] = 16
  bytes.set([0x66, 0x74, 0x79, 0x70], 4)
  bytes.set(brand.split("").map((char) => char.charCodeAt(0)), 8)
  return bytes
}
