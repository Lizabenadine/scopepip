import crypto from "node:crypto"
import path from "node:path"
import { deleteJsonFile, readJsonFile, writeJsonFile } from "../auth/account-store.ts"

export interface CompanyCamCredentialsRecord {
  companyId: string
  connected: boolean
  ciphertext: string
  iv: string
  tag: string
  last4: string
  verifiedAt?: string
  updatedAt: string
}

export interface CompanyCamStatus {
  connected: boolean
  last4: string
  verifiedAt?: string
}

function connectionStoragePaths(companyId: string): { localPath: string; remoteKey: string } {
  const sanitized = companyId.replace(/[^a-zA-Z0-9_-]/g, "")
  const baseDir = process.env.COMPANYCAM_DIR || path.join(process.cwd(), "data", "connections")
  return {
    localPath: path.join(baseDir, `${sanitized}-companycam.json`),
    remoteKey: `connections/${sanitized}/companycam.json`,
  }
}

function deriveEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET?.trim() || "scopepipe-companycam-default-salt-key"
  return crypto.createHmac("sha256", secret).update("scopepipe:companycam:credentials:v1").digest()
}

export function encryptCompanyCamToken(token: string): { ciphertext: string; iv: string; tag: string } {
  const key = deriveEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]).toString("hex")
  const tag = cipher.getAuthTag().toString("hex")
  return { ciphertext, iv: iv.toString("hex"), tag }
}

export function decryptCompanyCamToken(record: { ciphertext: string; iv: string; tag: string }): string | null {
  try {
    const key = deriveEncryptionKey()
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(record.iv, "hex"))
    decipher.setAuthTag(Buffer.from(record.tag, "hex"))
    const decrypted = Buffer.concat([decipher.update(Buffer.from(record.ciphertext, "hex")), decipher.final()])
    return decrypted.toString("utf8")
  } catch {
    return null
  }
}

export async function readCompanyCamCredentials(companyId: string): Promise<CompanyCamCredentialsRecord | null> {
  if (!companyId) return null
  const { localPath, remoteKey } = connectionStoragePaths(companyId)
  const raw = await readJsonFile(localPath, remoteKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<CompanyCamCredentialsRecord>
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.ciphertext === "string" &&
      typeof parsed.iv === "string" &&
      typeof parsed.tag === "string" &&
      typeof parsed.last4 === "string"
    ) {
      return {
        companyId,
        connected: parsed.connected === true,
        ciphertext: parsed.ciphertext,
        iv: parsed.iv,
        tag: parsed.tag,
        last4: parsed.last4,
        verifiedAt: typeof parsed.verifiedAt === "string" ? parsed.verifiedAt : undefined,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      }
    }
    return null
  } catch {
    return null
  }
}

export async function writeCompanyCamCredentials(
  companyId: string,
  token: string,
  verifiedAt?: string,
): Promise<CompanyCamStatus> {
  const trimmed = token.trim()
  const { localPath, remoteKey } = connectionStoragePaths(companyId)
  const last4 = trimmed.length >= 4 ? trimmed.slice(-4) : ""
  const { ciphertext, iv, tag } = encryptCompanyCamToken(trimmed)
  const record: CompanyCamCredentialsRecord = {
    companyId,
    connected: true,
    ciphertext,
    iv,
    tag,
    last4,
    verifiedAt: verifiedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await writeJsonFile(localPath, remoteKey, JSON.stringify(record, null, 2))
  return {
    connected: true,
    last4,
    verifiedAt: record.verifiedAt,
  }
}

export async function clearCompanyCamCredentials(companyId: string): Promise<void> {
  if (!companyId) return
  const { localPath, remoteKey } = connectionStoragePaths(companyId)
  await deleteJsonFile(localPath, remoteKey)
}

export async function getCompanyCamStatus(companyId: string): Promise<CompanyCamStatus> {
  const creds = await readCompanyCamCredentials(companyId)
  if (!creds || !creds.connected) {
    return { connected: false, last4: "" }
  }
  return {
    connected: true,
    last4: creds.last4,
    verifiedAt: creds.verifiedAt,
  }
}

export async function getDecryptedCompanyCamToken(companyId: string): Promise<string | null> {
  const creds = await readCompanyCamCredentials(companyId)
  if (!creds || !creds.connected) return null
  return decryptCompanyCamToken(creds)
}
