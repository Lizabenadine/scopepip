import { strict as assert } from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { runSendEstimateWorkflow } from "./send-workflow.ts"

describe("runSendEstimateWorkflow", () => {
  it("saves locally, confirms server persistence before emailing, and moves stage only after send succeeds", async () => {
    const events: string[] = []

    const result = await runSendEstimateWorkflow({
      persistLocal: () => {
        events.push("persistLocal")
        return { id: "est-123", clientId: "client-1", publicToken: "tok123456" }
      },
      confirmServerSave: async (estimateId) => {
        events.push(`confirmServerSave:${estimateId}`)
        return { ok: true }
      },
      onConfirmedSave: (saved) => {
        events.push(`onConfirmedSave:${saved.id}`)
      },
      sendEmail: async (saved) => {
        events.push(`sendEmail:${saved.id}`)
        return { ok: true, message: "Sent." }
      },
      onSentSuccess: async (saved) => {
        events.push(`onSentSuccess:${saved.id}`)
      },
    })

    assert.equal(result.ok, true)
    assert.deepEqual(events, [
      "persistLocal",
      "confirmServerSave:est-123",
      "onConfirmedSave:est-123",
      "sendEmail:est-123",
      "onSentSuccess:est-123",
    ])
  })

  it("stops before emailing and does not advance stage when server save confirmation fails", async () => {
    const events: string[] = []

    const result = await runSendEstimateWorkflow({
      persistLocal: () => {
        events.push("persistLocal")
        return { id: "est-unsaved", clientId: "client-1", publicToken: "tok999999" }
      },
      confirmServerSave: async () => {
        events.push("confirmServerSave")
        return { ok: false, reason: "Connection error saving this estimate. Your edits are still on screen." }
      },
      onConfirmedSave: () => {
        events.push("onConfirmedSave")
      },
      sendEmail: async () => {
        events.push("sendEmail")
        return { ok: true, message: "Sent." }
      },
      onSentSuccess: () => {
        events.push("onSentSuccess")
      },
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.stage, "save")
      assert.match(result.reason, /Connection error/i)
    }
    assert.deepEqual(events, ["persistLocal", "confirmServerSave"])
  })

  it("does not advance stage to Estimate Sent when email delivery fails", async () => {
    const events: string[] = []

    const result = await runSendEstimateWorkflow({
      persistLocal: () => {
        events.push("persistLocal")
        return { id: "est-456", clientId: "client-2", publicToken: "tok654321" }
      },
      confirmServerSave: async () => {
        events.push("confirmServerSave")
        return { ok: true }
      },
      onConfirmedSave: () => {
        events.push("onConfirmedSave")
      },
      sendEmail: async () => {
        events.push("sendEmail")
        return { ok: false, reason: "SMTP authentication failed." }
      },
      onSentSuccess: () => {
        events.push("onSentSuccess")
      },
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.stage, "email")
      assert.equal(result.reason, "SMTP authentication failed.")
    }
    assert.deepEqual(events, ["persistLocal", "confirmServerSave", "onConfirmedSave", "sendEmail"])
  })

  it("email route confirms the saved proposal record on disk/book before emailing", () => {
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "app/api/proposals/[id]/email/route.ts"),
      "utf8",
    )
    assert.equal(routeSource.includes("fallbackEstimate"), false)
    assert.match(routeSource, /!book \|\| !estimate \|\| !estimate\.publicToken/)
  })
})
