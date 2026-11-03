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
    assert.equal(sentSteps(first.state, "est-ortiz").includes("proposal-email-1d"), false)
    assert.equal(deliveryOf(first.state, "est-ortiz", "proposal-email-1d"), "skipped")
    const again = await runQuoteDrip(first.state, START_MS + DAY, "https://paint.example")
    assert.deepEqual(sentSteps(again.state, "est-ortiz"), sentSteps(first.state, "est-ortiz"))
    assert.equal(logCount(again.state, "est-ortiz", "proposal-email-1d"), 1)
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
    assert.equal(deliveryOf(opened.state, "est-maya", "cold-text-now"), "skipped")
    assert.equal(sentSteps(opened.state, "est-maya").includes("cold-text-now"), false)
    assert.equal(deliveryOf(opened.state, "est-jim", "review-email-1d"), undefined)
    const later = await runQuoteDrip(opened.state, START_MS + DAY)
    assert.equal(deliveryOf(later.state, "est-jim", "review-email-1d"), "skipped")
    assert.equal(deliveryOf(later.state, "est-wade", "warm-email-2d"), undefined)
    const warm = await runQuoteDrip(later.state, START_MS + 2 * DAY)
    assert.equal(deliveryOf(warm.state, "est-wade", "warm-email-2d"), "skipped")
  })
})

function sentSteps(state: { estimates: { id: string; followUp?: { sentStepIds: string[] } | null }[] }, id: string): string[] {
  return state.estimates.find((estimate) => estimate.id === id)?.followUp?.sentStepIds ?? []
}

function deliveryOf(
  state: { estimates: { id: string; followUpLog?: { stepId: string; delivery: string }[] }[] },
  id: string,
  stepId: string,
): string | undefined {
  return state.estimates.find((estimate) => estimate.id === id)?.followUpLog?.find((item) => item.stepId === stepId)?.delivery
}

function logCount(
  state: { estimates: { id: string; followUpLog?: { stepId: string }[] }[] },
  id: string,
  stepId: string,
): number {
  return state.estimates.find((estimate) => estimate.id === id)?.followUpLog?.filter((item) => item.stepId === stepId).length ?? 0
}
