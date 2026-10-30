import type { FollowUpChannel } from "./types.ts"
import { readSendKeys } from "../messaging/keys.ts"

export interface DeliveryInput {
  channel: FollowUpChannel
  to: string
  subject: string
  body: string
  fromName: string
}

export type DeliveryResult =
  | { delivery: "sent"; detail: string }
  | { delivery: "logged"; detail: string }
  | { delivery: "skipped"; detail: string }
  | { delivery: "failed"; detail: string }

export function followUpTransport(): { email: boolean; text: boolean } {
  const keys = readSendKeys()
  return {
    email: Boolean(keys.resendKey && keys.resendFrom.includes("@")),
    text: Boolean(keys.twilioSid && keys.twilioToken && keys.twilioFrom),
  }
}

export async function deliverFollowUp(input: DeliveryInput): Promise<DeliveryResult> {
  const body = input.body.trim()
  if (!body) return { delivery: "skipped", detail: "The message is empty." }
  if (input.channel === "email") return deliverEmail(input.to.trim(), input.subject.trim() || "A note from your painter", body)
  return deliverText(input.to, body)
}

async function deliverEmail(to: string, subject: string, body: string): Promise<DeliveryResult> {
  if (!to.includes("@")) return { delivery: "skipped", detail: "The client has no email." }
  const keys = readSendKeys()
  if (!keys.resendKey || !keys.resendFrom.includes("@")) {
    return { delivery: "logged", detail: "Logged on the deal. Save the email key on Integrations to send email." }
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${keys.resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: keys.resendFrom, to, subject, text: body }),
    })
    if (!response.ok) {
      const detail = await response.text()
      return { delivery: "failed", detail: detail.slice(0, 180) || "Email was rejected." }
    }
    return { delivery: "sent", detail: "Email sent." }
  } catch {
    return { delivery: "failed", detail: "Email could not be reached." }
  }
}

async function deliverText(to: string, body: string): Promise<DeliveryResult> {
  const keys = readSendKeys()
  if (!keys.twilioSid || !keys.twilioToken || !keys.twilioFrom) {
    return { delivery: "logged", detail: "Logged on the deal. Save the text key on Integrations to send texts." }
  }
  const destination = e164(to)
  if (!destination) return { delivery: "skipped", detail: "The phone number needs 10 digits." }
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${keys.twilioSid}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${keys.twilioSid}:${keys.twilioToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: destination, From: keys.twilioFrom, Body: body }),
    })
    if (!response.ok) {
      const detail = await response.text()
      return { delivery: "failed", detail: detail.slice(0, 180) || "Text was rejected." }
    }
    return { delivery: "sent", detail: "Text sent." }
  } catch {
    return { delivery: "failed", detail: "Text could not be reached." }
  }
}

export function e164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  if (phone.trim().startsWith("+") && digits.length >= 10) return `+${digits}`
  return null
}
