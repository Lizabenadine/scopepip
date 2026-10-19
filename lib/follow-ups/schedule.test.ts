import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { visitReminderPhrase } from "../appointments/visit.ts"
import { deliverFollowUp } from "./deliver.ts"
import { defaultSequences } from "./defaults.ts"
import {
  collectDueFollowUps,
  describeFollowUp,
  dueAt,
  reconcileEnrollment,
  reconcileFollowUps,
  renderFollowUp,
  stopForReply,
  stopPursuit,
} from "./schedule.ts"
import type { FollowUpSequence } from "./types.ts"

const START = "2026-10-18T15:00:00.000Z"
const START_MS = Date.parse(START)

describe("follow-up sequences", () => {
  it("sends the cold text immediately and waits an hour for the email", () => {
    const state = reconcileFollowUps(createSeedState(), START)
    const again = reconcileFollowUps(state, START)
    assert.equal(again, state)
    const maya = state.estimates.find((estimate) => estimate.id === "est-maya")
    assert.equal(maya?.followUp?.stage, "cold")
    assert.equal(maya?.followUp?.status, "active")
    const due = collectDueFollowUps(state, START_MS).filter((item) => item.estimateId === "est-maya")
    assert.equal(due.length, 1)
    assert.equal(due[0]?.channel, "text")
    assert.match(due[0]?.body ?? "", /Maya/)
    assert.equal(describeFollowUp(state, maya!, START_MS), "Next text due now.")
    const sent = {
      ...state,
      estimates: state.estimates.map((estimate) =>
        estimate.id === "est-maya" && estimate.followUp
          ? { ...estimate, followUp: { ...estimate.followUp, sentStepIds: ["cold-text-now"] } }
          : estimate,
      ),
    }
    assert.equal(
      collectDueFollowUps(sent, START_MS).some((item) => item.estimateId === "est-maya"),
      false,
    )
    assert.equal(describeFollowUp(sent, sent.estimates.find((estimate) => estimate.id === "est-maya")!, START_MS), "Next email in 1 hr.")
  })

  it("waits two days before the first warm note", () => {
    const state = reconcileFollowUps(createSeedState(), START)
    const wade = state.estimates.find((estimate) => estimate.id === "est-wade")
    assert.equal(wade?.followUp?.stage, "warm")
    assert.equal(collectDueFollowUps(state, START_MS).some((item) => item.estimateId === "est-wade"), false)
    assert.match(describeFollowUp(state, wade!, START_MS), /Next email in 2 days/)
    const later = START_MS + 48 * 60 * 60 * 1000
    const due = collectDueFollowUps(state, later).find((item) => item.estimateId === "est-wade")
    assert.equal(due?.channel, "email")
  })

  it("stops a pursuit when the customer replies and does not restart it", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const maya = enrolled.estimates.find((estimate) => estimate.id === "est-maya")
    assert.ok(maya?.followUp)
    const stopped = stopForReply(maya.followUp)
    assert.equal(stopped?.status, "stopped")
    assert.equal(stopped?.stoppedReason, "reply")
    const state = {
      ...enrolled,
      estimates: enrolled.estimates.map((estimate) =>
        estimate.id === "est-maya" ? { ...estimate, followUp: stopped } : estimate,
      ),
    }
    const kept = reconcileFollowUps(state, START)
    assert.equal(kept, state)
    assert.equal(describeFollowUp(kept, kept.estimates.find((estimate) => estimate.id === "est-maya")!, START_MS), "Follow-up stopped. Customer replied.")
    assert.equal(collectDueFollowUps(kept, START_MS + 10 * 24 * 60 * 60 * 1000).some((item) => item.estimateId === "est-maya"), false)
  })

  it("stops the cold sequence when a visit is booked and starts the visit reminder", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const maya = enrolled.estimates.find((estimate) => estimate.id === "est-maya")
    assert.ok(maya)
    const stopped = stopPursuit(maya.followUp)
    assert.equal(stopped?.stoppedReason, "visit_booked")
    const booked = {
      ...enrolled,
      estimates: enrolled.estimates.map((estimate) =>
        estimate.id === "est-maya"
          ? { ...estimate, salesStage: "estimate_scheduled" as const, estimateVisitOn: "2026-10-21", followUp: stopped }
          : estimate,
      ),
    }
    const next = reconcileFollowUps(booked, START)
    const updated = next.estimates.find((estimate) => estimate.id === "est-maya")
    assert.equal(updated?.followUp?.stage, "estimate_scheduled")
    assert.equal(updated?.followUp?.status, "active")
    assert.equal(updated?.followUp?.sentStepIds.length, 0)
    const visitNoon = Date.UTC(2026, 9, 21, 12)
    assert.equal(dueAt(defaultSequences().find((item) => item.stage === "estimate_scheduled")!.steps[0]!, START, "2026-10-21", null), visitNoon - 24 * 60 * 60 * 1000)
    assert.equal(collectDueFollowUps(next, START_MS).some((item) => item.estimateId === "est-maya"), false)
    const morning = Date.UTC(2026, 9, 20, 12)
    const reminder = collectDueFollowUps(next, morning).find((item) => item.estimateId === "est-maya")
    assert.equal(reminder?.channel, "email")
    assert.match(reminder?.body ?? "", /Oct 21/)
  })

  it("schedules the visit reminder from the booked start instead of noon UTC", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const maya = enrolled.estimates.find((estimate) => estimate.id === "est-maya")
    assert.ok(maya)
    const stopped = stopPursuit(maya.followUp)
    const visitStartInstant = "2026-10-21T16:00:00.000Z"
    const booked = {
      ...enrolled,
      estimates: enrolled.estimates.map((estimate) =>
        estimate.id === "est-maya"
          ? {
              ...estimate,
              salesStage: "estimate_scheduled" as const,
              estimateVisitOn: "2026-10-21",
              estimateVisitAt: visitStartInstant,
              followUp: stopped,
            }
          : estimate,
      ),
    }
    const next = reconcileFollowUps(booked, START)
    const updated = next.estimates.find((estimate) => estimate.id === "est-maya")
    assert.equal(updated?.followUp?.stage, "estimate_scheduled")
    const due = Date.parse(visitStartInstant) - 24 * 60 * 60 * 1000
    assert.notEqual(due, Date.UTC(2026, 9, 20, 12))
    assert.equal(collectDueFollowUps(next, due - 1).some((item) => item.estimateId === "est-maya"), false)
    const reminder = collectDueFollowUps(next, due).find((item) => item.estimateId === "est-maya")
    assert.equal(reminder?.channel, "email")
    assert.match(reminder?.body ?? "", /Oct 21/)
    assert.ok(reminder?.body.includes(visitReminderPhrase("2026-10-21", visitStartInstant)))
    assert.match(reminder?.subject ?? "", /Tomorrow/)
    const textAt = Date.parse(visitStartInstant) - 2 * 60 * 60 * 1000
    const afterEmail = {
      ...next,
      estimates: next.estimates.map((estimate) =>
        estimate.id === "est-maya" && estimate.followUp
          ? { ...estimate, followUp: { ...estimate.followUp, sentStepIds: ["visit-email-1d"] } }
          : estimate,
      ),
    }
    const text = collectDueFollowUps(afterEmail, textAt).find((item) => item.estimateId === "est-maya")
    assert.equal(text?.channel, "text")
  })

  it("keeps a proposal nudge stopped when the visit does not change the column", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const ortiz = enrolled.estimates.find((estimate) => estimate.id === "est-ortiz")
    assert.equal(ortiz?.followUp?.stage, "proposal_sent")
    const stopped = stopPursuit(ortiz?.followUp)
    const state = {
      ...enrolled,
      estimates: enrolled.estimates.map((estimate) =>
        estimate.id === "est-ortiz" ? { ...estimate, followUp: stopped, estimateVisitOn: "2026-10-22" } : estimate,
      ),
    }
    const kept = reconcileFollowUps(state, START)
    assert.equal(kept.estimates.find((estimate) => estimate.id === "est-ortiz")?.followUp?.stoppedReason, "visit_booked")
    assert.equal(describeFollowUp(kept, kept.estimates.find((estimate) => estimate.id === "est-ortiz")!, START_MS), "Follow-up stopped. Visit booked.")
  })

  it("asks for a review a day after the job is marked complete", () => {
    const state = reconcileFollowUps(createSeedState(), START)
    const jim = state.estimates.find((estimate) => estimate.id === "est-jim")
    assert.equal(jim?.followUp?.stage, "project_completed")
    assert.match(describeFollowUp(state, jim!, START_MS), /Next email in 1 day/)
    const due = collectDueFollowUps(state, START_MS + 24 * 60 * 60 * 1000).find((item) => item.estimateId === "est-jim")
    assert.match(due?.subject ?? "", /How did we do/)
    assert.match(due?.body ?? "", /review/)
  })

  it("waits for a visit date before the reminder and ignores a disabled column", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const cole = enrolled.estimates.find((estimate) => estimate.id === "est-cole")
    assert.equal(cole?.followUp?.stage, "estimate_scheduled")
    assert.equal(describeFollowUp(enrolled, cole!, START_MS), "Waiting for a visit date.")
    const sequences: FollowUpSequence[] = defaultSequences().map((sequence) =>
      sequence.stage === "cold" ? { ...sequence, enabled: false } : sequence,
    )
    const off = { ...enrolled, followUpSequences: sequences }
    const maya = off.estimates.find((estimate) => estimate.id === "est-maya")
    assert.equal(describeFollowUp(off, maya!, START_MS), "Follow-up is off for this column.")
    assert.equal(collectDueFollowUps(off, START_MS).some((item) => item.estimateId === "est-maya"), false)
  })

  it("fills the customer and company into the message", () => {
    assert.equal(
      renderFollowUp("Hi {client}, {company} can price {address}.", {
        client: "Maya",
        company: "ScopePipe",
        address: "1842 Birch St",
      }),
      "Hi Maya, ScopePipe can price 1842 Birch St.",
    )
  })

  it("drops an active sequence when the deal leaves the board", () => {
    const enrolled = reconcileFollowUps(createSeedState(), START)
    const archived = {
      ...enrolled,
      estimates: enrolled.estimates.map((estimate) =>
        estimate.id === "est-maya" ? { ...estimate, archived: true } : estimate,
      ),
    }
    const next = reconcileFollowUps(archived, START)
    assert.equal(next.estimates.find((estimate) => estimate.id === "est-maya")?.followUp?.stoppedReason, "archived")
    const fresh = reconcileEnrollment(undefined, "cold", START)
    assert.equal(fresh?.status, "active")
    assert.equal(reconcileEnrollment(fresh, "cold", START), fresh)
  })

  it("logs the message when email and text services are not configured", async () => {
    const previous = {
      resend: process.env.RESEND_API_KEY,
      from: process.env.FOLLOW_UP_FROM_EMAIL,
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
      twilioFrom: process.env.TWILIO_FROM_NUMBER,
    }
    delete process.env.RESEND_API_KEY
    delete process.env.FOLLOW_UP_FROM_EMAIL
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_FROM_NUMBER
    const email = await deliverFollowUp({
      channel: "email",
      to: "maya@example.com",
      subject: "Painting estimate",
      body: "Reply with a day.",
      fromName: "ScopePipe",
    })
    const text = await deliverFollowUp({
      channel: "text",
      to: "(971) 555-0100",
      subject: "",
      body: "Reply with a day.",
      fromName: "ScopePipe",
    })
    assert.equal(email.delivery, "logged")
    assert.equal(text.delivery, "logged")
    if (previous.resend === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = previous.resend
    if (previous.from === undefined) delete process.env.FOLLOW_UP_FROM_EMAIL
    else process.env.FOLLOW_UP_FROM_EMAIL = previous.from
    if (previous.sid === undefined) delete process.env.TWILIO_ACCOUNT_SID
    else process.env.TWILIO_ACCOUNT_SID = previous.sid
    if (previous.token === undefined) delete process.env.TWILIO_AUTH_TOKEN
    else process.env.TWILIO_AUTH_TOKEN = previous.token
    if (previous.twilioFrom === undefined) delete process.env.TWILIO_FROM_NUMBER
    else process.env.TWILIO_FROM_NUMBER = previous.twilioFrom
  })
})
