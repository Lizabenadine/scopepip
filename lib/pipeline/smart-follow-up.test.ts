import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { getSmartFollowUpReminder } from "./smart-follow-up.ts"
import { DEFAULT_ESTIMATE_SETTINGS } from "../defaults.ts"
import type { Client, Estimate } from "../types.ts"

function createMockEstimate(patch: Partial<Estimate> = {}): Estimate {
  return {
    id: "est-test-1",
    clientId: "client-1",
    stageId: "stage-sent",
    title: "Interior Painting 4 Rooms",
    jobAddress: "123 Maple St",
    areas: [],
    lineItems: [],
    rates: [],
    settings: { ...DEFAULT_ESTIMATE_SETTINGS },
    scheduledOn: null,
    notes: "",
    crewNote: "",
    acceptedAt: null,
    declinedAt: null,
    publicToken: "tok-123",
    clientStatus: "sent",
    signature: null,
    salesStage: "proposal_sent",
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    ...patch,
  }
}

const mockClient: Client = {
  id: "client-1",
  name: "Sarah Jenkins",
  phone: "(503) 555-1234",
  email: "sarah@jenkins.local",
  address: "123 Maple St",
  notes: "",
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
}

describe("Smart Follow-Up Reminders", () => {
  const sentMs = new Date("2026-11-01T12:00:00.000Z").getTime()
  const DAY_MS = 24 * 60 * 60 * 1000

  it("does not show a reminder before 3 days have elapsed", () => {
    const est = createMockEstimate({ updatedAt: "2026-11-01T12:00:00.000Z" })
    const now2Days = sentMs + 2 * DAY_MS
    const reminder = getSmartFollowUpReminder({ estimate: est, client: mockClient, nowMs: now2Days })
    assert.equal(reminder, null)
  })

  it("shows a 3-day reminder after 3 days have elapsed with personalized message", () => {
    const est = createMockEstimate({ updatedAt: "2026-11-01T12:00:00.000Z" })
    const now3Days = sentMs + 3.5 * DAY_MS
    const reminder = getSmartFollowUpReminder({ estimate: est, client: mockClient, nowMs: now3Days })
    assert.ok(reminder)
    assert.equal(reminder.milestone, "3d")
    assert.equal(reminder.daysElapsed, 3)
    assert.ok(reminder.suggestedMessage.includes("Hi Sarah"))
    assert.ok(reminder.suggestedMessage.includes("Interior Painting 4 Rooms"))
  })

  it("shows a 7-day reminder after 7 days have elapsed", () => {
    const est = createMockEstimate({ updatedAt: "2026-11-01T12:00:00.000Z" })
    const now7Days = sentMs + 7.5 * DAY_MS
    const reminder = getSmartFollowUpReminder({ estimate: est, client: mockClient, nowMs: now7Days })
    assert.ok(reminder)
    assert.equal(reminder.milestone, "7d")
    assert.equal(reminder.daysElapsed, 7)
    assert.ok(reminder.suggestedMessage.includes("Hi Sarah"))
    assert.ok(reminder.suggestedMessage.includes("production schedule"))
  })

  it("allows contractors to dismiss reminders via tag", () => {
    const est3d = createMockEstimate({
      updatedAt: "2026-11-01T12:00:00.000Z",
      tags: ["dismissed-followup-3d"],
    })
    const now4Days = sentMs + 4 * DAY_MS
    const reminder = getSmartFollowUpReminder({ estimate: est3d, client: mockClient, nowMs: now4Days })
    assert.equal(reminder, null)

    // But once 7 days arrive, the 7-day reminder triggers unless also dismissed
    const now7Days = sentMs + 7.5 * DAY_MS
    const reminder7d = getSmartFollowUpReminder({ estimate: est3d, client: mockClient, nowMs: now7Days })
    assert.ok(reminder7d)
    assert.equal(reminder7d.milestone, "7d")
  })

  it("automatically stops reminders when the estimate is accepted", () => {
    const estAccepted = createMockEstimate({
      updatedAt: "2026-11-01T12:00:00.000Z",
      clientStatus: "accepted",
      acceptedAt: "2026-11-04T10:00:00.000Z",
    })
    const now5Days = sentMs + 5 * DAY_MS
    const reminder = getSmartFollowUpReminder({ estimate: estAccepted, client: mockClient, nowMs: now5Days })
    assert.equal(reminder, null)
  })

  it("automatically stops reminders when the estimate is declined", () => {
    const estDeclined = createMockEstimate({
      updatedAt: "2026-11-01T12:00:00.000Z",
      clientStatus: "declined",
      declinedAt: "2026-11-04T10:00:00.000Z",
    })
    const now5Days = sentMs + 5 * DAY_MS
    const reminder = getSmartFollowUpReminder({ estimate: estDeclined, client: mockClient, nowMs: now5Days })
    assert.equal(reminder, null)
  })

  it("automatically stops reminders when the job is scheduled", () => {
    const estScheduled = createMockEstimate({
      updatedAt: "2026-11-01T12:00:00.000Z",
      scheduledOn: "2026-11-15",
    })
    const now5Days = sentMs + 5 * DAY_MS
    const reminder = getSmartFollowUpReminder({ estimate: estScheduled, client: mockClient, nowMs: now5Days })
    assert.equal(reminder, null)
  })

  it("does not trigger reminders for draft or unsent estimates", () => {
    const estDraft = createMockEstimate({
      clientStatus: "draft",
      salesStage: "cold",
      updatedAt: "2026-11-01T12:00:00.000Z",
    })
    const now10Days = sentMs + 10 * DAY_MS
    const reminder = getSmartFollowUpReminder({ estimate: estDraft, client: mockClient, nowMs: now10Days })
    assert.equal(reminder, null)
  })
})
