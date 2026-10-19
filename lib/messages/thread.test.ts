import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createSeedState } from "../data/seed.ts"
import { reconcileFollowUps } from "../follow-ups/schedule.ts"
import { ackSpool, addSpool, readSpool } from "./spool.ts"
import { applyAssignUnmatched, applyInbound, latestInbound, phoneKey } from "./thread.ts"

const START = "2026-10-18T15:00:00.000Z"

describe("text threads", () => {
  it("lands a reply on the matching client and stops that follow-up", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const result = applyInbound(enrolled, {
      id: "sms-1",
      from: "+1 (503) 555-0148",
      body: "Thursday afternoon works.",
      mediaUrls: ["https://example.com/kitchen.jpg"],
      createdAt: START,
    })
    assert.equal(result.matched, true)
    const maya = result.state.clients.find((client) => client.id === "client-maya")
    const reply = latestInbound(maya?.messages)
    assert.equal(reply?.body, "Thursday afternoon works.")
    assert.equal(reply?.estimateId, "est-maya")
    assert.deepEqual(reply?.mediaUrls, ["https://example.com/kitchen.jpg"])
    assert.equal(result.state.estimates.find((estimate) => estimate.id === "est-maya")?.followUp?.stoppedReason, "reply")
    const again = applyInbound(result.state, {
      id: "sms-1",
      from: "5035550148",
      body: "Thursday afternoon works.",
      mediaUrls: [],
      createdAt: START,
    })
    assert.equal(again.state, result.state)
    assert.equal(phoneKey("(503) 555-0148"), "5035550148")
  })

  it("holds an unknown number until the office assigns it", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const result = applyInbound(enrolled, {
      id: "sms-new",
      from: "+1 999 555 0100",
      body: "Do you paint cabinets?",
      mediaUrls: [],
      createdAt: START,
    })
    assert.equal(result.matched, false)
    assert.equal(result.state.unmatchedTexts?.length, 1)
    assert.equal(result.state.estimates.find((estimate) => estimate.id === "est-maya")?.followUp?.status, "active")
    const assigned = applyAssignUnmatched(result.state, "sms-new", "client-maya")
    assert.equal(assigned.unmatchedTexts?.length, 0)
    assert.equal(latestInbound(assigned.clients.find((client) => client.id === "client-maya")?.messages)?.body, "Do you paint cabinets?")
    assert.equal(assigned.estimates.find((estimate) => estimate.id === "est-maya")?.followUp?.stoppedReason, "reply")
  })

  it("stores an inbound webhook until the office claims it", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "scopepipe-inbox-"))
    process.env.MESSAGE_SPOOL_PATH = path.join(directory, "spool.json")
    addSpool({
      id: "SM123",
      from: "+15035550148",
      body: "See the wall.",
      mediaUrls: ["https://example.com/wall.jpg"],
      createdAt: START,
    })
    addSpool({
      id: "SM123",
      from: "+15035550148",
      body: "See the wall.",
      mediaUrls: [],
      createdAt: START,
    })
    assert.equal(readSpool().length, 1)
    assert.equal(readFileSync(process.env.MESSAGE_SPOOL_PATH, "utf8").includes("SM123"), true)
    ackSpool(["SM123"])
    assert.equal(readSpool().length, 0)
    delete process.env.MESSAGE_SPOOL_PATH
  })
})