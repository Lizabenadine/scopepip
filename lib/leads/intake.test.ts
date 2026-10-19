import assert from "node:assert/strict"
import { mkdtempSync, readFileSync } from "node:fs"
import path from "node:path"
import { tmpdir } from "node:os"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { collectDueFollowUps, reconcileFollowUps } from "../follow-ups/schedule.ts"
import { buildPipeline, OPEN_FILTERS } from "../pipeline/board.ts"
import { applyInboundLead } from "./apply.ts"
import { parseInbound } from "./parse.ts"
import { ackLeadSpool, addLeadSpool, readLeadSpool } from "./spool.ts"
import type { InboundLead } from "./types.ts"

const NOW = "2026-10-18T21:00:00.000Z"

describe("inbound leads", () => {
  it("reads a website request, a Thumbtack lead, an Angi lead, and a Google Local Services lead", () => {
    const website = parseInbound(
      "website",
      { name: "June Adler", phone: "(503) 555-0171", address: "14 Knott St, Portland", message: "Two bedrooms and the hall." },
      NOW,
    )
    assert.equal(website.ok, true)
    if (!website.ok) return
    assert.equal(website.leads[0]?.source, "website")
    assert.equal(website.leads[0]?.phone, "(503) 555-0171")

    const thumbtack = parseInbound(
      "thumbtack",
      {
        leadID: "tt-88",
        customer: { name: "Helen Cho", phone: "(503) 555-0160" },
        request: { description: "Exterior trim", location: "9 Knott St, Portland" },
      },
      NOW,
    )
    assert.equal(thumbtack.ok, true)
    if (!thumbtack.ok) return
    assert.equal(thumbtack.leads[0]?.id, "tt-88")
    assert.equal(thumbtack.leads[0]?.message, "Exterior trim")

    const angi = parseInbound(
      "angi",
      { leadId: "angi-4", firstName: "Omar", lastName: "Singh", primaryPhone: "5035550191", email: "omar@example.test", comments: "Cabinets" },
      NOW,
    )
    assert.equal(angi.ok, true)
    if (!angi.ok) return
    assert.equal(angi.leads[0]?.name, "Omar Singh")
    assert.equal(angi.leads[0]?.source, "angi")

    const google = parseInbound(
      "google_lsa",
      { leadId: "lsa-2", contactDetails: { consumerName: "Priya Nair", phoneNumber: "+15035550111", email: "priya@example.test" }, message: "Living room" },
      NOW,
    )
    assert.equal(google.ok, true)
    if (!google.ok) return
    assert.equal(google.leads[0]?.source, "google_lsa")
    assert.equal(google.leads[0]?.name, "Priya Nair")
  })

  it("turns Facebook form answers into a lead and acknowledges a lead id that has no answers yet", () => {
    const answered = parseInbound(
      "facebook",
      {
        entry: [
          {
            changes: [
              {
                field: "leadgen",
                value: {
                  leadgen_id: "fb-9",
                  field_data: [
                    { name: "full_name", values: ["June Adler"] },
                    { name: "phone_number", values: ["(503) 555-0171"] },
                    { name: "street_address", values: ["14 Knott St"] },
                  ],
                },
              },
            ],
          },
        ],
      },
      NOW,
    )
    assert.equal(answered.ok, true)
    if (!answered.ok) return
    assert.equal(answered.leads[0]?.id, "fb-9")
    assert.equal(answered.leads[0]?.source, "facebook")

    const pending = parseInbound(
      "facebook",
      { entry: [{ changes: [{ field: "leadgen", value: { leadgen_id: "fb-wait" } }] }] },
      NOW,
    )
    assert.equal(pending.ok, true)
    if (!pending.ok) return
    assert.equal(pending.leads.length, 0)
    assert.equal(parseInbound("website", { name: "June Adler" }, NOW).ok, false)
  })

  it("opens a Cold Leads card, starts the cold sequence, and ignores the same provider id", () => {
    const lead: InboundLead = {
      id: "web-1",
      source: "website",
      name: "June Adler",
      phone: "(503) 555-0171",
      email: "june@example.test",
      address: "14 Knott St, Portland",
      message: "Two bedrooms and the hall.",
      createdAt: NOW,
    }
    const opened = applyInboundLead(createSeedState(), lead)
    const estimate = opened.estimates.find((item) => item.inboundLeadId === "web-1")
    assert.ok(estimate)
    assert.equal(estimate?.salesStage, "cold")
    assert.equal(estimate?.leadSource, "website")
    assert.equal(estimate?.title, "Two bedrooms and the hall.")
    assert.equal(opened.clients.filter((client) => client.name === "June Adler").length, 1)
    const reconciled = reconcileFollowUps(opened, NOW)
    const enrolled = reconciled.estimates.find((item) => item.inboundLeadId === "web-1")
    assert.equal(enrolled?.followUp?.status, "active")
    assert.equal(enrolled?.followUp?.stage, "cold")
    const due = collectDueFollowUps(reconciled, Date.parse(NOW))
    assert.equal(due.some((item) => item.estimateId === estimate?.id && item.channel === "text"), true)
    const cold = buildPipeline(reconciled, "sales", OPEN_FILTERS, "2026-10-18").find((column) => column.id === "cold")
    const card = cold?.cards.find((item) => item.estimateId === estimate?.id)
    assert.equal(card?.clientName, "June Adler")
    assert.equal(card?.total, 0)
    assert.equal(applyInboundLead(reconciled, lead), reconciled)
  })

  it("adds another cold card on the client who already has that phone", () => {
    const lead: InboundLead = {
      id: "tt-maya",
      source: "thumbtack",
      name: "Maya Chen",
      phone: "+1 (503) 555-0148",
      email: "",
      address: "",
      message: "Hallway",
      createdAt: NOW,
    }
    const next = applyInboundLead(createSeedState(), lead)
    assert.equal(next.clients.filter((client) => client.phone.includes("555-0148")).length, 1)
    const estimate = next.estimates.find((item) => item.inboundLeadId === "tt-maya")
    assert.equal(estimate?.clientId, "client-maya")
    assert.equal(estimate?.leadSource, "thumbtack")
  })

  it("keeps a lead in the spool until the office claims it", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "scopepipe-leads-"))
    process.env.LEAD_SPOOL_PATH = path.join(directory, "spool.json")
    const lead: InboundLead = {
      id: "angi-4",
      source: "angi",
      name: "Omar Singh",
      phone: "5035550191",
      email: "",
      address: "",
      message: "Cabinets",
      createdAt: NOW,
    }
    addLeadSpool(lead)
    addLeadSpool(lead)
    assert.equal(readLeadSpool().length, 1)
    assert.equal(readFileSync(process.env.LEAD_SPOOL_PATH, "utf8").includes("angi-4"), true)
    ackLeadSpool(["angi-4"])
    assert.equal(readLeadSpool().length, 0)
    delete process.env.LEAD_SPOOL_PATH
  })
})
