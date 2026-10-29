import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, describe, it } from "node:test"
import { openLineVideo, storeLineVideo } from "./line-videos.ts"

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "line-videos-"))
process.env.LINE_VIDEOS_DIR = dir

after(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe("line video storage", () => {
  it("stores a clip on disk and opens it for streaming when Supabase is not configured", async () => {
    const bytes = new Uint8Array(16)
    bytes[3] = 16
    bytes.set([0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d], 4)
    const stored = await storeLineVideo({
      companyId: "company-pb",
      estimateId: "est-lena",
      lineId: "closet",
      bytes,
    })
    assert.equal(stored.ok, true)
    if (!stored.ok) return
    assert.match(stored.video.url, /^\/api\/line-videos\/[0-9a-f-]{36}$/i)
    const id = stored.video.url.slice("/api/line-videos/".length)
    const opened = openLineVideo(id)
    assert.equal(opened?.contentType, "video/mp4")
    assert.equal(opened?.size, 16)
    assert.equal(openLineVideo("../" + id), null)
  })
})