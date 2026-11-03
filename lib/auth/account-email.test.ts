import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DUPLICATE_ACCOUNT_EMAIL,
  accountEmailTaken,
  canonicalizeUniqueEmails,
  introducesDuplicateEmail,
  normalizeAccountEmail,
} from "./account-email.ts"

describe("account email", () => {
  it("trims and lowercases an address", () => {
    assert.equal(normalizeAccountEmail("  John@Example.com  "), "john@example.com")
  })

  it("treats case and surrounding spaces as the same account", () => {
    const users = [{ email: "john@example.com" }]
    assert.equal(accountEmailTaken(users, "John@example.com"), true)
    assert.equal(accountEmailTaken(users, "  john@example.com "), true)
    assert.equal(accountEmailTaken(users, "other@example.com"), false)
  })

  it("blocks a new duplicate and keeps an address that was already saved twice", () => {
    const existing = [{ email: "John@example.com" }, { email: "john@example.com" }]
    assert.equal(introducesDuplicateEmail(existing, existing), false)
    assert.equal(
      introducesDuplicateEmail(existing, [...existing, { email: " JOHN@example.com " }]),
      true,
    )
    assert.equal(
      introducesDuplicateEmail([{ email: "ada@hale.test" }], [{ email: "ada@hale.test" }, { email: "bea@ortiz.test" }]),
      false,
    )
  })

  it("normalizes a single address and does not drop a duplicate account", () => {
    const rows = canonicalizeUniqueEmails([
      { id: "a", email: "  John@Example.com " },
      { id: "b", email: "john@example.com" },
      { id: "c", email: " Bea@Ortiz.test " },
    ])
    assert.equal(rows.length, 3)
    assert.equal(rows[0]?.email, "  John@Example.com ")
    assert.equal(rows[1]?.email, "john@example.com")
    assert.equal(rows[2]?.email, "bea@ortiz.test")
    assert.equal(DUPLICATE_ACCOUNT_EMAIL.includes("already exists"), true)
  })
})
