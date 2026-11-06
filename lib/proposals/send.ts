import { readSendKeys } from "../messaging/keys.ts"
import { extractEmailAddress, formatSenderAddress, sendSmtpEmail } from "../messaging/smtp.ts"

export type ProposalDelivery =
  | { delivery: "sent"; detail: string }
  | { delivery: "logged"; detail: string }
  | { delivery: "failed"; detail: string }

/** Email the proposal link with the PDF attached via 20i StackMail SMTP, or Resend as a fallback. */
export async function sendProposalEmail(input: {
  to: string
  subject: string
  body: string
  pdf: Uint8Array
  filename?: string
  companyName?: string
  replyTo?: string
}): Promise<ProposalDelivery> {
  const to = input.to.trim()
  if (!to.includes("@")) return { delivery: "failed", detail: "The client has no email." }
  const keys = readSendKeys()
  const filename = input.filename || "proposal.pdf"

  // Primary transport: SMTP (e.g., 20i StackMail support@scopepipe.com)
  if (keys.smtpHost && keys.smtpUser && keys.smtpPass && keys.smtpFrom.includes("@")) {
    const smtpResult = await sendSmtpEmail(
      {
        host: keys.smtpHost,
        port: keys.smtpPort,
        user: keys.smtpUser,
        pass: keys.smtpPass,
        from: keys.smtpFrom,
      },
      {
        to,
        subject: input.subject,
        text: input.body,
        companyName: input.companyName,
        replyTo: input.replyTo,
        attachment: {
          filename,
          contentType: "application/pdf",
          content: input.pdf,
        },
      },
    )
    if (!smtpResult.ok) {
      return { delivery: "failed", detail: smtpResult.detail }
    }
    return { delivery: "sent", detail: smtpResult.detail }
  }

  // Fallback transport: Resend HTTP API
  if (!keys.resendKey || !keys.resendFrom.includes("@")) {
    return {
      delivery: "logged",
      detail: "Email delivery is not configured. Add the email key on Integrations or configure SMTP before proposals can reach the inbox.",
    }
  }
  const sender = formatSenderAddress(keys.resendFrom, input.companyName)
  const replyTo = input.replyTo ? extractEmailAddress(input.replyTo) : ""
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${keys.resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: sender.header || keys.resendFrom,
        to,
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: input.subject,
        text: input.body,
        attachments: [
          {
            filename,
            content: Buffer.from(input.pdf).toString("base64"),
          },
        ],
      }),
    })
    if (!response.ok) {
      const detail = await response.text()
      return { delivery: "failed", detail: detail.slice(0, 180) || "Email was rejected." }
    }
    return { delivery: "sent", detail: "Emailed the proposal link and PDF." }
  } catch {
    return { delivery: "failed", detail: "Email could not be reached." }
  }
}
