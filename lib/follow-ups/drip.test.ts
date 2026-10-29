import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { dueQuoteFollowUps, runQuoteDrip } from "./drip.ts"
import { reconcileFollowUps } from "./schedule.ts"

const START = "2026-10-18T15:00:00.000Z"
const START_MS = Date.parse(START)
const DAY = 24 * 60 * 60 * 1000

describe("quote drip", () => {
  it("waits a day, then emails the proposal link, and does not send that note again", async () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    assert.equal(dueQuoteFollowUps(enrolled, START_MS).length, 0)
    const due = dueQuoteFollowUps(enrolled, START_MS + DAY, "https://paint.example")
    assert.equal(due.length, 1)
    assert.equal(due[0]?.channel, "email")
    assert.match(due[0]?.body ?? "", /https:\/\/paint\.example\/p\/k7m2p9qx4n/)
    const first = await runQuoteDrip(enrolled, START_MS + DAY, "https://paint.example")
    assert.ok(sentSteps(first.state, "est-ortiz").includes("proposal-email-1d"))
    const again = await runQuoteDrip(first.state, START_MS + DAY, "https://paint.example")
    assert.deepEqual(sentSteps(again.state, "est-ortiz"), sentSteps(first.state, "est-ortiz"))
  })

  it("leaves a declined quote alone", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const declined = {
      ...enrolled,
      estimates: enrolled.estimates.map((estimate) =>
        estimate.id === "est-ortiz" ? { ...estimate, clientStatus: "declined" as const } : estimate,
      ),
    }
    assert.equal(dueQuoteFollowUps(declined, START_MS + 8 * DAY).length, 0)
  })

  it("texts a cold lead immediately and asks for a review the day after the job is finished", async () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const opened = await runQuoteDrip(enrolled, START_MS)
    assert.ok(sentSteps(opened.state, "est-maya").includes("cold-text-now"))
    assert.equal(sentSteps(opened.state, "est-jim").includes("review-email-1d"), false)
    const later = await runQuoteDrip(opened.state, START_MS + DAY)
    assert.ok(sentSteps(later.state, "est-jim").includes("review-email-1d"))
    assert.equal(sentSteps(later.state, "est-wade").includes("warm-email-2d"), false)
    const warm = await runQuoteDrip(later.state, START_MS + 2 * DAY)
    assert.ok(sentSteps(warm.state, "est-wade").includes("warm-email-2d"))
  })
})

function sentSteps(state: { estimates: { id: string; followUp?: { sentStepIds: string[] } | null }[] }, id: string): string[] {
  return state.estimates.find((estimate) => estimate.id === id)?.followUp?.sentStepIds ?? []
}
