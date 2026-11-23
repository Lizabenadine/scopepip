import { createHash, randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { deleteJsonFile, listJsonNames, readJsonFile, writeJsonFile } from "./account-store.ts"
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
import { maxSeatsForPlan, type PlanTier } from "../billing/entitlement.ts"
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
  planTier?: PlanTier
  extraSeats?: number
  authUserId?: string
}

interface StoredCompany {
  id: string
  name: string
  slug: string
  createdAt: string
  planTier?: PlanTier
  extraSeats?: number
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

let memoryAccounts: { file: AccountFile; cachedAt: number } | null = null
const ACCOUNTS_CACHE_TTL_MS = 15_000

async function readAccounts(): Promise<AccountFile> {
  const now = Date.now()
  if (memoryAccounts && now - memoryAccounts.cachedAt < ACCOUNTS_CACHE_TTL_MS) {
    return memoryAccounts.file
  }
  const raw = await readJsonFile(accountsFile(), "accounts/accounts.json")
  if (!raw) return EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return EMPTY
    const file = parsed as AccountFile
    if (!Array.isArray(file.users) || !Array.isArray(file.companies)) return EMPTY
    memoryAccounts = { file, cachedAt: now }
    return file
  } catch {
    return EMPTY
  }
}

async function writeAccounts(file: AccountFile) {
  memoryAccounts = { file, cachedAt: Date.now() }
  await writeJsonFile(accountsFile(), "accounts/accounts.json", JSON.stringify(file))
}

interface TokenIndex {
  proposals: Record<string, string>
  estimates: Record<string, string>
  offers: Record<string, string>
  webhooks: Record<string, string>
}

let memoryTokenIndex: TokenIndex | null = null
let indexSavePending = false

function tokenIndexPath(): string {
  return path.join(path.dirname(accountsFile()), "token-index.json")
}

async function readTokenIndex(): Promise<TokenIndex> {
  if (memoryTokenIndex) return memoryTokenIndex
  const raw = await readJsonFile(tokenIndexPath(), "accounts/token-index.json")
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as TokenIndex
      if (parsed && typeof parsed.proposals === "object") {
        memoryTokenIndex = {
          proposals: parsed.proposals || {},
          estimates: parsed.estimates || {},
          offers: parsed.offers || {},
          webhooks: parsed.webhooks || {},
        }
        return memoryTokenIndex
      }
    } catch {}
  }
  memoryTokenIndex = { proposals: {}, estimates: {}, offers: {}, webhooks: {} }
  return memoryTokenIndex
}

function updateTokenIndexForBook(companyId: string, state: ScopeState) {
  if (!memoryTokenIndex) {
    memoryTokenIndex = { proposals: {}, estimates: {}, offers: {}, webhooks: {} }
  }
  for (const est of state.estimates) {
    if (est.publicToken) memoryTokenIndex.proposals[est.publicToken] = companyId
    if (est.id) memoryTokenIndex.estimates[est.id] = companyId
  }
  for (const order of state.workOrders) {
    for (const offer of order.offers ?? []) {
      if (offer.token) memoryTokenIndex.offers[offer.token] = companyId
    }
  }
  const webhook = leadWebhookToken(state.estimateSettings?.leadWebhookToken)
  if (webhook) memoryTokenIndex.webhooks[webhook] = companyId

  void scheduleSaveTokenIndex()
}

async function scheduleSaveTokenIndex() {
  if (indexSavePending || !memoryTokenIndex) return
  indexSavePending = true
  try {
    await writeJsonFile(tokenIndexPath(), "accounts/token-index.json", JSON.stringify(memoryTokenIndex))
  } catch {
    // Non-fatal if host write fails; in-memory index remains active
  } finally {
    indexSavePending = false
  }
}

interface CachedBook {
  book: BookFile
  cachedAt: number
}
const memoryBooks = new Map<string, CachedBook>()
const BOOK_CACHE_TTL_MS = 15_000

async function writeBook(companyId: string, value: BookFile) {
  memoryBooks.set(companyId, { book: value, cachedAt: Date.now() })
  updateTokenIndexForBook(companyId, value.state)
  await writeJsonFile(bookPath(companyId), `books/${companyId}.json`, JSON.stringify(value))
}

function bookPath(companyId: string): string {
  return path.join(booksDir(), `${companyId}.json`)
}

async function readBookFile(companyId: string): Promise<BookFile | null> {
  const now = Date.now()
  const cached = memoryBooks.get(companyId)
  if (cached && now - cached.cachedAt < BOOK_CACHE_TTL_MS) {
    return cached.book
  }
  const raw = await readJsonFile(bookPath(companyId), `books/${companyId}.json`)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const file = parsed as BookFile
    if (typeof file.revision !== "number" || !isScopeState(file.state)) return null
    memoryBooks.set(companyId, { book: file, cachedAt: now })
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
    if (book) {
      updateTokenIndexForBook(companyId, book.state)
      rows.push({ companyId, book })
    }
  }
  return rows
}

function masterAdminEmails(): string[] {
  const envEmails = process.env.MASTER_ADMIN_EMAILS || process.env.MASTER_ADMIN_EMAIL || ""
  const list = envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (!list.includes("nadieshda@aol.com")) {
    list.push("nadieshda@aol.com")
  }
  return list
}

function masterAdminUserIds(): string[] {
  const envIds = process.env.MASTER_ADMIN_USER_IDS || process.env.MASTER_ADMIN_USER_ID || ""
  const list = envIds
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean)
  if (!list.includes("52618110-8404-4795-b6de-5758a78270fd")) {
    list.push("52618110-8404-4795-b6de-5758a78270fd")
  }
  if (!list.includes("374258f7-136a-4431-a6af-f81c3a01b48c")) {
    list.push("374258f7-136a-4431-a6af-f81c3a01b48c")
  }
  return list
}

export function isMasterAdmin(user?: { email?: string; authUserId?: string; id?: string } | null): boolean {
  if (!user) return false
  if (user.authUserId && masterAdminUserIds().includes(user.authUserId.trim().toLowerCase())) return true
  if (user.id && masterAdminUserIds().includes(user.id.trim().toLowerCase())) return true
  if (user.email && masterAdminEmails().includes(user.email.trim().toLowerCase())) return true
  return false
}

export function isMasterAdminEmail(email: string): boolean {
  return isMasterAdmin({ email })
}

function toSession(user: StoredUser, company: StoredCompany): OfficeSession {
  const planTier = company.planTier || user.planTier || "pro"
  const extraSeats = company.extraSeats || user.extraSeats || 0
  const isSuper = user.role === "super_admin" || isMasterAdmin(user)
  const role: UserRole = isSuper ? "super_admin" : user.role
  const subscriptionStatus = isSuper ? "lifetime" : user.subscriptionStatus
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug,
    planTier,
    extraSeats,
    ...(user.language === "es" || user.language === "en" ? { language: user.language } : {}),
    ...(subscriptionStatus ? { subscriptionStatus } : {}),
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
  const normId = userId.trim().toLowerCase()
  if (masterAdminUserIds().includes(normId)) {
    return {
      status: "lifetime",
      trialEndsAt: "",
      userId: "374258f7-136a-4431-a6af-f81c3a01b48c",
      email: "nadieshda@aol.com",
      authUserId: "52618110-8404-4795-b6de-5758a78270fd",
    }
  }
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.id === userId || item.authUserId === userId)
  if (!user) return null
  if (user.role === "super_admin" || isMasterAdmin(user) || user.subscriptionStatus === "lifetime") {
    return {
      status: "lifetime",
      trialEndsAt: "",
      userId: user.id,
      email: user.email,
      ...(user.authUserId ? { authUserId: user.authUserId } : {}),
    }
  }
  const owner =
    user.role === "owner"
      ? user
      : accounts.users.find((item) => item.companyId === user.companyId && (item.role === "owner" || item.role === "super_admin")) ?? user
  if (owner.role === "super_admin" || isMasterAdmin(owner) || owner.subscriptionStatus === "lifetime") {
    return {
      status: "lifetime",
      trialEndsAt: "",
      userId: owner.id,
      email: owner.email,
      ...(owner.authUserId ? { authUserId: owner.authUserId } : {}),
    }
  }
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
  planTier?: PlanTier
  extraSeats?: number
}): Promise<{ account: boolean; profile: boolean }> {
  const accounts = await readAccounts()
  const email = input.email?.trim().toLowerCase() ?? ""
  let account = false
  let matchedCompanyId = ""
  const users = accounts.users.map((user) => {
    const match =
      (input.officeUserId && user.id === input.officeUserId) ||
      (input.userId && (user.id === input.userId || user.authUserId === input.userId)) ||
      (email.includes("@") && user.email === email)
    if (!match) return user
    account = true
    matchedCompanyId = user.companyId

    // Protect super_admin and lifetime users from being downgraded by Paddle webhooks!
    if ((user.role === "super_admin" || isMasterAdmin(user) || user.subscriptionStatus === "lifetime") && input.status !== "lifetime") {
      const protectedUser: StoredUser = {
        ...user,
        subscriptionStatus: "lifetime",
        ...(input.planTier ? { planTier: input.planTier } : {}),
        ...(typeof input.extraSeats === "number" ? { extraSeats: input.extraSeats } : {}),
      }
      return protectedUser
    }

    const updatedUser: StoredUser = {
      ...user,
      subscriptionStatus: input.status,
      trialEndsAt: input.trialEndsAt || user.trialEndsAt || trialEndsAt(new Date()),
      ...(input.planTier ? { planTier: input.planTier } : {}),
      ...(typeof input.extraSeats === "number" ? { extraSeats: input.extraSeats } : {}),
    }
    return updatedUser
  })
  const companies = accounts.companies.map((c) => {
    if (matchedCompanyId && c.id === matchedCompanyId) {
      return {
        ...c,
        ...(input.planTier ? { planTier: input.planTier } : {}),
        ...(typeof input.extraSeats === "number" ? { extraSeats: input.extraSeats } : {}),
      }
    }
    return c
  })
  if (account) await writeAccounts({ ...accounts, users, companies })
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
  const normId = userId.trim().toLowerCase()
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.id === userId || (item.authUserId && item.authUserId.toLowerCase() === normId))
  if (user) {
    const company = accounts.companies.find((item) => item.id === user.companyId) || (isMasterAdmin(user) ? { id: "6121f9b9-59df-4190-b4ff-289a062f4c20", name: "Scopepipe", slug: "scopepipe", createdAt: "" } : null)
    if (company) return toSession(user, company)
  }
  if (masterAdminUserIds().includes(normId)) {
    return {
      id: "374258f7-136a-4431-a6af-f81c3a01b48c",
      name: "Nadieshda",
      email: "nadieshda@aol.com",
      role: "super_admin",
      companyId: "6121f9b9-59df-4190-b4ff-289a062f4c20",
      companyName: "Scopepipe",
      companySlug: "scopepipe",
      planTier: "business",
      extraSeats: 10,
      subscriptionStatus: "lifetime",
      trialEndsAt: "",
      authUserId: "52618110-8404-4795-b6de-5758a78270fd",
    }
  }
  return null
}

export async function sessionByEmail(email: string): Promise<OfficeSession | null> {
  const normalized = normalizeEmail(email)
  const accounts = await readAccounts()
  const user = accounts.users.find((item) => item.email === normalized)
  if (user) {
    const company = accounts.companies.find((item) => item.id === user.companyId) || (isMasterAdmin(user) ? { id: "6121f9b9-59df-4190-b4ff-289a062f4c20", name: "Scopepipe", slug: "scopepipe", createdAt: "" } : null)
    if (company) return toSession(user, company)
  }
  if (masterAdminEmails().includes(normalized)) {
    return {
      id: "374258f7-136a-4431-a6af-f81c3a01b48c",
      name: "Nadieshda",
      email: "nadieshda@aol.com",
      role: "super_admin",
      companyId: "6121f9b9-59df-4190-b4ff-289a062f4c20",
      companyName: "Scopepipe",
      companySlug: "scopepipe",
      planTier: "business",
      extraSeats: 10,
      subscriptionStatus: "lifetime",
      trialEndsAt: "",
      authUserId: "52618110-8404-4795-b6de-5758a78270fd",
    }
  }
  return null
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
      const isHostedSuper = hosted.role === "super_admin" || isMasterAdmin(hosted)
      if (input.role && input.role !== hosted.role && !(isHostedSuper && input.role === "owner")) {
        return { ok: false, reason: roleSignInReason(hosted.role) }
      }
      return { ok: true, hosted: true, user: hosted }
    }
    return { ok: false, reason: "That email and password do not match." }
  }
  const company = accounts.companies.find((item) => item.id === user.companyId)
  if (!company) return { ok: false, reason: "That email and password do not match." }
  const isUserSuper = user.role === "super_admin" || isMasterAdmin(user)
  if (input.role && input.role !== user.role && !(isUserSuper && input.role === "owner")) {
    return { ok: false, reason: roleSignInReason(user.role) }
  }
  if (isUserSuper && (user.role !== "super_admin" || user.subscriptionStatus !== "lifetime")) {
    const upgradedUser: StoredUser = {
      ...user,
      role: "super_admin",
      subscriptionStatus: "lifetime",
    }
    const users = accounts.users.slice()
    const index = accounts.users.findIndex((item) => item.id === user.id)
    if (index >= 0) {
      users[index] = upgradedUser
      try {
        await writeAccounts({ ...accounts, users })
      } catch {
        // non-fatal if storage sync is offline
      }
    }
  }
  return { ok: true, user: toSession(user, company) }
}

export async function updateUserPassword(email: string, password: string): Promise<boolean> {
  const normalized = normalizeEmail(email)
  const accounts = await readAccounts()
  const index = accounts.users.findIndex((item) => item.email === normalized)
  if (index < 0) return false
  const updatedUser: StoredUser = { ...accounts.users[index], passwordHash: hashPassword(password) }
  const users = accounts.users.slice()
  users[index] = updatedUser
  await writeAccounts({ ...accounts, users })
  return true
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
  const planTier = company.planTier || owner.planTier || "pro"
  const extraSeats = company.extraSeats || 0
  const maxSeats = maxSeatsForPlan(planTier, extraSeats)
  if (seats >= maxSeats) {
    if (planTier === "starter") {
      return { ok: false, reason: "Your Starter plan includes 1 seat. Upgrade to Pro for 3 seats or Business for 5 seats." }
    }
    if (planTier === "pro") {
      return { ok: false, reason: FOUNDING_PLAN_SEAT_LIMIT }
    }
    return { ok: false, reason: `You have reached the ${maxSeats} seats included with your Business plan. Add additional seats in Billing.` }
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
  const index = await readTokenIndex()
  const companyId = index.webhooks[expected]
  if (companyId) {
    const book = await readBookFile(companyId)
    if (book && leadWebhookToken(book.state.estimateSettings.leadWebhookToken) === expected) {
      return { companyId, book }
    }
  }
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

async function findByProposalToken(token: string): Promise<{ companyId: string; book: BookFile; estimate: Estimate } | null> {
  if (!token) return null
  const index = await readTokenIndex()
  const companyId = index.proposals[token]
  if (companyId) {
    const book = await readBookFile(companyId)
    const estimate = book?.state.estimates.find((e) => e.publicToken === token)
    if (estimate && book) return { companyId, book, estimate }
  }
  for (const row of await eachBook()) {
    const estimate = row.book.state.estimates.find((e) => e.publicToken === token)
    if (estimate) return { companyId: row.companyId, book: row.book, estimate }
  }
  return null
}

async function findByEstimateId(id: string): Promise<{ companyId: string; book: BookFile; estimate: Estimate } | null> {
  if (!id) return null
  const index = await readTokenIndex()
  const companyId = index.estimates[id]
  if (companyId) {
    const book = await readBookFile(companyId)
    const estimate = book?.state.estimates.find((e) => e.id === id)
    if (estimate && book) return { companyId, book, estimate }
  }
  for (const row of await eachBook()) {
    const estimate = row.book.state.estimates.find((e) => e.id === id)
    if (estimate) return { companyId: row.companyId, book: row.book, estimate }
  }
  return null
}

async function findByEstimate(match: (estimate: Estimate) => boolean): Promise<{ companyId: string; book: BookFile; estimate: Estimate } | null> {
  for (const row of await eachBook()) {
    const estimate = row.book.state.estimates.find(match)
    if (estimate) return { companyId: row.companyId, book: row.book, estimate }
  }
  return null
}

function forCustomer(estimate: Estimate): Estimate {
  const copy: Estimate = {
    ...estimate,
    crewNote: "",
    areas: estimate.areas.map((area) => ({
      ...area,
      crewNote: "",
      surfaces: area.surfaces.map((surface) => ({ ...surface, crewNote: "" })),
      sketches: area.sketches?.filter((s) => s.includeInProposal),
    })),
    lineItems: estimate.lineItems.map((item) => ({
      ...item,
      crewNote: "",
      workOrderHours: 0,
      hiddenOnWorkOrder: false,
    })),
  }
  delete copy.versions
  delete copy.activity
  delete copy.leadSource
  delete copy.inboundLeadId
  delete copy.tags
  delete copy.salesperson
  delete copy.salesStage
  delete copy.followUp
  delete copy.estimatorId
  delete copy.quickbooksInvoiceId
  delete copy.quickbooksSyncedAt
  if (copy.settings.hourlyRateBuild) {
    const settings = { ...copy.settings }
    delete settings.hourlyRateBuild
    copy.settings = settings
  }
  return copy
}

function proposalViewFrom(state: ScopeState, estimate: Estimate): PublicProposalView {
  const client = state.clients.find((item) => item.id === estimate.clientId)
  const settings = publicSettings(state.estimateSettings)
  return {
    estimate: forCustomer(estimate),
    clientName: client?.name ?? "Client",
    clientLanguage: client?.language === "es" ? "es" : "en",
    companyName: state.estimateSettings.companyName?.trim() || "ScopePipe",
    companyEmail: state.estimateSettings.companyEmail?.trim() || "",
    paymentMethods: state.paymentMethods,
    estimateSettings: {
      ...settings,
      logoUrl: settings.logoUrl?.trim() || estimate.settings.logoUrl?.trim() || "",
    },
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
  const found = await findByProposalToken(token)
  if (!found) return false
  const updatedAt = new Date().toISOString()
  const clients = found.book.state.clients.map((client) =>
    client.id === found.estimate.clientId ? { ...client, language, updatedAt } : client,
  )
  const saved = await writeCompanyBook(found.companyId, found.book.revision, { ...found.book.state, clients })
  return saved.ok === true
}

export async function publicProposal(token: string): Promise<PublicProposalView | null> {
  const found = await findByProposalToken(token)
  if (!found) return null
  const { resolveCompanyBrand } = await import("../proposals/htmlPdf.ts")
  const brand = await resolveCompanyBrand({
    estimateSettings: found.book.state.estimateSettings,
    estimate: found.estimate,
    companyId: found.companyId,
  })
  const baseView = proposalViewFrom(found.book.state, found.estimate)
  return {
    ...baseView,
    companyName: brand.companyName || baseView.companyName,
    companyEmail: brand.companyEmail || baseView.companyEmail,
    estimateSettings: {
      ...baseView.estimateSettings,
      logoUrl: brand.logoUrl || baseView.estimateSettings.logoUrl,
    },
  }
}

export async function declinePublicProposal(
  token: string,
  declinedAt: string,
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const found = await findByProposalToken(token)
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
  const found = await findByProposalToken(token)
  if (!found) return { ok: false, reason: "This proposal link is not valid." }
  if (found.estimate.clientStatus === "accepted" || found.estimate.signature) {
    return { ok: true, estimate: forCustomer(found.estimate) }
  }
  const result = applyAcceptance(found.book.state, token, input)
  if (!result.ok) return result
  const next = reconciled(found.book.state, result.state)
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  const estimate = next.estimates.find((item) => item.id === result.estimateId)
  if (!saved.ok || !estimate) return { ok: false, reason: "This proposal could not be saved. Try again." }
  return { ok: true, estimate: forCustomer(estimate) }
}

export async function companyEstimate(
  companyId: string,
  id: string,
): Promise<{ estimate: Estimate; clientName: string; paymentMethods: PaymentMethod[] } | null> {
  const book = await readCompanyBook(companyId)
  const estimate = book?.state.estimates.find((item) => item.id === id)
  if (!book || !estimate) return null
  const client = book.state.clients.find((item) => item.id === estimate.clientId)
  return {
    estimate: forCustomer(estimate),
    clientName: client?.name ?? "Client",
    paymentMethods: book.state.paymentMethods,
  }
}

export async function publicProposalPdfData(token: string): Promise<{
  companyId: string
  estimate: Estimate
  clientName: string
  clientEmail: string
  clientPhone: string
  language: "en" | "es"
  companyName: string
  companyEmail: string
  logoUrl: string
  paymentMethods: PaymentMethod[]
  estimateSettings: EstimateSettings
} | null> {
  const found = await findByProposalToken(token)
  if (!found) return null
  const client = found.book.state.clients.find((item) => item.id === found.estimate.clientId)
  const { resolveCompanyBrand } = await import("../proposals/htmlPdf.ts")
  const brand = await resolveCompanyBrand({
    estimateSettings: found.book.state.estimateSettings,
    estimate: found.estimate,
    companyId: found.companyId,
  })
  const effectiveSettings: EstimateSettings = {
    ...publicSettings(found.book.state.estimateSettings),
    companyName: brand.companyName || found.book.state.estimateSettings.companyName,
    companyEmail: brand.companyEmail || found.book.state.estimateSettings.companyEmail,
    logoUrl: brand.logoUrl || found.book.state.estimateSettings.logoUrl || "",
  }
  return {
    companyId: found.companyId,
    estimate: forCustomer(found.estimate),
    clientName: client?.name ?? "Client",
    clientEmail: client?.email ?? "",
    clientPhone: client?.phone ?? "",
    language: client?.language === "es" ? "es" : "en",
    companyName: effectiveSettings.companyName || "ScopePipe",
    companyEmail: effectiveSettings.companyEmail || "",
    logoUrl: effectiveSettings.logoUrl || "",
    paymentMethods: found.book.state.paymentMethods,
    estimateSettings: effectiveSettings,
  }
}

export async function recordPublicDepositByToken(
  token: string,
  receipt: DepositReceipt,
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const found = await findByProposalToken(token)
  if (!found) return { ok: false, reason: "This proposal link is not valid." }
  if (found.estimate.clientStatus !== "accepted") {
    return { ok: false, reason: "Accept the proposal before paying the deposit." }
  }
  const result = applyDeposit(found.book.state, found.estimate.id, receipt)
  if (!result.ok) return result
  const next = reconciled(found.book.state, result.state)
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  const estimate = next.estimates.find((item) => item.id === found.estimate.id)
  if (!saved.ok || !estimate) return { ok: false, reason: "The deposit could not be saved. Try again." }
  return { ok: true, estimate: forCustomer(estimate) }
}

export async function recordCompanyDeposit(
  companyId: string,
  estimateId: string,
  receipt: DepositReceipt,
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const book = await readCompanyBook(companyId)
  const existing = book?.state.estimates.find((item) => item.id === estimateId)
  if (!book || !existing) return { ok: false, reason: "This estimate is not on file." }
  const result = applyDeposit(book.state, estimateId, receipt)
  if (!result.ok) return result
  const next = reconciled(book.state, result.state)
  const saved = await writeCompanyBook(companyId, book.revision, next)
  const estimate = next.estimates.find((item) => item.id === estimateId)
  if (!saved.ok || !estimate) return { ok: false, reason: "The deposit could not be saved. Try again." }
  return { ok: true, estimate: forCustomer(estimate) }
}

export async function recordPendingSignatureByToken(
  token: string,
  input: { lineIds: string[]; clientSignatureUrl: string },
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const found = await findByProposalToken(token)
  if (!found) return { ok: false, reason: "This proposal link is not valid." }
  const signed = signPendingWork(found.estimate, input)
  if (!signed.ok) return signed
  const next = reconciled(found.book.state, {
    ...found.book.state,
    estimates: found.book.state.estimates.map((item) => (item.id === found.estimate.id ? signed.estimate : item)),
  })
  const saved = await writeCompanyBook(found.companyId, found.book.revision, next)
  const estimate = next.estimates.find((item) => item.id === found.estimate.id)
  if (!saved.ok || !estimate) return { ok: false, reason: "The signature could not be saved. Try again." }
  return { ok: true, estimate: forCustomer(estimate) }
}

export async function recordCompanyPendingSignature(
  companyId: string,
  estimateId: string,
  input: { lineIds: string[]; clientSignatureUrl: string },
): Promise<{ ok: true; estimate: Estimate } | { ok: false; reason: string }> {
  const book = await readCompanyBook(companyId)
  const existing = book?.state.estimates.find((item) => item.id === estimateId)
  if (!book || !existing) return { ok: false, reason: "This estimate is not on file." }
  const signed = signPendingWork(existing, input)
  if (!signed.ok) return signed
  const next = reconciled(book.state, {
    ...book.state,
    estimates: book.state.estimates.map((item) => (item.id === estimateId ? signed.estimate : item)),
  })
  const saved = await writeCompanyBook(companyId, book.revision, next)
  const estimate = next.estimates.find((item) => item.id === estimateId)
  if (!saved.ok || !estimate) return { ok: false, reason: "The signature could not be saved. Try again." }
  return { ok: true, estimate: forCustomer(estimate) }
}

export async function publicEstimate(id: string): Promise<{ estimate: Estimate; clientName: string; paymentMethods: PaymentMethod[] } | null> {
  const found = await findByEstimateId(id)
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
  const found = await findByEstimateId(estimateId)
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
  const found = await findByEstimateId(estimateId)
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
  const found = await findByProposalToken(token)
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
  if (!token) return null
  const index = await readTokenIndex()
  const companyId = index.offers[token]
  if (companyId) {
    const book = await readBookFile(companyId)
    if (book) {
      for (const order of book.state.workOrders) {
        const offer = order.offers?.find((item) => item.token === token)
        if (offer) return { companyId, book, order, offer }
      }
    }
  }
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
  const found = await findByProposalToken(token)
  if (!found) return null
  const client = found.book.state.clients.find((item) => item.id === found.estimate.clientId)
  return {
    companyName: found.book.state.estimateSettings.companyName?.trim() || "ScopePipe",
    clientName: client?.name ?? "",
    jobAddress: found.estimate.jobAddress || client?.address || "",
  }
}

export interface AdminUserView {
  id: string
  name: string
  email: string
  role: UserRole
  companyId: string
  companyName: string
  subscriptionStatus: SubscriptionStatus
  trialEndsAt: string
  createdAt: string
  authUserId?: string
}

export async function listAllAccountsForAdmin(callerUserId: string): Promise<AdminUserView[] | null> {
  const accounts = await readAccounts()
  const normCaller = callerUserId.trim().toLowerCase()
  const caller = accounts.users.find(
    (u) => u.id === callerUserId || (u.authUserId && u.authUserId.toLowerCase() === normCaller)
  )
  const isSuper =
    (caller && (caller.role === "super_admin" || isMasterAdmin(caller))) ||
    masterAdminUserIds().includes(normCaller) ||
    isMasterAdmin({ id: callerUserId, authUserId: callerUserId })

  if (!isSuper) {
    return null
  }
  const companiesMap = new Map(accounts.companies.map((c) => [c.id, c.name]))
  return accounts.users.map((u) => {
    const isSuperUser = u.role === "super_admin" || isMasterAdmin(u)
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: isSuperUser ? "super_admin" : u.role,
      companyId: u.companyId,
      companyName: companiesMap.get(u.companyId) || "ScopePipe",
      subscriptionStatus: isSuperUser ? "lifetime" : (u.subscriptionStatus ?? "trialing"),
      trialEndsAt: isSuperUser ? "" : (u.trialEndsAt ?? ""),
      createdAt: u.createdAt,
      ...(u.authUserId ? { authUserId: u.authUserId } : {}),
    }
  })
}

export async function setLifetimeAccess(
  callerUserId: string,
  targetUserId: string,
  action: "grant" | "revoke"
): Promise<{ ok: boolean; reason?: string; user?: AdminUserView }> {
  const accounts = await readAccounts()
  const normCaller = callerUserId.trim().toLowerCase()
  const caller = accounts.users.find(
    (u) => u.id === callerUserId || (u.authUserId && u.authUserId.toLowerCase() === normCaller)
  )
  const isSuper =
    (caller && (caller.role === "super_admin" || isMasterAdmin(caller))) ||
    masterAdminUserIds().includes(normCaller) ||
    isMasterAdmin({ id: callerUserId, authUserId: callerUserId })

  if (!isSuper) {
    return { ok: false, reason: "Unauthorized: only a master admin can manage lifetime access." }
  }
  const normTarget = targetUserId.trim().toLowerCase()
  const targetIndex = accounts.users.findIndex(
    (u) => u.id === targetUserId || (u.authUserId && u.authUserId.toLowerCase() === normTarget)
  )
  if (targetIndex < 0) {
    return { ok: false, reason: "User not found." }
  }
  const target = accounts.users[targetIndex]
  const newStatus: SubscriptionStatus = action === "grant" ? "lifetime" : "canceled"
  const updatedUser: StoredUser = {
    ...target,
    subscriptionStatus: newStatus,
  }
  const users = accounts.users.slice()
  users[targetIndex] = updatedUser
  try {
    await writeAccounts({ ...accounts, users })
  } catch (err) {
    console.warn("Could not write accounts file:", err)
  }
  try {
    await saveProfileSubscription({ userId: target.authUserId || target.id, status: newStatus })
  } catch {
    // Non-fatal if Supabase sync is deferred
  }
  const company = accounts.companies.find((c) => c.id === target.companyId)
  return {
    ok: true,
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      companyId: updatedUser.companyId,
      companyName: company?.name || "ScopePipe",
      subscriptionStatus: updatedUser.subscriptionStatus ?? newStatus,
      trialEndsAt: updatedUser.trialEndsAt ?? "",
      createdAt: updatedUser.createdAt,
      ...(updatedUser.authUserId ? { authUserId: updatedUser.authUserId } : {}),
    },
  }
}

export async function deleteAccountsForAdmin(
  callerUserId: string,
  targetUserIds: string[],
): Promise<{ ok: boolean; reason?: string; deletedCount?: number; deletedUserIds?: string[] }> {
  const accounts = await readAccounts()
  const normCaller = callerUserId.trim().toLowerCase()
  const caller = accounts.users.find(
    (u) => u.id === callerUserId || (u.authUserId && u.authUserId.toLowerCase() === normCaller),
  )
  const isSuper =
    (caller && (caller.role === "super_admin" || isMasterAdmin(caller))) ||
    masterAdminUserIds().includes(normCaller) ||
    isMasterAdmin({ id: callerUserId, authUserId: callerUserId })

  if (!isSuper) {
    return { ok: false, reason: "Unauthorized: only a master admin can delete accounts." }
  }

  const targetsSet = new Set(targetUserIds.map((id) => id.trim().toLowerCase()))
  const founderEmails = ["nadieshda@aol.com"]
  const founderIds = ["374258f7-136a-4431-a6af-f81c3a01b48c", "52618110-8404-4795-b6de-5758a78270fd"]

  const usersToDelete = accounts.users.filter((u) => {
    const matchesId = targetsSet.has(u.id.toLowerCase()) || (u.authUserId && targetsSet.has(u.authUserId.toLowerCase()))
    if (!matchesId) return false
    // Strict founder protection
    if (founderEmails.includes(u.email.toLowerCase())) return false
    if (founderIds.includes(u.id.toLowerCase())) return false
    if (u.authUserId && founderIds.includes(u.authUserId.toLowerCase())) return false
    if (isMasterAdmin(u)) return false
    return true
  })

  if (usersToDelete.length === 0) {
    return { ok: true, deletedCount: 0, deletedUserIds: [] }
  }

  const deletedUserIds = usersToDelete.map((u) => u.id)
  const deletedUserIdSet = new Set(deletedUserIds)
  const remainingUsers = accounts.users.filter((u) => !deletedUserIdSet.has(u.id))

  // Find companies that belonged exclusively to deleted users and have no remaining users
  const companiesToDelete = accounts.companies.filter((c) => {
    if (c.id === "6121f9b9-59df-4190-b4ff-289a062f4c20") return false // Always protect Scopepipe company
    const hasOtherUsers = remainingUsers.some((u) => u.companyId === c.id)
    return !hasOtherUsers
  })
  const deletedCompanyIds = new Set(companiesToDelete.map((c) => c.id))
  const remainingCompanies = accounts.companies.filter((c) => !deletedCompanyIds.has(c.id))

  // 1. Delete associated book files for removed companies
  for (const c of companiesToDelete) {
    try {
      await deleteJsonFile(bookPath(c.id), `books/${c.id}.json`)
    } catch (err) {
      console.warn("Could not delete book file for company:", c.id, err)
    }
  }

  // 2. Remove Supabase Auth identities and DB rows
  const admin = supabaseAdmin()
  if (admin) {
    for (const u of usersToDelete) {
      const authId = u.authUserId || (u.id.includes("-") ? u.id : null)
      if (authId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authId)) {
        try {
          await admin.auth.admin.deleteUser(authId)
        } catch {
          // Ignore if user is not in Supabase auth
        }
        try {
          await admin.from("profiles").delete().eq("user_id", authId)
        } catch {
          // Ignore table error
        }
        try {
          await admin.from("subscriptions").delete().eq("user_id", authId)
        } catch {
          // Ignore table error
        }
      }
      try {
        await admin.from("profiles").delete().eq("id", u.id)
      } catch {
        // Ignore table error
      }
      try {
        await admin.from("subscriptions").delete().eq("user_id", u.id)
      } catch {
        // Ignore table error
      }
    }
  }

  // 3. Write updated accounts.json
  try {
    await writeAccounts({
      users: remainingUsers,
      companies: remainingCompanies,
    })
  } catch (err) {
    console.error("Failed to write accounts after deletion:", err)
    return { ok: false, reason: "Failed to persist deleted accounts to storage." }
  }

  return {
    ok: true,
    deletedCount: usersToDelete.length,
    deletedUserIds,
  }
}
