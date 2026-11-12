import crypto from "node:crypto"
import path from "node:path"
import { deleteJsonFile, readJsonFile, writeJsonFile } from "../auth/account-store.ts"

export interface FacebookCredentialsRecord {
  companyId: string
  connected: boolean
  pageId: string
  pageName: string
  ciphertext: string
  iv: string
  tag: string
  verifiedAt?: string
  updatedAt: string
}

export interface FacebookStatus {
  connected: boolean
  pageId?: string
  pageName?: string
  verifiedAt?: string
}

export interface FacebookPageMapping {
  pageId: string
  companyId: string
  pageName: string
}

function connectionStoragePaths(companyId: string): { localPath: string; remoteKey: string } {
  const sanitized = companyId.replace(/[^a-zA-Z0-9_-]/g, "")
  const baseDir = process.env.FACEBOOK_DIR || path.join(process.cwd(), "data", "connections")
  return {
    localPath: path.join(baseDir, `${sanitized}-facebook.json`),
    remoteKey: `connections/${sanitized}/facebook.json`,
  }
}

function pageMappingPaths(pageId: string): { localPath: string; remoteKey: string } {
  const sanitized = pageId.replace(/[^a-zA-Z0-9_-]/g, "")
  const baseDir = process.env.FACEBOOK_DIR || path.join(process.cwd(), "data", "connections", "facebook-pages")
  return {
    localPath: path.join(baseDir, `${sanitized}.json`),
    remoteKey: `connections/facebook-pages/${sanitized}.json`,
  }
}

function deriveEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET?.trim() || "scopepipe-facebook-default-salt-key"
  return crypto.createHmac("sha256", secret).update("scopepipe:facebook:credentials:v1").digest()
}

export function encryptFacebookToken(token: string): { ciphertext: string; iv: string; tag: string } {
  const key = deriveEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]).toString("hex")
  const tag = cipher.getAuthTag().toString("hex")
  return { ciphertext, iv: iv.toString("hex"), tag }
}

export function decryptFacebookToken(record: { ciphertext: string; iv: string; tag: string }): string | null {
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

export async function readFacebookCredentials(companyId: string): Promise<FacebookCredentialsRecord | null> {
  if (!companyId) return null
  const { localPath, remoteKey } = connectionStoragePaths(companyId)
  const raw = await readJsonFile(localPath, remoteKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<FacebookCredentialsRecord>
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.ciphertext === "string" &&
      typeof parsed.iv === "string" &&
      typeof parsed.tag === "string" &&
      typeof parsed.pageId === "string"
    ) {
      return {
        companyId,
        connected: parsed.connected === true,
        pageId: parsed.pageId,
        pageName: typeof parsed.pageName === "string" ? parsed.pageName : "Facebook Page",
        ciphertext: parsed.ciphertext,
        iv: parsed.iv,
        tag: parsed.tag,
        verifiedAt: typeof parsed.verifiedAt === "string" ? parsed.verifiedAt : undefined,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      }
    }
    return null
  } catch {
    return null
  }
}

export async function writeFacebookCredentials(
  companyId: string,
  input: { pageId: string; pageName?: string; pageAccessToken: string },
): Promise<FacebookStatus> {
  const trimmedToken = input.pageAccessToken.trim()
  const trimmedPageId = input.pageId.trim()
  const pageName = input.pageName?.trim() || "Facebook Business Page"

  const { localPath, remoteKey } = connectionStoragePaths(companyId)
  const { ciphertext, iv, tag } = encryptFacebookToken(trimmedToken)
  const verifiedAt = new Date().toISOString()

  const record: FacebookCredentialsRecord = {
    companyId,
    connected: true,
    pageId: trimmedPageId,
    pageName,
    ciphertext,
    iv,
    tag,
    verifiedAt,
    updatedAt: verifiedAt,
  }

  await writeJsonFile(localPath, remoteKey, JSON.stringify(record, null, 2))

  // Index the page ID to company ID mapping for O(1) webhook routing
  const mapPaths = pageMappingPaths(trimmedPageId)
  const mapping: FacebookPageMapping = {
    pageId: trimmedPageId,
    companyId,
    pageName,
  }
  await writeJsonFile(mapPaths.localPath, mapPaths.remoteKey, JSON.stringify(mapping, null, 2))

  return {
    connected: true,
    pageId: trimmedPageId,
    pageName,
    verifiedAt,
  }
}

export async function clearFacebookCredentials(companyId: string): Promise<void> {
  if (!companyId) return
  const current = await readFacebookCredentials(companyId)
  if (current?.pageId) {
    const mapPaths = pageMappingPaths(current.pageId)
    await deleteJsonFile(mapPaths.localPath, mapPaths.remoteKey)
  }
  const { localPath, remoteKey } = connectionStoragePaths(companyId)
  await deleteJsonFile(localPath, remoteKey)
}

export async function getFacebookStatus(companyId: string): Promise<FacebookStatus> {
  const creds = await readFacebookCredentials(companyId)
  if (!creds || !creds.connected) {
    return { connected: false }
  }
  return {
    connected: true,
    pageId: creds.pageId,
    pageName: creds.pageName,
    verifiedAt: creds.verifiedAt,
  }
}

export async function getDecryptedFacebookToken(companyId: string): Promise<string | null> {
  const creds = await readFacebookCredentials(companyId)
  if (!creds || !creds.connected) return null
  return decryptFacebookToken(creds)
}

export async function getCompanyForFacebookPage(pageId: string): Promise<FacebookPageMapping | null> {
  if (!pageId) return null
  const mapPaths = pageMappingPaths(pageId)
  const raw = await readJsonFile(mapPaths.localPath, mapPaths.remoteKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<FacebookPageMapping>
    if (parsed && typeof parsed.companyId === "string" && typeof parsed.pageId === "string") {
      return {
        companyId: parsed.companyId,
        pageId: parsed.pageId,
        pageName: parsed.pageName || "Facebook Page",
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Verifies a Facebook Page ID and Page Access Token against Meta's Graph API.
 */
export async function verifyFacebookPageToken(
  pageId: string,
  token: string,
): Promise<{ ok: boolean; pageName?: string; reason?: string }> {
  const cleanId = pageId.trim()
  const cleanToken = token.trim()
  if (!cleanId || !cleanToken) {
    return { ok: false, reason: "Page ID and Page Access Token are required." }
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(cleanId)}?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`)
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (!res.ok) {
      const errorObj = (data.error || {}) as Record<string, unknown>
      const message = typeof errorObj.message === "string" ? errorObj.message : "The Page Access Token was rejected by Facebook."
      return { ok: false, reason: message }
    }

    const pageName = typeof data.name === "string" ? data.name : "Facebook Business Page"
    return { ok: true, pageName }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Facebook Graph API could not be reached."
    return { ok: false, reason: message }
  }
}

/**
 * Fetches the lead answers (field_data) for a given leadgen_id from Meta Graph API.
 */
export async function fetchFacebookLeadDetails(
  leadgenId: string,
  pageAccessToken: string,
): Promise<Record<string, unknown> | null> {
  const cleanId = leadgenId.trim()
  const cleanToken = pageAccessToken.trim()
  if (!cleanId || !cleanToken) return null

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(cleanId)}?access_token=${encodeURIComponent(cleanToken)}`)
    if (!res.ok) return null
    return (await res.json().catch(() => null)) as Record<string, unknown> | null
  } catch {
    return null
  }
}

export function facebookOAuthConfig(): { appId: string; configured: boolean } {
  const appId = process.env.FACEBOOK_APP_ID?.trim() || ""
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim() || ""
  return {
    appId,
    configured: Boolean(appId && appSecret),
  }
}

export function buildFacebookOAuthUrl(redirectUri: string, state: string): string | null {
  const { appId, configured } = facebookOAuthConfig()
  if (!configured) return null
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "leads_retrieval",
    "pages_manage_ads",
    "pages_manage_metadata",
  ].join(",")
  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`
}

export async function exchangeFacebookCodeForPage(
  code: string,
  redirectUri: string,
): Promise<{ ok: true; pageId: string; pageName: string; pageAccessToken: string } | { ok: false; reason: string }> {
  const appId = process.env.FACEBOOK_APP_ID?.trim()
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim()
  if (!appId || !appSecret) {
    return { ok: false, reason: "FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is not configured on the host." }
  }

  try {
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = (await tokenRes.json().catch(() => ({}))) as Record<string, unknown>
    if (!tokenRes.ok || typeof tokenData.access_token !== "string") {
      const err = (tokenData.error || {}) as Record<string, unknown>
      return { ok: false, reason: typeof err.message === "string" ? err.message : "Failed to obtain access token from Facebook." }
    }
    const userAccessToken = tokenData.access_token

    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`
    const pagesRes = await fetch(pagesUrl)
    const pagesData = (await pagesRes.json().catch(() => ({}))) as { data?: Array<{ id: string; name: string; access_token: string }> }
    if (!pagesRes.ok || !Array.isArray(pagesData.data) || pagesData.data.length === 0) {
      return { ok: false, reason: "No Facebook Business Pages found for this account. Ensure your user has admin/advertiser access to the page." }
    }

    const primaryPage = pagesData.data[0]
    if (!primaryPage || !primaryPage.id || !primaryPage.access_token) {
      return { ok: false, reason: "Invalid page credentials returned from Facebook." }
    }

    await subscribePageToLeadgen(primaryPage.id, primaryPage.access_token)

    return {
      ok: true,
      pageId: primaryPage.id,
      pageName: primaryPage.name || "Facebook Business Page",
      pageAccessToken: primaryPage.access_token,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error communicating with Facebook Graph API."
    return { ok: false, reason: message }
  }
}

export async function subscribePageToLeadgen(pageId: string, pageAccessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/subscribed_apps?subscribed_fields=leadgen&access_token=${encodeURIComponent(pageAccessToken)}`, {
      method: "POST",
    })
    return res.ok
  } catch {
    return false
  }
}
