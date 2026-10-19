import { createHash, randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { listJsonNames, readJsonFile, writeJsonFile } from "./account-store.ts"
import { supabaseServerKey } from "../supabase/admin.ts"
import { recordStageChanges } from "../clients/activity.ts"
import { createCompanyBook } from "../data/company-book.ts"
import { isScopeState, type ScopeState } from "../data/seed.ts"
import { reconcileFollowUps } from "../follow-ups/schedule.ts"
import { applyDeposit } from "../payments/apply-deposit.ts"
import { applyAcceptance, type AcceptanceInput } from "../proposals/accept.ts"
import type { DepositReceipt, Estimate, EstimateSettings, PaymentMethod } from "../types.ts"
import { hashPassword, verifyPassword } from "./password.ts"
import type { OfficeSession } from "./session.ts"
import type { UserRole } from "./role.ts"

interface StoredUser {
  id: string
  email: string
  name: string
  passwordHash: string
  role: UserRole
  companyId: string
  createdAt: string
}

interface StoredCompany {
  id: string
  name: string
  slug: string
  createdAt: string
}

interface AccountFile {
  users: StoredUser[]
  companies: StoredCompany[]
}

interface BookFile {
  revision: number
  state: ScopeState
}

export interface PublicProposalView {
  estimate: Estimate
  clientName: string
  companyName: string
  companyEmail: string
  paymentMethods: PaymentMethod[]
  estimateSettings: EstimateSettings
}

export interface PublicBookingView {
  companyName: string
  clientName: string
  jobAddress: string
}

const EMPTY: AccountFile = { users: [], companies: [] }

function accountsFile(): string {
  return process.env.ACCOUNTS_PATH || path.join(process.cwd(), "data", "accounts.json")
}

function booksDir(): string {
  return process.env.BOOKS_DIR || path.join(process.cwd(), "data", "books")
}

function secretFile(): string {
  return process.env.AUTH_SECRET_PATH || path.join(process.cwd(), "data", "auth-secret")
}

export function authSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  const key = supabaseServerKey()
  if (key) return createHash("sha256").update(`scopepipe.session.${key}`).digest("hex")
  const file = secretFile()
  try {
    const existing = fs.readFileSync(file, "utf8").trim()
    if (existing) return existing
  } catch {
    // The first local signup creates the signing secret.
  }
  const next = randomBytes(32).toString("hex")
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, next, { mode: 0o600 })
  } catch {
    throw new Error("The server cannot save accounts yet. Set SUPABASE_SECRET_KEY on the host.")
  }
  return next
}

async function readAccounts(): Promise<AccountFile> {
  const raw = await readJsonFile(accountsFile(), "accounts/accounts.json")
  if (!raw) return EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return EMPTY
    const file = parsed as AccountFile
    if (!Array.isArray(file.users) || !Array.isArray(file.companies)) return EMPTY
    return file
  } catch {
    return EMPTY
  }
}

async function writeAccounts(file: AccountFile) {
  await writeJsonFile(accountsFile(), "accounts/accounts.json", JSON.stringify(file))
}

async function writeBook(companyId: string, value: BookFile) {
  await writeJsonFile(bookPath(companyId), `books/${companyId}.json`, JSON.stringify(value))
}

function bookPath(companyId: string): string {
  return path.join(booksDir(), `${companyId}.json`)
}

async function readBookFile(companyId: string): Promise<BookFile | null> {
  const raw = await readJsonFile(bookPath(companyId), `books/${companyId}.json`)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const file = parsed as BookFile
    if (typeof file.revision !== "number" || !isScopeState(file.state)) return null
    return file
  } catch {
    return null
  }
}

async function eachBook(): Promise<{ companyId: string; book: BookFile }[]> {
  const names = await listJsonNames(booksDir(), "books")
  const rows: { companyId: string; book: BookFile }[] = []
  for (const name of names) {
    if (!name.endsWith(".json")) continue
    const companyId = name.slice(0, -5)
    const book = await readBookFile(companyId)
    if (book) rows.push({ companyId, book })
  }
  return rows
}

function toSession(user: StoredUser, company: StoredCompany): OfficeSession {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug,
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  return base || "company"
}

function uniqueSlug(name: string, companies: StoredCompany[]): string {
  const base = slugify(name)
  if (!companies.some((company) => company.slug === base)) return base
  let index = 2
  while (companies.some((company) => company.slug === `${base}-${index}`)) index += 1
  return `${base}-${index}`
}

export async function sessionById(userId: string): Promise<OfficeSession | null> {
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.id === userId)
  if (!user) return null
  const company = accounts.companies.find((item) => item.id === user.companyId)
  if (!company) return null
  return toSession(user, company)
}

export async function signup(input: {
  name: string
  email: string
  password: string
  companyName: string
}): Promise<{ ok: true; user: OfficeSession } | { ok: false; reason: string }> {
  const name = input.name.trim()
  const companyName = input.companyName.trim()
  const email = normalizeEmail(input.email)
  if (!name) return { ok: false, reason: "Enter your name." }
  if (!companyName) return { ok: false, reason: "Name the company." }
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return { ok: false, reason: "Enter a real email." }
  }
  if (input.password.length < 8) return { ok: false, reason: "Use at least 8 characters." }
  const accounts = await readAccounts()
  if (accounts.users.some((user) => user.email === email)) {
    return { ok: false, reason: "That email already has an account." }
  }
  const now = new Date().toISOString()
  const company: StoredCompany = {
    id: crypto.randomUUID(),
    name: companyName,
    slug: uniqueSlug(companyName, accounts.companies),
    createdAt: now,
  }
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: hashPassword(input.password),
    role: "owner",
    companyId: company.id,
    createdAt: now,
  }
  await writeBook(company.id, { revision: 1, state: createCompanyBook(companyName) })
  await writeAccounts({ users: [...accounts.users, user], companies: [...accounts.companies, company] })
  return { ok: true, user: toSession(user, company) }
}

export async function login(input: {
  email: string
  password: string
}): Promise<{ ok: true; user: OfficeSession } | { ok: false; reason: string }> {
  const email = normalizeEmail(input.email)
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.email === email)
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return { ok: false, reason: "That email and password do not match." }
  }
  const company = accounts.companies.find((item) => item.id === user.companyId)
  if (!company) return { ok: false, reason: "That email and password do not match." }
  return { ok: true, user: toSession(user, company) }
}

export async function addProjectManager(
  ownerId: string,
  input: { name: string; email: string; password: string },
): Promise<{ ok: true; user: OfficeSession } | { ok: false; reason: string }> {
  const accounts = await readAccounts()
  const owner = accounts.users.find((item) => item.id === ownerId)
  if (!owner || owner.role !== "owner") return { ok: false, reason: "Only the owner can add a project manager." }
  const company = accounts.companies.find((item) => item.id === owner.companyId)
  if (!company) return { ok: false, reason: "Only the owner can add a project manager." }
  const name = input.name.trim()
  const email = normalizeEmail(input.email)
  if (!name) return { ok: false, reason: "Enter a name." }
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return { ok: false, reason: "Enter a real email." }
  }
  if (input.password.length < 8) return { ok: false, reason: "Use at least 8 characters." }
  if (accounts.users.some((user) => user.email === email)) {
    return { ok: false, reason: "That email already has an account." }
  }
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: hashPassword(input.password),
    role: "project_manager",
    companyId: company.id,
    createdAt: new Date().toISOString(),
  }
  await writeAccounts({ ...accounts, users: [...accounts.users, user] })
  return { ok: true, user: toSession(user, company) }
}

export async function listPeople(userId: string): Promise<{ id: string; name: string; email: string; role: UserRole }[]> {
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.id === userId)
  if (!user) return []
  return accounts.users
    .filter((item) => item.companyId === user.companyId)
    .map((item) => ({ id: item.id, name: item.name, email: item.email, role: item.role }))
}

export async function readCompanyBook(companyId: string): Promise<BookFile | null> {
  return readBookFile(companyId)
}

export async function writeCompanyBook(
  companyId: string,
  revision: number,
  state: ScopeState,
): Promise<{ ok: true; revision: number } | { ok: false; reason: "conflict"; revision: number; state: ScopeState } | { ok: false; reason: string }> {
  const current = await readBookFile(companyId)
  if (!current) return { ok: false, reason: "This company has no book." }
  if (current.revision !== revision) {
    return { ok: false, reason: "conflict", revision: current.revision, state: current.state }
  }
  const next = current.revision + 1
  await writeBook(companyId, { revision: next, state })
  return { ok: true, revision: next }
}

export async function companyBySlug(slug: string): Promise<{ name: string; slug: string; id: string } | null> {
  const company = (await readAccounts()).companies.find((item) => item.slug === slug)
  if (!company) return null
  return { name: company.name, slug: company.slug, id: company.id }
}

function reconciled(before: ScopeState, after: ScopeState): ScopeState {
  const at = new Date().toISOString()
  return reconcileFollowUps(recordStageChanges(before, after, at), at)
}

async function findByEstimate(match: (estimate: Estimate) => boolean): Promise<{ companyId: string; book: BookFile; estimate: Estimate } | null> {
  for (const row of await eachBook()) {
    const estimate = row.book.state.estimates.find(match)
    if (estimate) return { companyId: row.companyId, book: row.book, estimate }
  }
  return null
}

function proposalViewFrom(state: ScopeState, estimate: Estimate): PublicProposalView {
  const client = state.clients.find((item) => item.id === estimate.clientId)
  return {
    estimate,
    clientName: client?.name ?? "Client",
    companyName: state.estimateSettings.companyName?.trim() || "ScopePipe",
    companyEmail: state.estimateSettings.companyEmail?.trim() || "",
    paymentMethods: state.paymentMethods,
    estimateSettings: state.estimateSettings,
  }
}

export async function publicProposal(token: string): Promise<PublicProposalView | null> {
  const found = await findByEstimate((estimate) => estimate.publicToken === token)
  if (!found) return null
  return proposalViewFrom(found.book.state, found.estimate)
}

export async function acceptPublicProposal(
  token: string,
  input: AcceptanceInput,
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const found = await findByEstimate((estimate) => estimate.publicToken === token)
  if (!found) return { ok: false, reason: "This proposal link is not valid." }
  const result = applyAcceptance(found.book.state, token, input)
  if (!result.ok) return result
  const next = reconciled(found.book.state, result.state)
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  const estimate = next.estimates.find((item) => item.id === result.estimateId)
  if (!saved.ok || !estimate) return { ok: false, reason: "This proposal could not be saved. Try again." }
  return { ok: true, estimate }
}

export async function publicEstimate(id: string): Promise<{ estimate: Estimate; clientName: string; paymentMethods: PaymentMethod[] } | null> {
  const found = await findByEstimate((estimate) => estimate.id === id)
  if (!found) return null
  const client = found.book.state.clients.find((item) => item.id === found.estimate.clientId)
  return {
    estimate: found.estimate,
    clientName: client?.name ?? "Client",
    paymentMethods: found.book.state.paymentMethods,
  }
}

export async function recordPublicDeposit(
  estimateId: string,
  receipt: DepositReceipt,
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const found = await findByEstimate((estimate) => estimate.id === estimateId)
  if (!found) return { ok: false, reason: "This estimate is not on file." }
  const result = applyDeposit(found.book.state, estimateId, receipt)
  if (!result.ok) return result
  const next = reconciled(found.book.state, result.state)
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  const estimate = next.estimates.find((item) => item.id === estimateId)
  if (!saved.ok || !estimate) return { ok: false, reason: "The deposit could not be saved. Try again." }
  return { ok: true, estimate }
}

export async function publicBooking(token: string): Promise<PublicBookingView | null> {
  const found = await findByEstimate((estimate) => estimate.publicToken === token)
  if (!found) return null
  const client = found.book.state.clients.find((item) => item.id === found.estimate.clientId)
  return {
    companyName: found.book.state.estimateSettings.companyName?.trim() || "ScopePipe",
    clientName: client?.name ?? "",
    jobAddress: found.estimate.jobAddress || client?.address || "",
  }
}
