import fs from "node:fs"
import path from "node:path"

export interface PayoutAccount {
  stripeSecret: string
  stripePublishable: string
  paypalClientId: string
  paypalSecret: string
  paypalMode: "live" | "sandbox"
  paddleApiKey: string
  paddleClientToken: string
  bankName: string
  accountHolder: string
  routingNumber: string
  accountNumber: string
}

export interface PayoutStatus {
  stripe: boolean
  paypal: boolean
  paddle: boolean
  bank: boolean
  bankName: string
  accountHolder: string
  accountLast4: string
}

const EMPTY: PayoutAccount = {
  stripeSecret: "",
  stripePublishable: "",
  paypalClientId: "",
  paypalSecret: "",
  paypalMode: "sandbox",
  paddleApiKey: "",
  paddleClientToken: "",
  bankName: "",
  accountHolder: "",
  routingNumber: "",
  accountNumber: "",
}

function payoutsDir(): string {
  return process.env.PAYOUTS_DIR || path.join(process.cwd(), "data", "payouts")
}

export function safeCompanyId(companyId: string): string | null {
  const id = companyId.trim()
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) return null
  return id
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function routingNumberValid(value: string): boolean {
  if (!/^\d{9}$/.test(value)) return false
  const digits = value.split("").map(Number)
  const sum =
    3 * ((digits[0] ?? 0) + (digits[3] ?? 0) + (digits[6] ?? 0)) +
    7 * ((digits[1] ?? 0) + (digits[4] ?? 0) + (digits[7] ?? 0)) +
    ((digits[2] ?? 0) + (digits[5] ?? 0) + (digits[8] ?? 0))
  return sum > 0 && sum % 10 === 0
}

export function paddleKeyMode(apiKey: string): "live" | "sandbox" | null {
  if (/^pdl_live_[A-Za-z0-9_]{8,}$/.test(apiKey)) return "live"
  if (/^pdl_sdbx_[A-Za-z0-9_]{8,}$/.test(apiKey)) return "sandbox"
  return null
}

export function paddleTokenMatches(apiKey: string, clientToken: string): boolean {
  const mode = paddleKeyMode(apiKey)
  if (mode === "live") return /^live_[A-Za-z0-9]{8,}$/.test(clientToken)
  if (mode === "sandbox") return /^test_[A-Za-z0-9]{8,}$/.test(clientToken)
  return false
}

export function readPayout(companyId: string): PayoutAccount {
  const id = safeCompanyId(companyId)
  if (!id) return { ...EMPTY }
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(payoutsDir(), `${id}.json`), "utf8")) as Partial<PayoutAccount>
    return {
      stripeSecret: text(parsed.stripeSecret),
      stripePublishable: text(parsed.stripePublishable),
      paypalClientId: text(parsed.paypalClientId),
      paypalSecret: text(parsed.paypalSecret),
      paypalMode: parsed.paypalMode === "live" ? "live" : "sandbox",
      paddleApiKey: text(parsed.paddleApiKey),
      paddleClientToken: text(parsed.paddleClientToken),
      bankName: text(parsed.bankName),
      accountHolder: text(parsed.accountHolder),
      routingNumber: text(parsed.routingNumber).replace(/\D/g, ""),
      accountNumber: text(parsed.accountNumber).replace(/\D/g, ""),
    }
  } catch {
    return { ...EMPTY }
  }
}

export function payoutStatus(account: PayoutAccount): PayoutStatus {
  const accountLast4 = account.accountNumber.length >= 4 ? account.accountNumber.slice(-4) : ""
  return {
    stripe: account.stripeSecret.startsWith("sk_") && account.stripePublishable.startsWith("pk_") && account.stripeSecret.slice(3, 8) === account.stripePublishable.slice(3, 8),
    paypal: account.paypalClientId.length >= 20 && account.paypalSecret.length >= 20,
    paddle: paddleTokenMatches(account.paddleApiKey, account.paddleClientToken),
    bank: Boolean(account.bankName && account.accountHolder && routingNumberValid(account.routingNumber) && /^\d{4,17}$/.test(account.accountNumber)),
    bankName: account.bankName,
    accountHolder: account.accountHolder,
    accountLast4,
  }
}

export function savePayout(
  companyId: string,
  patch: Partial<PayoutAccount>,
): { ok: true; status: PayoutStatus } | { ok: false; reason: string } {
  const id = safeCompanyId(companyId)
  if (!id) return { ok: false, reason: "This account could not be found." }
  const current = readPayout(id)
  const next: PayoutAccount = { ...current }
  if (patch.stripeSecret !== undefined) {
    const secret = patch.stripeSecret.trim()
    if (secret && !secret.startsWith("sk_")) return { ok: false, reason: "The Stripe secret key starts with sk_." }
    next.stripeSecret = secret || current.stripeSecret
  }
  if (patch.stripePublishable !== undefined) {
    const key = patch.stripePublishable.trim()
    if (key && !key.startsWith("pk_")) return { ok: false, reason: "The Stripe publishable key starts with pk_." }
    next.stripePublishable = key || current.stripePublishable
  }
  if ((patch.stripeSecret !== undefined || patch.stripePublishable !== undefined) && next.stripeSecret && next.stripePublishable) {
    if (next.stripeSecret.slice(3, 8) !== next.stripePublishable.slice(3, 8)) {
      return { ok: false, reason: "The Stripe secret and publishable key need to be the same mode, test or live." }
    }
  }
  if (patch.paypalClientId !== undefined) {
    const clientId = patch.paypalClientId.trim()
    if (clientId && clientId.length < 20) return { ok: false, reason: "The PayPal client id is too short." }
    next.paypalClientId = clientId || current.paypalClientId
  }
  if (patch.paypalSecret !== undefined) {
    const secret = patch.paypalSecret.trim()
    if (secret && secret.length < 20) return { ok: false, reason: "The PayPal secret is too short." }
    next.paypalSecret = secret || current.paypalSecret
  }
  if (patch.paypalMode !== undefined) next.paypalMode = patch.paypalMode === "live" ? "live" : "sandbox"
  if (patch.paddleApiKey !== undefined) {
    const key = patch.paddleApiKey.trim()
    if (key && !paddleKeyMode(key)) return { ok: false, reason: "The Paddle API key starts with pdl_live_ or pdl_sdbx_." }
    next.paddleApiKey = key || current.paddleApiKey
  }
  if (patch.paddleClientToken !== undefined) {
    const token = patch.paddleClientToken.trim()
    if (token && !/^(test|live)_[A-Za-z0-9]{8,}$/.test(token)) {
      return { ok: false, reason: "The Paddle client token starts with test_ or live_." }
    }
    next.paddleClientToken = token || current.paddleClientToken
  }
  if ((patch.paddleApiKey !== undefined || patch.paddleClientToken !== undefined) && next.paddleApiKey && next.paddleClientToken) {
    if (!paddleTokenMatches(next.paddleApiKey, next.paddleClientToken)) {
      return { ok: false, reason: "A live Paddle key needs a live_ token. A sandbox key needs a test_ token." }
    }
  }
  if (patch.bankName !== undefined) next.bankName = patch.bankName.trim()
  if (patch.accountHolder !== undefined) next.accountHolder = patch.accountHolder.trim()
  if (patch.routingNumber !== undefined) {
    const routing = patch.routingNumber.replace(/\D/g, "")
    if (routing && !routingNumberValid(routing)) return { ok: false, reason: "That routing number is not a valid US routing number." }
    next.routingNumber = routing || current.routingNumber
  }
  if (patch.accountNumber !== undefined) {
    const account = patch.accountNumber.replace(/\D/g, "")
    if (account && !/^\d{4,17}$/.test(account)) return { ok: false, reason: "The account number needs 4 to 17 digits." }
    next.accountNumber = account || current.accountNumber
  }
  if (patch.bankName !== undefined || patch.accountHolder !== undefined || patch.routingNumber !== undefined || patch.accountNumber !== undefined) {
    if (!next.bankName || !next.accountHolder || !routingNumberValid(next.routingNumber) || !/^\d{4,17}$/.test(next.accountNumber)) {
      return { ok: false, reason: "A bank connection needs the bank name, the account holder, a routing number, and an account number." }
    }
  }
  const dir = payoutsDir()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(next))
  return { ok: true, status: payoutStatus(next) }
}

export function clearPayout(companyId: string, which: "stripe" | "paypal" | "paddle" | "bank"): PayoutStatus {
  const current = readPayout(companyId)
  if (which === "stripe") {
    current.stripeSecret = ""
    current.stripePublishable = ""
  } else if (which === "paypal") {
    current.paypalClientId = ""
    current.paypalSecret = ""
    current.paypalMode = "sandbox"
  } else if (which === "paddle") {
    current.paddleApiKey = ""
    current.paddleClientToken = ""
  } else {
    current.bankName = ""
    current.accountHolder = ""
    current.routingNumber = ""
    current.accountNumber = ""
  }
  const id = safeCompanyId(companyId)
  if (!id) return payoutStatus(EMPTY)
  const dir = payoutsDir()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(current))
  return payoutStatus(current)
}
