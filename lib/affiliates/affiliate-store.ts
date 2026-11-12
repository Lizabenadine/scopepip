import crypto from "node:crypto"
import path from "node:path"
import { readJsonFile, writeJsonFile } from "../auth/account-store.ts"
import { authSecret } from "../auth/directory.ts"

export interface AffiliateAccount {
  id: string
  name: string
  email: string
  passwordHash: string
  code: string
  payoutMethod: "paypal" | "wise" | "ach"
  payoutEmail: string
  createdAt: string
  updatedAt: string
}

export interface AffiliateReferral {
  id: string
  affiliateId: string
  affiliateCode: string
  referredCompanyId: string
  referredEmail: string
  status: "trial" | "active_paid" | "churned"
  paddleSubscriptionId?: string
  createdAt: string
  updatedAt: string
}

export interface AffiliateCommission {
  id: string
  affiliateId: string
  referralId: string
  paddleTransactionId: string
  subscriptionAmount: number
  commissionAmount: number
  currency: string
  status: "pending" | "paid" | "refunded"
  createdAt: string
  paidAt?: string
}

const AFFILIATES_FILE = () => process.env.AFFILIATES_PATH || path.join(process.cwd(), "data", "affiliates", "accounts.json")
const REFERRALS_FILE = () => process.env.REFERRALS_PATH || path.join(process.cwd(), "data", "affiliates", "referrals.json")
const COMMISSIONS_FILE = () => process.env.COMMISSIONS_PATH || path.join(process.cwd(), "data", "affiliates", "commissions.json")

const AFFILIATES_REMOTE = "affiliates/accounts.json"
const REFERRALS_REMOTE = "affiliates/referrals.json"
const COMMISSIONS_REMOTE = "affiliates/commissions.json"

export const AFFILIATE_COOKIE = "scopepipe_affiliate_token"
export const REFERRAL_COOKIE = "sp_ref"

export function hashAffiliatePassword(password: string): string {
  return crypto.createHmac("sha256", authSecret()).update(password).digest("hex")
}

export function signAffiliateSession(affiliateId: string): string {
  const ts = Date.now()
  const payload = Buffer.from(JSON.stringify({ affiliateId, ts })).toString("base64url")
  const sig = crypto.createHmac("sha256", authSecret()).update(payload).digest("base64url")
  return `aff.${payload}.${sig}`
}

export function readAffiliateSession(token: string | null | undefined): string | null {
  if (!token || !token.startsWith("aff.")) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [, payload, sig] = parts
  if (!payload || !sig) return null

  const expectedSig = crypto.createHmac("sha256", authSecret()).update(payload).digest("base64url")
  if (sig !== expectedSig) return null

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { affiliateId?: string; ts?: number }
    if (!data.affiliateId) return null
    // 30-day session
    if (typeof data.ts === "number" && Date.now() - data.ts > 30 * 24 * 60 * 60 * 1000) return null
    return data.affiliateId
  } catch {
    return null
  }
}

async function readAffiliatesList(): Promise<AffiliateAccount[]> {
  const raw = await readJsonFile(AFFILIATES_FILE(), AFFILIATES_REMOTE)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as AffiliateAccount[]) : []
  } catch {
    return []
  }
}

async function writeAffiliatesList(list: AffiliateAccount[]): Promise<void> {
  await writeJsonFile(AFFILIATES_FILE(), AFFILIATES_REMOTE, JSON.stringify(list, null, 2))
}

async function readReferralsList(): Promise<AffiliateReferral[]> {
  const raw = await readJsonFile(REFERRALS_FILE(), REFERRALS_REMOTE)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as AffiliateReferral[]) : []
  } catch {
    return []
  }
}

async function writeReferralsList(list: AffiliateReferral[]): Promise<void> {
  await writeJsonFile(REFERRALS_FILE(), REFERRALS_REMOTE, JSON.stringify(list, null, 2))
}

async function readCommissionsList(): Promise<AffiliateCommission[]> {
  const raw = await readJsonFile(COMMISSIONS_FILE(), COMMISSIONS_REMOTE)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as AffiliateCommission[]) : []
  } catch {
    return []
  }
}

async function writeCommissionsList(list: AffiliateCommission[]): Promise<void> {
  await writeJsonFile(COMMISSIONS_FILE(), COMMISSIONS_REMOTE, JSON.stringify(list, null, 2))
}

export function sanitizeAffiliateCode(name: string, custom?: string): string {
  const raw = (custom || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
  if (raw.length >= 3) return raw.slice(0, 24)
  return `aff_${crypto.randomBytes(3).toString("hex")}`
}

export async function registerAffiliate(input: {
  name: string
  email: string
  password: string
  payoutMethod?: "paypal" | "wise" | "ach"
  payoutEmail?: string
  customCode?: string
}): Promise<{ ok: true; affiliate: AffiliateAccount } | { ok: false; reason: string }> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password.trim()

  if (!name) return { ok: false, reason: "Name is required." }
  if (!email || !email.includes("@")) return { ok: false, reason: "Valid email is required." }
  if (password.length < 6) return { ok: false, reason: "Password must be at least 6 characters." }

  const list = await readAffiliatesList()
  if (list.some((a) => a.email.toLowerCase() === email)) {
    return { ok: false, reason: "An affiliate account with this email already exists." }
  }

  let code = sanitizeAffiliateCode(name, input.customCode)
  // Ensure unique code
  let attempts = 0
  while (list.some((a) => a.code.toLowerCase() === code.toLowerCase()) && attempts < 10) {
    attempts += 1
    code = `${sanitizeAffiliateCode(name)}_${crypto.randomBytes(2).toString("hex")}`
  }

  const now = new Date().toISOString()
  const newAffiliate: AffiliateAccount = {
    id: `aff_${crypto.randomUUID()}`,
    name,
    email,
    passwordHash: hashAffiliatePassword(password),
    code,
    payoutMethod: input.payoutMethod || "paypal",
    payoutEmail: input.payoutEmail?.trim() || email,
    createdAt: now,
    updatedAt: now,
  }

  list.push(newAffiliate)
  await writeAffiliatesList(list)
  return { ok: true, affiliate: newAffiliate }
}

export async function loginAffiliate(
  email: string,
  password: string,
): Promise<{ ok: true; affiliate: AffiliateAccount } | { ok: false; reason: string }> {
  const cleanEmail = email.trim().toLowerCase()
  const list = await readAffiliatesList()
  const affiliate = list.find((a) => a.email.toLowerCase() === cleanEmail)
  if (!affiliate) {
    return { ok: false, reason: "Invalid email or password." }
  }

  const hash = hashAffiliatePassword(password)
  if (affiliate.passwordHash !== hash) {
    return { ok: false, reason: "Invalid email or password." }
  }

  return { ok: true, affiliate }
}

export async function getAffiliateById(id: string): Promise<AffiliateAccount | null> {
  if (!id) return null
  const list = await readAffiliatesList()
  return list.find((a) => a.id === id) || null
}

export async function getAffiliateByCode(code: string): Promise<AffiliateAccount | null> {
  const clean = code.trim().toLowerCase()
  if (!clean) return null
  const list = await readAffiliatesList()
  return list.find((a) => a.code.toLowerCase() === clean) || null
}

/**
 * Tracks a new contractor signup referred by an affiliate.
 * Enforces self-referral prevention and duplicate suppression.
 */
export async function trackReferralSignup(
  referralCode: string,
  companyId: string,
  userEmail: string,
): Promise<{ ok: boolean; reason?: string }> {
  const affiliate = await getAffiliateByCode(referralCode)
  if (!affiliate) return { ok: false, reason: "Invalid referral code." }

  const cleanUserEmail = userEmail.trim().toLowerCase()
  const cleanAffiliateEmail = affiliate.email.trim().toLowerCase()

  // Prevent self-referrals
  if (cleanUserEmail === cleanAffiliateEmail) {
    return { ok: false, reason: "Self-referrals are not permitted." }
  }

  const referrals = await readReferralsList()
  // Check if company or user email was already referred
  const existing = referrals.find(
    (r) => r.referredCompanyId === companyId || r.referredEmail.toLowerCase() === cleanUserEmail,
  )
  if (existing) {
    return { ok: false, reason: "Account already linked to a referral." }
  }

  const now = new Date().toISOString()
  const newReferral: AffiliateReferral = {
    id: `ref_${crypto.randomUUID()}`,
    affiliateId: affiliate.id,
    affiliateCode: affiliate.code,
    referredCompanyId: companyId,
    referredEmail: cleanUserEmail,
    status: "trial",
    createdAt: now,
    updatedAt: now,
  }

  referrals.push(newReferral)
  await writeReferralsList(referrals)
  return { ok: true }
}

/**
 * Processes confirmed Paddle subscription payment.
 * Awards 25% recurring commission once payment is settled.
 * Prevents duplicate commission per Paddle transaction ID.
 */
export async function recordCommissionFromPaddle(input: {
  transactionId: string
  amount: number
  customerEmail?: string
  companyId?: string
  subscriptionId?: string
}): Promise<AffiliateCommission | null> {
  const { transactionId, amount } = input
  if (!transactionId || amount <= 0) return null // Free trial or $0 event has no commission

  const commissions = await readCommissionsList()
  // Prevent duplicate commissions
  if (commissions.some((c) => c.paddleTransactionId === transactionId)) {
    return null
  }

  const referrals = await readReferralsList()
  const emailMatch = input.customerEmail?.trim().toLowerCase()

  const referral = referrals.find(
    (r) =>
      (input.companyId && r.referredCompanyId === input.companyId) ||
      (emailMatch && r.referredEmail.toLowerCase() === emailMatch) ||
      (input.subscriptionId && r.paddleSubscriptionId === input.subscriptionId),
  )

  if (!referral) return null

  // 25% recurring commission calculation
  const commissionAmount = Math.round(amount * 0.25 * 100) / 100
  const now = new Date().toISOString()

  const commission: AffiliateCommission = {
    id: `comm_${crypto.randomUUID()}`,
    affiliateId: referral.affiliateId,
    referralId: referral.id,
    paddleTransactionId: transactionId,
    subscriptionAmount: amount,
    commissionAmount,
    currency: "USD",
    status: "pending", // Pending settlement / payout workflow
    createdAt: now,
  }

  commissions.push(commission)
  await writeCommissionsList(commissions)

  // Update referral status to active_paid
  if (referral.status !== "active_paid" || (input.subscriptionId && !referral.paddleSubscriptionId)) {
    referral.status = "active_paid"
    if (input.subscriptionId) referral.paddleSubscriptionId = input.subscriptionId
    referral.updatedAt = now
    await writeReferralsList(referrals)
  }

  return commission
}

/**
 * Handles refund events from Paddle by invalidating pending commissions.
 */
export async function processPaddleRefund(transactionId: string): Promise<boolean> {
  if (!transactionId) return false
  const commissions = await readCommissionsList()
  const match = commissions.find((c) => c.paddleTransactionId === transactionId)
  if (!match) return false

  match.status = "refunded"
  await writeCommissionsList(commissions)
  return true
}

/**
 * Admin-controlled payout workflow: marks pending commissions as paid.
 */
export async function markCommissionPaid(commissionId: string): Promise<boolean> {
  const commissions = await readCommissionsList()
  const match = commissions.find((c) => c.id === commissionId)
  if (!match) return false

  match.status = "paid"
  match.paidAt = new Date().toISOString()
  await writeCommissionsList(commissions)
  return true
}

export async function getAffiliateDashboardData(affiliateId: string) {
  const affiliate = await getAffiliateById(affiliateId)
  if (!affiliate) return null

  const allReferrals = await readReferralsList()
  const referrals = allReferrals.filter((r) => r.affiliateId === affiliateId)

  const allCommissions = await readCommissionsList()
  const commissions = allCommissions.filter((c) => c.affiliateId === affiliateId)

  const totalSignups = referrals.length
  const activePaying = referrals.filter((r) => r.status === "active_paid").length

  const pendingCommission = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.commissionAmount, 0)

  const paidCommission = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.commissionAmount, 0)

  // Mask referral emails for privacy
  const maskedReferrals = referrals.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    status: r.status,
    email: r.referredEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
  }))

  return {
    affiliate: {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code,
      payoutMethod: affiliate.payoutMethod,
      payoutEmail: affiliate.payoutEmail,
      createdAt: affiliate.createdAt,
    },
    stats: {
      totalSignups,
      activePaying,
      pendingCommission: Math.round(pendingCommission * 100) / 100,
      paidCommission: Math.round(paidCommission * 100) / 100,
      totalEarned: Math.round((pendingCommission + paidCommission) * 100) / 100,
    },
    referrals: maskedReferrals,
    commissions: commissions.slice(-20).reverse(),
  }
}
