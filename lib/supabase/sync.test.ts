import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createBlankState } from "../data/company-book.ts"
import { estimateSyncPayload, mergeCloud, stableRemoteId } from "./sync.ts"

const companyId = "company-hale"

describe("estimate sync payload", () => {
  it("keeps a uuid and derives a stable id for a local key", async () => {
    const uuid = "5AF C215F-DA45-4D3A-8405-C001361469C5".replace(" ", "")
    assert.equal(await stableRemoteId(companyId, "estimate", uuid), uuid.toLowerCase())
    const first = await stableRemoteId(companyId, "estimate", "est-jim-ab12")
    const second = await stableRemoteId(companyId, "estimate", "est-jim-ab12")
    const otherCompany = await stableRemoteId("company-ortiz", "estimate", "est-jim-ab12")
    assert.equal(first, second)
    assert.notEqual(first, otherCompany)
    assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it("writes the whole-job totals and one row per area", async () => {
    const payload = await estimateSyncPayload({
      companyId,
      client: {
        id: "client-jim",
        name: "  Jim Patel  ",
        phone: "503-555-0177",
        email: "jim@patel.test",
        address: "410 Elm Street",
      },
      estimate: {
        id: "est-jim",
        title: " Primary bedroom ",
        clientStatus: "sent",
        areas: [
          {
            id: "jim-bedroom",
            name: "Bedroom",
            areaType: "room",
            lengthFt: 12,
            widthFt: 15,
            heightFt: 8,
            crewNote: "",
            surfaces: [],
          },
          {
            id: "jim-hall",
            name: " ",
            areaType: "room",
            lengthFt: 20,
            widthFt: 4,
            heightFt: 8,
            crewNote: "",
            surfaces: [],
          },
        ],
      },
      quote: {
        wallSqFt: 432,
        paintGallons: 1.246,
        allocatedHours: 6.1254,
        total: 899.2,
      },
    })

    assert.equal(payload.client.name, "Jim Patel")
    assert.equal(payload.estimate.client_id, payload.client.id)
    assert.equal(payload.estimate.room_name, "Primary bedroom")
    assert.equal(payload.estimate.length, 12)
    assert.equal(payload.estimate.width, 15)
    assert.equal(payload.estimate.height, 8)
    assert.equal(payload.estimate.wall_sqft, 432)
    assert.equal(payload.estimate.labor_hours, 6.125)
    assert.equal(payload.estimate.gallons_needed, 1.246)
    assert.equal(payload.estimate.total_price, 899.2)
    assert.equal(payload.estimate.status, "sent")
    assert.equal(payload.areas.length, 2)
    assert.equal(payload.areas[0]?.name, "Bedroom")
    assert.equal(payload.areas[0]?.project_id, payload.estimate.id)
    assert.equal(payload.areas[1]?.name, "Area")
    assert.equal(payload.areas[1]?.length, 20)
    assert.notEqual(payload.areas[0]?.id, payload.areas[1]?.id)
  })

  it("uses a fallback name and zeroes missing measures", async () => {
    const payload = await estimateSyncPayload({
      companyId,
      client: { id: "c1", name: "  ", phone: "", email: "", address: "" },
      estimate: { id: "e1", title: "", clientStatus: "draft", areas: [] },
      quote: { wallSqFt: Number.NaN, paintGallons: -3, allocatedHours: 0, total: 0 },
    })
    assert.equal(payload.client.name, "Client")
    assert.equal(payload.estimate.room_name, "Interior repaint")
    assert.equal(payload.estimate.length, 0)
    assert.equal(payload.estimate.wall_sqft, 0)
    assert.equal(payload.estimate.gallons_needed, 0)
    assert.deepEqual(payload.areas, [])
  })
})

describe("merge cloud rows", () => {
  it("adds a client, estimate, room, and work order the book does not have", () => {
    const merged = mergeCloud(createBlankState(), {
      clients: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Nara Quinn",
          email: "nara@example.com",
          phone: "503-555-0100",
          address: "18 Market Street",
          created_at: "2026-10-19T00:00:00.000Z",
        },
      ],
      estimates: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          client_id: "11111111-1111-4111-8111-111111111111",
          room_name: "Primary bedroom",
          length: 12,
          width: 15,
          height: 8,
          wall_sqft: 432,
          labor_hours: 13.5,
          gallons_needed: 3.87,
          total_price: 1012.5,
          status: "draft",
          created_at: "2026-10-19T00:00:00.000Z",
        },
      ],
      areas: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          project_id: "22222222-2222-4222-8222-222222222222",
          name: "Bedroom",
          length: 12,
          width: 15,
          height: 8,
        },
      ],
      workOrders: [
        {
          estimateId: "22222222-2222-4222-8222-222222222222",
          prepNotes: "Cover the floors",
          hourDisplay: "all",
          status: "scheduled",
          assignedCrewId: null,
          scheduledStartDate: "2026-10-21",
          notifiedAt: "2026-10-19T01:00:00.000Z",
          checklist: [{ id: "cover", label: "Cover floors", done: true }],
        },
      ],
    })
    assert.equal(merged.changed, true)
    assert.equal(merged.state.clients[0]?.name, "Nara Quinn")
    assert.equal(merged.state.estimates[0]?.title, "Primary bedroom")
    assert.equal(merged.state.estimates[0]?.areas[0]?.name, "Bedroom")
    assert.equal(merged.state.estimates[0]?.lineItems[0]?.customPrice, 1012.5)
    assert.equal(merged.state.workOrders[0]?.status, "scheduled")
    assert.equal(merged.state.workOrders[0]?.prepNotes, "Cover the floors")
  })

  it("leaves an estimate that is already in the book alone", () => {
    const state = createBlankState()
    const clientId = "11111111-1111-4111-8111-111111111111"
    const estimateId = "22222222-2222-4222-8222-222222222222"
    state.clients = [
      {
        id: clientId,
        name: "Local name",
        phone: "",
        email: "",
        address: "",
        notes: "Keep this",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ]
    state.estimates = [
      {
        id: estimateId,
        clientId,
        stageId: state.stages[0]?.id ?? "",
        title: "Local title",
        jobAddress: "",
        areas: [],
        lineItems: [],
        rates: state.productionRates,
        settings: state.estimateSettings,
        scheduledOn: null,
        notes: "",
        crewNote: "",
        acceptedAt: null,
        publicToken: "localtoken",
        clientStatus: "sent",
        signature: null,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ]
    const merged = mergeCloud(state, {
      clients: [
        {
          id: clientId,
          name: "Remote name",
          email: null,
          phone: null,
          address: null,
          created_at: "2026-10-02T00:00:00.000Z",
        },
      ],
      estimates: [
        {
          id: estimateId,
          client_id: clientId,
          room_name: "Remote title",
          length: 1,
          width: 1,
          height: 1,
          wall_sqft: 1,
          labor_hours: 1,
          gallons_needed: 1,
          total_price: 50,
          status: "draft",
          created_at: "2026-10-02T00:00:00.000Z",
        },
      ],
      areas: [],
      workOrders: [],
    })
    assert.equal(merged.changed, false)
    assert.equal(merged.state.clients[0]?.name, "Local name")
    assert.equal(merged.state.estimates[0]?.title, "Local title")
    assert.equal(merged.state.estimates[0]?.clientStatus, "sent")
  })
})
