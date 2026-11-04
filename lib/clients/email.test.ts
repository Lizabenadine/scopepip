import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { clientByEmail, normalizeClientEmail } from "./email.ts"

describe("client email", () => {
  const clients = [
    { id: "maya", name: "Maya Chen", email: "Maya@Chen.test" },
    { id: "wade", name: "Wade Ellis", email: "" },
  ]

  it("treats case and spaces as the same address", () => {
    assert.equal(normalizeClientEmail("  Maya@Chen.test "), "maya@chen.test")
    assert.equal(clientByEmail(clients, "maya@chen.test")?.id, "maya")
    assert.equal(clientByEmail(clients, "  MAYA@chen.test ")?.id, "maya")
  })

  it("does not match a blank or incomplete address", () => {
    assert.equal(clientByEmail(clients, ""), null)
    assert.equal(clientByEmail(clients, "maya"), null)
    assert.equal(clientByEmail(clients, "new@chen.test"), null)
  })
})
