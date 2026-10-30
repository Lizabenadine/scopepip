import { createHash, randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { listJsonNames, readJsonFile, writeJsonFile } from "./account-store.ts"
import { supabaseAdmin, supabaseServerKey } from "../supabase/admin.ts"
import { hookMoments } from "../webhooks/moments.ts"
import { sendWebhook } from "../webhooks/send.ts"
import { leadWebhookToken } from "../webhooks/token.ts"
import { recordStageChanges } from "../clients/activity.ts"
import { createCompanyBook } from "../data/company-book.ts"
import { isScopeState, type ScopeState } from "../data/seed.ts"
import { reconcileFollowUps } from "../follow-ups/schedule.ts"
import { signPendingWork } from "../estimate/pending.ts"
import { applyDeposit } from "../payments/apply-deposit.ts"
import { applyAcceptance, type AcceptanceInput } from "../proposals/accept.ts"
import { postProposalMessage } from "../proposals/chat.ts"
import { applyDecline } from "../proposals/decline.ts"
import { toCrewSheet } from "../work-orders/crew-sheet.ts"
import { answerSubcontractorOffer } from "../work-orders/offers.ts"
import { toSubcontractorOrder, type WorkOrderData } from "../work-orders/subcontractor.ts"
import type { DepositReceipt, Estimate, EstimateSettings, PaymentMethod, SubcontractorOffer, WorkOrder } from "../types.ts"
import { isSubscriptionStatus, trialEndsAt, type SubscriptionStatus } from "../billing/access.ts"
import { matchCompanySlug, slugifyCompanyName } from "./company-slug.ts"
import { hashPassword, verifyPassword } from "./password.ts"
import type { OfficeSession } from "./session.ts"
import { roleSignInReason, type UserRole } from "./role.ts"

const FOUNDING_PLAN_SEATS = 3
const FOUNDING_PLAN_SEAT_LIMIT =
  "You have reached the 3 seats included for $49 a month."

interface StoredUser {
  id: string
  email: string
  name: string
  passwordHash: string
  role: UserRole
  companyId: string
  createdAt: string
  language?: "en" | "es"
  subscriptionStatus?: SubscriptionStatus
  trialEndsAt?: string
  authUserId?: string
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

export interface BookFile {
  revision: number
  state: ScopeState
}

export interface PublicProposalView {
  estimate: Estimate
  clientName: string
  clientLanguage?: "en" | "es"
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
  if (process.env.VERCEL) return "scopepipe-hosted-session-v1"
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
    ...(user.language === "es" || user.language === "en" ? { language: user.language } : {}),
    ...(user.subscriptionStatus ? { subscriptionStatus: user.subscriptionStatus } : {}),
    ...(user.trialEndsAt ? { trialEndsAt: user.trialEndsAt } : {}),
    ...(user.authUserId ? { authUserId: user.authUserId } : {}),
  }
}

export async function billingAccessForUser(userId: string): Promise<{
  status: SubscriptionStatus
  trialEndsAt: string
  userId: string
  email: string
  authUserId?: string
} | null> {
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.id === userId)
  if (!user) return null
  const owner =
    user.role === "owner"
      ? user
      : accounts.users.find((item) => item.companyId === user.companyId && item.role === "owner") ?? user
  const next = owner.subscriptionStatus && owner.trialEndsAt ? owner : openTrial(owner)
  if (next !== owner) {
    await writeAccounts({
      ...accounts,
      users: accounts.users.map((item) => (item.id === owner.id ? next : item)),
    })
  }
  return {
    status: next.subscriptionStatus ?? "trialing",
    trialEndsAt: next.trialEndsAt ?? trialEndsAt(new Date()),
    userId: next.id,
    email: next.email,
    ...(next.authUserId ? { authUserId: next.authUserId } : {}),
  }
}

export async function saveBillingStatus(input: {
  userId?: string
  officeUserId?: string
  email?: string
  status: SubscriptionStatus
  trialEndsAt?: string | null
}): Promise<{ account: boolean; profile: boolean }> {
  const accounts = await readAccounts()
  const email = input.email?.trim().toLowerCase() ?? ""
  let account = false
  const users = accounts.users.map((user) => {
    const match =
      (input.officeUserId && user.id === input.officeUserId) ||
      (input.userId && (user.id === input.userId || user.authUserId === input.userId)) ||
      (email.includes("@") && user.email === email)
    if (!match) return user
    account = true
    return {
      ...user,
      subscriptionStatus: input.status,
      trialEndsAt: input.trialEndsAt || user.trialEndsAt || trialEndsAt(new Date()),
    }
  })
  if (account) await writeAccounts({ ...accounts, users })
  const profile = await saveProfileSubscription(input)
  return { account, profile }
}

function openTrial(user: StoredUser): StoredUser {
  return {
    ...user,
    subscriptionStatus: user.subscriptionStatus && isSubscriptionStatus(user.subscriptionStatus) ? user.subscriptionStatus : "trialing",
    trialEndsAt: user.trialEndsAt || trialEndsAt(new Date()),
  }
}

async function saveProfileSubscription(input: {
  userId?: string
  status: SubscriptionStatus
  trialEndsAt?: string | null
}): Promise<boolean> {
  const admin = supabaseAdmin()
  const userId = input.userId?.trim() ?? ""
  if (!admin || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) return false
  const patch: { subscription_status: SubscriptionStatus; trial_ends_at?: string } = { subscription_status: input.status }
  if (input.trialEndsAt) patch.trial_ends_at = input.trialEndsAt
  const result = await admin.from("profiles").update(patch).eq("user_id", userId)
  return !result.error
}

export async function saveAccountLanguage(userId: string, language: "en" | "es"): Promise<OfficeSession | null> {
  const accounts = await readAccounts()
  const index = accounts.users.findIndex((item) => item.id === userId)
  if (index < 0) return null
  const user = { ...accounts.users[index], language }
  const company = accounts.companies.find((item) => item.id === user.companyId)
  if (!company) return null
  const users = accounts.users.slice()
  users[index] = user
  await writeAccounts({ ...accounts, users })
  return toSession(user, company)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function uniqueSlug(name: string, companies: StoredCompany[]): string {
  const base = slugifyCompanyName(name)
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

export async function sessionByEmail(email: string): Promise<OfficeSession | null> {
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.email === normalizeEmail(email))
  if (!user) return null
  const company = accounts.companies.find((item) => item.id === user.companyId)
  if (!company) return null
  return toSession(user, company)
}

export function signupInputError(input: { name: string; email: string; password: string; companyName: string }): string | null {
  const name = input.name.trim()
  const companyName = input.companyName.trim()
  const email = normalizeEmail(input.email)
  if (!name) return "Enter your name."
  if (!companyName) return "Name the company."
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) return "Enter a real email."
  if (input.password.length < 8) return "Use at least 8 characters."
  return null
}

export async function signup(input: {
  name: string
  email: string
  password: string
  companyName: string
  authUserId?: string
}): Promise<
  | { ok: true; user: OfficeSession; hosted?: boolean; passwordHash?: string; revision?: number; book?: ReturnType<typeof createCompanyBook> }
  | { ok: false; reason: string }
> {
  const invalid = signupInputError(input)
  if (invalid) return { ok: false, reason: invalid }
  const name = input.name.trim()
  const companyName = input.companyName.trim()
  const email = normalizeEmail(input.email)
  const accounts = await readAccounts()
  if (accounts.users.some((user) => user.email === email)) {
    return { ok: false, reason: "That email already has an account." }
  }
  const now = new Date()
  const company: StoredCompany = {
    id: crypto.randomUUID(),
    name: companyName,
    slug: uniqueSlug(companyName, accounts.companies),
    createdAt: now.toISOString(),
  }
  const authUserId = input.authUserId?.trim()
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: hashPassword(input.password),
    role: "owner",
    companyId: company.id,
    createdAt: now.toISOString(),
    subscriptionStatus: "trialing",
    trialEndsAt: trialEndsAt(now),
    ...(authUserId ? { authUserId } : {}),
  }
  const session = toSession(user, company)
  if (process.env.VERCEL && !supabaseServerKey()) {
    return {
      ok: true,
      hosted: true,
      user: session,
      passwordHash: user.passwordHash,
      revision: 1,
      book: createCompanyBook(companyName),
    }
  }
  await writeBook(company.id, { revision: 1, state: createCompanyBook(companyName) })
  await writeAccounts({ users: [...accounts.users, user], companies: [...accounts.companies, company] })
  return { ok: true, user: session }
}

export async function login(input: {
  email: string
  password: string
  passwordHash?: string
  hostedUser?: OfficeSession
  role?: UserRole
}): Promise<{ ok: true; user: OfficeSession; hosted?: boolean } | { ok: false; reason: string }> {
  const email = normalizeEmail(input.email)
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.email === email)
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    const hosted = input.hostedUser
    if (
      process.env.VERCEL &&
      !supabaseServerKey() &&
      input.passwordHash &&
      hosted &&
      normalizeEmail(hosted.email) === email &&
      verifyPassword(input.password, input.passwordHash)
    ) {
      if (input.role && input.role !== hosted.role) return { ok: false, reason: roleSignInReason(hosted.role) }
      return { ok: true, hosted: true, user: hosted }
    }
    return { ok: false, reason: "That email and password do not match." }
  }
  const company = accounts.companies.find((item) => item.id === user.companyId)
  if (!company) return { ok: false, reason: "That email and password do not match." }
  if (input.role && input.role !== user.role) return { ok: false, reason: roleSignInReason(user.role) }
  return { ok: true, user: toSession(user, company) }
}

export async function addProjectManager(
  ownerId: string,
  input: { name: string; email: string; password: string },
): Promise<{ ok: true; user: OfficeSession } | { ok: false; reason: string }> {
  return addStaff(ownerId, { ...input, role: "project_manager" })
}

export async function addStaff(
  ownerId: string,
  input: { name: string; email: string; password: string; role: "project_manager" | "estimator" },
): Promise<{ ok: true; user: OfficeSession } | { ok: false; reason: string }> {
  const accounts = await readAccounts()
  const owner = accounts.users.find((item) => item.id === ownerId)
  if (!owner || owner.role !== "owner") return { ok: false, reason: "Only the owner can add a person." }
  const company = accounts.companies.find((item) => item.id === owner.companyId)
  if (!company) return { ok: false, reason: "Only the owner can add a person." }
  const seats = accounts.users.filter((item) => item.companyId === company.id).length
  if (seats >= FOUNDING_PLAN_SEATS) {
    return { ok: false, reason: FOUNDING_PLAN_SEAT_LIMIT }
  }
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
    role: input.role,
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

export async function companyForLeadWebhook(token: string): Promise<{ companyId: string; book: BookFile } | null> {
  const expected = leadWebhookToken(token)
  if (!expected) return null
  for (const row of await eachBook()) {
    if (leadWebhookToken(row.book.state.estimateSettings.leadWebhookToken) === expected) return row
  }
  return null
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
  for (const moment of hookMoments(current.state, state)) {
    void sendWebhook(moment.event, moment.payload, companyId, state.estimateSettings.outboundHooks)
  }
  return { ok: true, revision: next }
}

export async function companyBySlug(slug: string): Promise<{ name: string; slug: string; id: string } | null> {
  const company = matchCompanySlug((await readAccounts()).companies, slug)
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

function forCustomer(estimate: Estimate): Estimate {
  if (!estimate.versions && !estimate.activity && !estimate.settings.hourlyRateBuild) return estimate
  const copy = { ...estimate }
  delete copy.versions
  delete copy.activity
  if (copy.settings.hourlyRateBuild) {
    const settings = { ...copy.settings }
    delete settings.hourlyRateBuild
    copy.settings = settings
  }
  return copy
}

function proposalViewFrom(state: ScopeState, estimate: Estimate): PublicProposalView {
  const client = state.clients.find((item) => item.id === estimate.clientId)
  return {
    estimate: forCustomer(estimate),
    clientName: client?.name ?? "Client",
    clientLanguage: client?.language === "es" ? "es" : "en",
    companyName: state.estimateSettings.companyName?.trim() || "ScopePipe",
    companyEmail: state.estimateSettings.companyEmail?.trim() || "",
    paymentMethods: state.paymentMethods,
    estimateSettings: publicSettings(state.estimateSettings),
  }
}

function publicSettings(settings: EstimateSettings): EstimateSettings {
  const copy = { ...settings }
  delete copy.leadWebhookToken
  delete copy.zapierWebhookUrl
  delete copy.zapierSince
  delete copy.outboundHooks
  return copy
}

export async function rememberProposalLanguage(token: string, language: "en" | "es"): Promise<boolean> {
  const found = await findByEstimate((estimate) => estimate.publicToken === token)
  if (!found) return false
  const updatedAt = new Date().toISOString()
  const clients = found.book.state.clients.map((client) =>
    client.id === found.estimate.clientId ? { ...client, language, updatedAt } : client,
  )
  const saved = await writeCompanyBook(found.companyId, found.book.revision, { ...found.book.state, clients })
  return saved.ok === true
}

export async function publicProposal(token: string): Promise<PublicProposalView | null> {
  const found = await findByEstimate((estimate) => estimate.publicToken === token)
  if (!found) return null
  return proposalViewFrom(found.book.state, found.estimate)
}

export async function declinePublicProposal(
  token: string,
  declinedAt: string,
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const found = await findByEstimate((estimate) => estimate.publicToken === token)
  if (!found) return { ok: false, reason: "This proposal link is not valid." }
  const result = applyDecline(found.book.state, token, declinedAt)
  if (!result.ok) return result
  const next = reconciled(found.book.state, result.state)
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  const estimate = next.estimates.find((item) => item.id === result.estimateId)
  if (!saved.ok || !estimate) return { ok: false, reason: "This proposal could not be saved. Try again." }
  return { ok: true, estimate: forCustomer(estimate) }
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
  return { ok: true, estimate: forCustomer(estimate) }
}

export async function publicEstimate(id: string): Promise<{ estimate: Estimate; clientName: string; paymentMethods: PaymentMethod[] } | null> {
  const found = await findByEstimate((estimate) => estimate.id === id)
  if (!found) return null
  const client = found.book.state.clients.find((item) => item.id === found.estimate.clientId)
  return {
    estimate: forCustomer(found.estimate),
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
  return { ok: true, estimate: forCustomer(estimate) }
}

export async function recordPendingSignature(
  estimateId: string,
  input: { lineIds: string[]; clientSignatureUrl: string },
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const found = await findByEstimate((estimate) => estimate.id === estimateId)
  if (!found) return { ok: false, reason: "This estimate is not on file." }
  const signed = signPendingWork(found.estimate, input)
  if (!signed.ok) return signed
  const next = reconciled(found.book.state, {
    ...found.book.state,
    estimates: found.book.state.estimates.map((item) => (item.id === estimateId ? signed.estimate : item)),
  })
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  const estimate = next.estimates.find((item) => item.id === estimateId)
  if (!saved.ok || !estimate) return { ok: false, reason: "The signature could not be saved. Try again." }
  return { ok: true, estimate: forCustomer(estimate) }
}

export async function recordProposalMessage(
  token: string,
  body: string,
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const found = await findByEstimate((estimate) => estimate.publicToken === token)
  if (!found) return { ok: false, reason: "This proposal link is not valid." }
  const posted = postProposalMessage(found.estimate, { from: "customer", body })
  if (!posted.ok) return posted
  const next = reconciled(found.book.state, {
    ...found.book.state,
    estimates: found.book.state.estimates.map((item) => (item.id === found.estimate.id ? posted.estimate : item)),
  })
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  const estimate = next.estimates.find((item) => item.id === found.estimate.id)
  if (!saved.ok || !estimate) return { ok: false, reason: "The message could not be saved. Try again." }
  return { ok: true, estimate: forCustomer(estimate) }
}

export interface PublicWorkOrderOffer {
  order: WorkOrderData
  description: string
  spanishDescription?: string
  offerName: string
  status: SubcontractorOffer["status"]
  taken: boolean
  logoUrl?: string | null
}

async function findByOffer(
  token: string,
): Promise<{ companyId: string; book: BookFile; order: WorkOrder; offer: SubcontractorOffer } | null> {
  for (const row of await eachBook()) {
    for (const order of row.book.state.workOrders) {
      const offer = order.offers?.find((item) => item.token === token)
      if (offer) return { companyId: row.companyId, book: row.book, order, offer }
    }
  }
  return null
}

function offerPacket(state: ScopeState, order: WorkOrder, offer: SubcontractorOffer): PublicWorkOrderOffer | null {
  const estimate = state.estimates.find((item) => item.id === order.estimateId)
  if (!estimate) return null
  const client = state.clients.find((item) => item.id === estimate.clientId)
  const sheet = toCrewSheet(estimate, client, order)
  const packet = toSubcontractorOrder({
    sheet,
    jobId: estimate.id,
    dateGenerated: order.notifiedAt ?? estimate.updatedAt,
    companyName: state.estimateSettings.companyName?.trim() || "ScopePipe",
    companyAddress: "",
    companyPhone: state.estimateSettings.businessPhone?.trim() ?? "",
    salespersonName: estimate.salesperson ?? "",
    salespersonEmail: state.estimateSettings.companyEmail?.trim() ?? "",
    companyCamUrl: order.companyCamProjectUrl || order.companyCamUrl,
    exclusions: order.exclusions,
    subSignature: offer.status === "accepted" ? order.subSignature : undefined,
    subSignedDate: offer.status === "accepted" ? order.subSignedDate : undefined,
  })
  const taken =
    offer.status !== "accepted" &&
    (Boolean(order.subSignature) || (order.offers ?? []).some((item) => item.status === "accepted"))
  return {
    order: packet,
    description: order.prepNotes,
    spanishDescription: order.prepNotesEs,
    offerName: offer.name,
    status: offer.status,
    taken,
    logoUrl: state.estimateSettings.logoUrl,
  }
}

export async function publicWorkOrderOffer(token: string): Promise<PublicWorkOrderOffer | null> {
  const found = await findByOffer(token)
  if (!found) return null
  return offerPacket(found.book.state, found.order, found.offer)
}

export async function answerPublicWorkOrder(
  token: string,
  decision: "accept" | "decline",
  answeredAt: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const found = await findByOffer(token)
  if (!found) return { ok: false, reason: "This work order link is not valid." }
  const applied = applyAnswer(found.book.state, found.order, token, decision, answeredAt)
  if (!applied.ok) return applied
  if (applied.order === found.order) return { ok: true }
  const next = replaceOrder(found.book.state, applied.order)
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  if (saved.ok) return { ok: true }
  if (saved.reason !== "conflict" || !("state" in saved)) {
    return { ok: false, reason: "This work order could not be saved. Try again." }
  }
  const fresh = saved.state.workOrders.find((item) => item.estimateId === found.order.estimateId)
  if (!fresh) return { ok: false, reason: "This work order could not be saved. Try again." }
  const retried = applyAnswer(saved.state, fresh, token, decision, answeredAt)
  if (!retried.ok) return retried
  const savedAgain = await writeCompanyBook(found.companyId, saved.revision, replaceOrder(saved.state, retried.order))
  if (!savedAgain.ok) return { ok: false, reason: "This work order could not be saved. Try again." }
  return { ok: true }
}

function applyAnswer(
  state: ScopeState,
  order: WorkOrder,
  token: string,
  decision: "accept" | "decline",
  answeredAt: string,
): { ok: true; order: WorkOrder } | { ok: false; reason: string } {
  void state
  return answerSubcontractorOffer(order, token, decision, answeredAt)
}

function replaceOrder(state: ScopeState, order: WorkOrder): ScopeState {
  return {
    ...state,
    workOrders: state.workOrders.map((item) => (item.estimateId === order.estimateId ? order : item)),
  }
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
