import fs from "node:fs"
import path from "node:path"

export interface SendKeys {
  resendKey: string
  resendFrom: string
  twilioSid: string
  twilioToken: string
  twilioFrom: string
  supabaseSecret: string
}

const EMPTY: SendKeys = {
  resendKey: "",
  resendFrom: "",
  twilioSid: "",
  twilioToken: "",
  twilioFrom: "",
  supabaseSecret: "",
}

function keysFile(): string {
  return process.env.SEND_KEYS_PATH || path.join(process.cwd(), "data", "send-keys.json")
}

function savedKeys(): SendKeys {
  try {
    const parsed = JSON.parse(fs.readFileSync(keysFile(), "utf8")) as Partial<SendKeys>
    return {
      resendKey: text(parsed.resendKey),
      resendFrom: text(parsed.resendFrom),
      twilioSid: text(parsed.twilioSid),
      twilioToken: text(parsed.twilioToken),
      twilioFrom: text(parsed.twilioFrom),
      supabaseSecret: text(parsed.supabaseSecret),
    }
  } catch {
    return { ...EMPTY }
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function envOrSaved(name: string, saved: string): string {
  const fromEnv = process.env[name]?.trim()
  return fromEnv || saved
}

/** Env values win. A saved key is used when the host has not set that variable. */
export function readSendKeys(): SendKeys {
  const saved = savedKeys()
  return {
    resendKey: envOrSaved("RESEND_API_KEY", saved.resendKey),
    resendFrom: envOrSaved("FOLLOW_UP_FROM_EMAIL", saved.resendFrom),
    twilioSid: envOrSaved("TWILIO_ACCOUNT_SID", saved.twilioSid),
    twilioToken: envOrSaved("TWILIO_AUTH_TOKEN", saved.twilioToken),
    twilioFrom: envOrSaved("TWILIO_FROM_NUMBER", saved.twilioFrom),
    supabaseSecret:
      process.env.SUPABASE_SECRET_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      saved.supabaseSecret,
  }
}

export function sendKeyStatus(): {
  email: boolean
  emailFrom: string
  text: boolean
  textFrom: string
  supabase: boolean
  cron: boolean
} {
  const keys = readSendKeys()
  return {
    email: Boolean(keys.resendKey && keys.resendFrom.includes("@")),
    emailFrom: keys.resendFrom.includes("@") ? keys.resendFrom : "",
    text: Boolean(keys.twilioSid && keys.twilioToken && keys.twilioFrom),
    textFrom: keys.twilioFrom ? `···${keys.twilioFrom.slice(-4)}` : "",
    supabase: keys.supabaseSecret.length >= 20,
    cron: Boolean(process.env.CRON_SECRET?.trim()),
  }
}

export function saveSendKeys(patch: Partial<SendKeys>): { ok: true } | { ok: false; reason: string } {
  const current = savedKeys()
  const next: SendKeys = { ...current }
  if (patch.resendKey !== undefined) {
    const key = patch.resendKey.trim()
    if (key && key.length < 8) return { ok: false, reason: "The Resend key is too short." }
    next.resendKey = key || current.resendKey
  }
  if (patch.resendFrom !== undefined) {
    const from = patch.resendFrom.trim()
    if (from && !from.includes("@")) return { ok: false, reason: "Resend needs a from email." }
    next.resendFrom = from
  }
  if (patch.twilioSid !== undefined) {
    const sid = patch.twilioSid.trim()
    if (sid && !sid.startsWith("AC")) return { ok: false, reason: "The Twilio account SID starts with AC." }
    next.twilioSid = sid || current.twilioSid
  }
  if (patch.twilioToken !== undefined) {
    const token = patch.twilioToken.trim()
    if (token && token.length < 8) return { ok: false, reason: "The Twilio token is too short." }
    next.twilioToken = token || current.twilioToken
  }
  if (patch.twilioFrom !== undefined) {
    next.twilioFrom = patch.twilioFrom.trim()
  }
  if (patch.supabaseSecret !== undefined) {
    const secret = patch.supabaseSecret.trim()
    if (secret && secret.length < 20) return { ok: false, reason: "The Supabase service key is too short." }
    next.supabaseSecret = secret || current.supabaseSecret
  }
  const file = keysFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(next))
  return { ok: true }
}

export function clearSendKeys(which: "resend" | "twilio" | "supabase"): void {
  const current = savedKeys()
  if (which === "resend") {
    current.resendKey = ""
    current.resendFrom = ""
  } else if (which === "twilio") {
    current.twilioSid = ""
    current.twilioToken = ""
    current.twilioFrom = ""
  } else {
    current.supabaseSecret = ""
  }
  const file = keysFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(current))
}
