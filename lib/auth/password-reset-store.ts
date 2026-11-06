import { randomBytes } from "node:crypto"
import path from "node:path"
import { readJsonFile, writeJsonFile } from "./account-store.ts"
import { supabaseAdmin } from "../supabase/admin.ts"

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export interface ResetTokenRecord {
  token: string
  email: string
  userId?: string
  expiresAt: number
  usedAt?: number
  createdAt: number
}

const LOCAL_STORE_FILE = path.join(process.cwd(), "data", "password-resets.json")
const REMOTE_STORE_KEY = "accounts/password-resets.json"
const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function readResetTokens(): Promise<ResetTokenRecord[]> {
  const raw = await readJsonFile(LOCAL_STORE_FILE, REMOTE_STORE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function writeResetTokens(tokens: ResetTokenRecord[]): Promise<void> {
  await writeJsonFile(LOCAL_STORE_FILE, REMOTE_STORE_KEY, JSON.stringify(tokens, null, 2))
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const normalized = normalizeEmail(email)
  const token = randomBytes(32).toString("hex")
  const tokens = await readResetTokens()

  let userId: string | undefined
  const admin = supabaseAdmin()
  if (admin) {
    try {
      const { data } = await admin.auth.admin.listUsers()
      const found = data?.users?.find((u) => u.email?.toLowerCase() === normalized)
      if (found?.id) {
        userId = found.id
      }
    } catch {
      // ignore lookup failure
    }
  }

  const now = Date.now()
  const activeTokens = tokens.filter((t) => now - t.createdAt < 24 * 60 * 60 * 1000)

  activeTokens.push({
    token,
    email: normalized,
    userId,
    expiresAt: now + TOKEN_TTL_MS,
    createdAt: now,
  })

  await writeResetTokens(activeTokens)
  return token
}

export async function verifyPasswordResetToken(
  token: string,
): Promise<{ valid: boolean; email?: string; userId?: string; reason?: string }> {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Missing reset token." }
  }

  const tokens = await readResetTokens()
  const record = tokens.find((t) => t.token === token.trim())
  if (!record) {
    return { valid: false, reason: "This reset link is invalid or has already been used." }
  }

  if (record.usedAt) {
    return { valid: false, reason: "This reset link has already been used." }
  }

  if (Date.now() > record.expiresAt) {
    return { valid: false, reason: "This reset link has expired. Please request a new one." }
  }

  return { valid: true, email: record.email, userId: record.userId }
}

export async function markResetTokenUsed(token: string): Promise<boolean> {
  const tokens = await readResetTokens()
  const index = tokens.findIndex((t) => t.token === token.trim())
  if (index < 0) return false

  tokens[index].usedAt = Date.now()
  await writeResetTokens(tokens)
  return true
}
