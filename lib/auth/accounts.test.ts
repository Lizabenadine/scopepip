import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { hashPassword, verifyPassword } from "./password.ts"
import { readOfficeSession, readSession, signOfficeSession, signSession } from "./session-token.ts"

const dir = mkdtempSync(path.join(tmpdir(), "scopepipe-accounts-"))
process.env.ACCOUNTS_PATH = path.join(dir, "accounts.json")
process.env.BOOKS_DIR = path.join(dir, "books")
process.env.AUTH_SECRET = "test-secret"

const { addProjectManager, login, publicProposal, readCompanyBook, saveAccountLanguage, signup, writeCompanyBook } = await import("./directory.ts")

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
    assert.equal(hale.user.subscriptionStatus, "trialing")
    assert.ok(hale.user.trialEndsAt && Date.parse(hale.user.trialEndsAt) > Date.now() + 13 * 24 * 60 * 60 * 1000)
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
    const ownerAtWrongRole = await login({ email: "ada@hale.test", password: "password1", role: "project_manager" })
    assert.equal(ownerAtWrongRole.ok, false)
    if (!ownerAtWrongRole.ok) assert.equal(ownerAtWrongRole.reason, "That login is the owner.")
    const managerAtWrongRole = await login({ email: "priya@hale.test", password: "password3", role: "owner" })
    assert.equal(managerAtWrongRole.ok, false)
    if (!managerAtWrongRole.ok) assert.equal(managerAtWrongRole.reason, "That login is a project manager.")
    const managerAtRole = await login({ email: "priya@hale.test", password: "password3", role: "project_manager" })
    assert.equal(managerAtRole.ok, true)
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

  it("creates a hosted company on Vercel without writing a book file", async () => {
    const session = {
      id: "user-hosted",
      name: "Nadine Lizabe",
      email: "nadine@example.test",
      role: "owner" as const,
      companyId: "company-hosted",
      companyName: "PB Painting",
      companySlug: "pb-painting",
    }
    const token = signOfficeSession(session, "test-secret", 1_000)
    assert.deepEqual(readOfficeSession(token, "test-secret", 1_000), session)
    assert.equal(readOfficeSession(token, "other-secret", 1_000), null)

    const previousVercel = process.env.VERCEL
    const previousSecret = process.env.SUPABASE_SECRET_KEY
    const previousRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    const previousKeys = process.env.SEND_KEYS_PATH
    process.env.VERCEL = "1"
    process.env.SEND_KEYS_PATH = "/tmp/scopepipe-missing-send-keys.json"
    delete process.env.SUPABASE_SECRET_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    try {
      const created = await signup({
        name: "Nadine Lizabe",
        email: "nadine-hosted@example.test",
        password: "password1",
        companyName: "PB Painting",
      })
      assert.equal(created.ok, true)
      if (!created.ok) return
      assert.equal(created.hosted, true)
      assert.equal(created.book?.estimateSettings.companyName, "PB Painting")
      assert.equal(created.revision, 1)
      assert.equal(await readCompanyBook(created.user.companyId), null)
      const again = await login({
        email: "nadine-hosted@example.test",
        password: "password1",
        passwordHash: created.passwordHash,
        hostedUser: created.user,
      })
      assert.equal(again.ok, true)
      if (!again.ok) return
      assert.equal(again.hosted, true)
      assert.equal(again.user.companyName, "PB Painting")
      process.env.SUPABASE_SECRET_KEY = "not-a-real-key"
      const blocked = await login({
        email: "nadine-hosted@example.test",
        password: "password1",
        passwordHash: created.passwordHash,
        hostedUser: created.user,
      })
      assert.equal(blocked.ok, false)
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL
      else process.env.VERCEL = previousVercel
      if (previousSecret === undefined) delete process.env.SUPABASE_SECRET_KEY
      else process.env.SUPABASE_SECRET_KEY = previousSecret
      if (previousRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previousRole
      if (previousKeys === undefined) delete process.env.SEND_KEYS_PATH
      else process.env.SEND_KEYS_PATH = previousKeys
    }
  })

  it("remembers Español on the account", async () => {
    const created = await signup({
      name: "Luz Vega",
      email: "luz@vega.test",
      password: "password1",
      companyName: "Vega Painting",
    })
    assert.equal(created.ok, true)
    if (!created.ok) return
    assert.equal(created.user.language, undefined)
    const saved = await saveAccountLanguage(created.user.id, "es")
    assert.equal(saved?.language, "es")
    const signedIn = await login({ email: "luz@vega.test", password: "password1" })
    assert.equal(signedIn.ok, true)
    if (!signedIn.ok) return
    assert.equal(signedIn.user.language, "es")
  })
})
