import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { jobsCsv } from "./export.ts"

describe("job export", () => {
  it("quotes a client name that contains a comma", () => {
    const csv = jobsCsv([
      {
        client: "Brooks, Lena",
        job: "Whole interior",
        address: "22 Cedar Court",
        stage: "Scheduled",
        status: "Accepted",
        total: 1962.5,
        updated: "2026-10-29",
      },
    ])
    assert.equal(
      csv,
      "\uFEFFClient,Job,Address,Stage,Status,Total,Updated\n\"Brooks, Lena\",Whole interior,22 Cedar Court,Scheduled,Accepted,1962.50,2026-10-29\n",
    )
  })
})