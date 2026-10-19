import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { engagementTimestamp, proposalEngagementEvent } from "./engagement.ts"

const timestamp = "2026-10-06T21:40:00.000Z"

describe("proposalEngagementEvent", () => {
  it("records an open, a section view, and a revisit", () => {
    const opened = proposalEngagementEvent({
      proposalId: "k7m2p9qx4n",
      timestamp,
      userAgent: "ScopePipe test",
    })
    assert.equal(opened.ok, true)
    if (!opened.ok) return
    assert.equal(opened.event.eventType, "open")
    assert.equal(opened.event.sectionName, null)
    assert.equal(opened.event.userAgent, "ScopePipe test")

    const section = proposalEngagementEvent({
      proposalId: " est-ortiz ",
      eventType: "view_section",
      sectionName: "  Optional add-ons  ",
      timestamp,
      userAgent: "",
    })
    assert.equal(section.ok, true)
    if (!section.ok) return
    assert.equal(section.event.proposalId, "est-ortiz")
    assert.equal(section.event.sectionName, "Optional add-ons")
    assert.equal(section.event.userAgent, "unknown")

    const revisit = proposalEngagementEvent({
      proposalId: "k7m2p9qx4n",
      eventType: "revisit",
      timestamp,
      userAgent: "ScopePipe test",
    })
    assert.equal(revisit.ok, true)
    if (!revisit.ok) return
    assert.equal(revisit.event.eventType, "revisit")
  })

  it("keeps a client timestamp and drops one that is not a time", () => {
    const now = "2026-10-06T21:58:00.000Z"
    assert.equal(engagementTimestamp("2026-10-06T21:40:00.000Z", now), timestamp)
    assert.equal(engagementTimestamp("not-a-time", now), now)
    assert.equal(engagementTimestamp(undefined, now), now)
  })

  it("rejects an unknown event", () => {
    const result = proposalEngagementEvent({
      proposalId: "k7m2p9qx4n",
      eventType: "click",
      timestamp,
      userAgent: "ScopePipe test",
    })
    assert.equal(result.ok, false)
  })
})
