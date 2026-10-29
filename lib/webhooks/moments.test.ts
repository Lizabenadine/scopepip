import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ScopeState } from "../data/seed.ts"
import type { Estimate, WorkOrder } from "../types.ts"
import { hookMoments } from "./moments.ts"

const stages = [
  { id: "stage-lead", slug: "lead" as const, name: "Lead", sortOrder: 0 },
  { id: "stage-sent", slug: "estimate_sent" as const, name: "Estimate Sent", sortOrder: 1 },
  { id: "stage-done", slug: "completed" as const, name: "Completed", sortOrder: 3 },
]

function estimate(patch: Partial<Estimate> & Pick<Estimate, "id">): Estimate {
  return {
    clientId: "client-1",
    stageId: "stage-lead",
    title: "Interior",
    jobAddress: "9 Knott St",
    clientStatus: "draft",
    salesStage: null,
    acceptedAt: null,
    signature: null,
    createdAt: "2026-10-29T18:00:00.000Z",
    updatedAt: "2026-10-29T18:00:00.000Z",
    ...patch,
  } as Estimate
}

function book(estimates: Estimate[], workOrders: WorkOrder[] = []): Pick<ScopeState, "clients" | "estimates" | "workOrders" | "stages"> {
  return {
    clients: [{ id: "client-1", name: "June Adler", email: "june@example.com", phone: "503-555-0100" } as ScopeState["clients"][number]],
    stages,
    estimates,
    workOrders,
  }
}

const open = estimate({ id: "est-1" })

describe("hook moments", () => {
  it("posts a new lead, a sent proposal, a signature, and a finished job once", () => {
    const sent = estimate({ id: "est-1", clientStatus: "sent", salesStage: "proposal_sent", updatedAt: "2026-10-30T18:00:00.000Z" })
    const signed = estimate({
      id: "est-1",
      clientStatus: "accepted",
      acceptedAt: "2026-10-31T18:00:00.000Z",
      signature: { signedName: "June Adler", signaturePayload: "sig", signedAt: "2026-10-31T18:00:00.000Z", selectedLineIds: [] },
      updatedAt: "2026-10-31T18:00:00.000Z",
    })
    const done = { ...signed, stageId: "stage-done", updatedAt: "2026-11-02T18:00:00.000Z" }
    const order = { estimateId: "est-1", status: "complete" } as WorkOrder

    assert.deepEqual(hookMoments(book([]), book([open])).map((item) => item.event), ["lead.created"])
    assert.equal(hookMoments(book([]), book([open]))[0]?.payload.client.name, "June Adler")
    assert.deepEqual(hookMoments(book([open]), book([sent])).map((item) => item.event), ["proposal.sent"])
    assert.deepEqual(hookMoments(book([sent]), book([signed])).map((item) => item.event), ["proposal.signed"])
    assert.deepEqual(hookMoments(book([signed]), book([done], [order])).map((item) => item.event), ["job.completed"])
    assert.deepEqual(hookMoments(book([done], [order]), book([done], [order])), [])
  })
})
