import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { hashPassword, verifyPassword } from "./password.ts"
import { readSession, signSession } from "./session-token.ts"

const dir = mkdtempSync(path.join(tmpdir(), "scopepipe-accounts-"))
process.env.ACCOUNTS_PATH = path.join(dir, "accounts.json")
process.env.BOOKS_DIR = path.join(dir, "books")
process.env.AUTH_SECRET = "test-secret"

const { addProjectManager, login, publicProposal, readCompanyBook, signup, writeCompanyBook } = await import("./directory.ts")

describe("accounts", () => {
  it("checks a password and a session token", () => {
    const stored = hashPassword("password1")
    assert.equal(verifyPassword("password1", stored), true)
    assert.equal(verifyPassword("password2", stored), false)
    const token = signSession("user-1", "test-secret", 1_000)
    assert.equal(readSession(token, "test-secret", 1_000), "user-1")
    assert.equal(readSession(token, "other-secret", 1_000), null)
    assert.equal(readSession(token, "test-secret", 1_000 + 31 * 24 * 60 * 60 * 1000), null)
  })

  it("gives each company its own book and keeps the owner role on the account", async () => {
    const hale = await signup({
      name: "Ada Hale",
      email: "ada@hale.test",
      password: "password1",
      companyName: "Hale Painting",
    })
    const other = await signup({
      name: "Bea Ortiz",
      email: "bea@ortiz.test",
      password: "password2",
      companyName: "Ortiz Painting",
    })
    assert.equal(hale.ok, true)
    assert.equal(other.ok, true)
    if (!hale.ok || !other.ok) return
    assert.equal(hale.user.role, "owner")
    assert.notEqual(hale.user.companyId, other.user.companyId)

    const haleBook = await readCompanyBook(hale.user.companyId)
    const otherBook = await readCompanyBook(other.user.companyId)
    assert.ok(haleBook)
    assert.ok(otherBook)
    if (!haleBook || !otherBook) return
    assert.equal(haleBook.state.estimateSettings.companyName, "Hale Painting")
    assert.notEqual(haleBook.state.estimates[0]?.publicToken, otherBook.state.estimates[0]?.publicToken)
    assert.equal(haleBook.state.clients.some((client) => client.name === "Maya Chen"), true)

    const cleared = await writeCompanyBook(hale.user.companyId, haleBook.revision, { ...haleBook.state, clients: [] })
    assert.equal(cleared.ok, true)
    const again = await writeCompanyBook(hale.user.companyId, haleBook.revision, haleBook.state)
    assert.equal(again.ok, false)
    assert.equal((await readCompanyBook(other.user.companyId))?.state.clients.length, otherBook.state.clients.length)

    const manager = await addProjectManager(hale.user.id, {
      name: "Priya Shah",
      email: "priya@hale.test",
      password: "password3",
    })
    assert.equal(manager.ok, true)
    if (!manager.ok) return
    assert.equal(manager.user.role, "project_manager")
    assert.equal(manager.user.companyId, hale.user.companyId)
    const signedIn = await login({ email: "priya@hale.test", password: "password3" })
    assert.equal(signedIn.ok, true)
    if (!signedIn.ok) return
    assert.equal(signedIn.user.role, "project_manager")
    const rejected = await addProjectManager(manager.user.id, {
      name: "Sam",
      email: "sam@hale.test",
      password: "password4",
    })
    assert.equal(rejected.ok, false)

    const token = otherBook.state.estimates.find((estimate) => estimate.clientId.startsWith("client-ortiz"))?.publicToken
    assert.ok(token)
    const view = await publicProposal(token!)
    assert.equal(view?.clientName, "Ortiz Property Group")
    assert.equal(view?.companyName, "Ortiz Painting")
    assert.equal("clients" in (view ?? {}), false)
    assert.equal((await login({ email: "ada@hale.test", password: "nope" })).ok, false)
  })
})
