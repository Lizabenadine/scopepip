import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import type { FollowUpMessage } from "../follow-ups/types.ts"
import { ackProposalEvents, addProposalEvent, readProposalEvents } from "../proposals/event-spool.ts"
import { applyProposalEvent } from "../proposals/opens.ts"
import { recordInteraction, recordStageChanges } from "./activity.ts"
import { contactHistory } from "./history.ts"

const AT = "2026-10-18T16:00:00.000Z"

describe("contact history", () => {
  it("logs a sales move once", () => {
    const before = createSeedState()
    const after = {
      ...before,
      estimates: before.estimates.map((estimate) =>
        estimate.id === "est-maya" ? { ...estimate, salesStage: "warm" as const } : estimate,
      ),
    }
    const next = recordStageChanges(before, after, AT)
    const maya = next.estimates.find((estimate) => estimate.id === "est-maya")
    assert.equal(maya?.stageChanges?.length, 1)
    assert.equal(maya?.stageChanges?.[0]?.label, "Moved to Contacted")
    assert.equal(recordStageChanges(next, next, "2026-10-18T17:00:00.000Z"), next)
  })

  it("lists texts, emails, proposal opens, stage changes, and notes newest first", () => {
    const state = createSeedState()
    const mayaEstimate = state.estimates.find((estimate) => estimate.id === "est-maya")
    const mayaClient = state.clients.find((client) => client.id === "client-maya")
    assert.ok(mayaEstimate)
    assert.ok(mayaClient)
    const textFollowUp: FollowUpMessage = {
      id: "fu-text",
      estimateId: "est-maya",
      stepId: "cold-text",
      stage: "cold",
      channel: "text",
      to: "(503) 555-0148",
      subject: "",
      body: "This text stays on the thread.",
      sentAt: "2026-10-18T18:00:00.000Z",
      delivery: "logged",
      detail: "",
    }
    const email: FollowUpMessage = {
      id: "fu-email",
      estimateId: "est-maya",
      stepId: "cold-email",
      stage: "cold",
      channel: "email",
      to: "maya@example.com",
      subject: "A walkthrough",
      body: "We can price the main floor.",
      sentAt: "2026-10-18T13:00:00.000Z",
      delivery: "logged",
      detail: "",
    }
    const entries = contactHistory(
      {
        ...mayaClient,
        messages: [
          {
            id: "sms-1",
            direction: "in",
            body: "Thursday afternoon works.",
            mediaUrls: [],
            createdAt: "2026-10-18T12:00:00.000Z",
            estimateId: "est-maya",
            delivery: "received",
          },
        ],
      },
      [
        {
          ...mayaEstimate,
          followUpLog: [textFollowUp, email],
          proposalOpens: [{ id: "open-1", at: "2026-10-18T14:00:00.000Z", kind: "open" }],
          stageChanges: [{ id: "stage-1", at: "2026-10-18T15:00:00.000Z", label: "Moved to Warm Leads" }],
        },
      ],
    )
    const labels = entries.map((entry) => entry.label)
    assert.ok(labels.indexOf("Text logged") < labels.indexOf("Moved to Warm Leads"))
    assert.ok(labels.indexOf("Moved to Warm Leads") < labels.indexOf("Opened the proposal"))
    assert.ok(labels.indexOf("Opened the proposal") < labels.indexOf("Email logged: A walkthrough"))
    assert.ok(labels.indexOf("Email logged: A walkthrough") < labels.indexOf("Text received"))
    assert.ok(labels.includes("Lead created"))
    assert.ok(labels.includes("Note"))
    assert.equal(
      entries.some((entry) => entry.body.includes("This text stays on the thread.")),
      true,
    )
    const note = entries.find((entry) => entry.kind === "note")
    assert.equal(note?.body.includes("Ceilings stay eggshell."), true)
    assert.equal(note?.at, mayaEstimate.createdAt)
    assert.equal(entries.find((entry) => entry.label === "Text received")?.body.includes("Thursday afternoon works."), true)
    assert.equal(entries[0]?.at > entries[entries.length - 1]!.at, true)
  })

  it("stores a proposal open and ignores a section view", () => {
    const state = createSeedState()
    const open = {
      proposalId: "k7m2p9qx4n",
      eventType: "open" as const,
      sectionName: null,
      timestamp: AT,
      userAgent: "test",
    }
    const next = applyProposalEvent(state, open)
    const ortiz = next.estimates.find((estimate) => estimate.id === "est-ortiz")
    assert.equal(ortiz?.proposalOpens?.length, 1)
    assert.equal(ortiz?.proposalOpens?.[0]?.kind, "open")
    assert.equal(applyProposalEvent(next, open), next)
    assert.equal(
      applyProposalEvent(next, {
        ...open,
        eventType: "view_section",
        sectionName: "scope",
        timestamp: "2026-10-18T16:05:00.000Z",
      }),
      next,
    )
  })

  it("stores one proposal event and drops it on ack", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "scopepipe-opens-"))
    process.env.PROPOSAL_EVENT_SPOOL_PATH = path.join(directory, "events.json")
    const event = {
      proposalId: "k7m2p9qx4n",
      eventType: "open" as const,
      sectionName: null,
      timestamp: AT,
      userAgent: "test",
    }
    addProposalEvent(event)
    addProposalEvent(event)
    const stored = readProposalEvents()
    assert.equal(stored.length, 1)
    ackProposalEvents([stored[0]!.id])
    assert.equal(readProposalEvents().length, 0)
    delete process.env.PROPOSAL_EVENT_SPOOL_PATH
  })

  it("keeps a recorded call on the customer timeline and off the proposal note", () => {
    const state = createSeedState()
    const client = state.clients.find((item) => item.id === "client-maya")
    const estimate = state.estimates.find((item) => item.id === "est-maya")
    assert.ok(client)
    assert.ok(estimate)
    const withCall = recordInteraction(client, "call", "Left a voicemail about the hallway.", AT)
    const entries = contactHistory(withCall, [estimate])
    const call = entries.find((entry) => entry.kind === "call")
    assert.equal(call?.label, "Call")
    assert.equal(call?.status, "Internal")
    assert.equal(call?.body, "Left a voicemail about the hallway.")
    assert.equal(estimate.notes.includes("voicemail"), false)
  })
})
