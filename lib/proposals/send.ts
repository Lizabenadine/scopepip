import { readSendKeys } from "../messaging/keys.ts"

export type ProposalDelivery =
  | { delivery: "sent"; detail: string }
  | { delivery: "logged"; detail: string }
  | { delivery: "failed"; detail: string }

/** Email the proposal link with the PDF attached. Without Resend, the message stays on the job. */
export async function sendProposalEmail(input: {
  to: string
  subject: string
  body: string
  pdf: Uint8Array
}): Promise<ProposalDelivery> {
  const to = input.to.trim()
  if (!to.includes("@")) return { delivery: "failed", detail: "The client has no email." }
  const keys = readSendKeys()
  if (!keys.resendKey || !keys.resendFrom.includes("@")) {
    return {
      delivery: "logged",
      detail: "The proposal link and PDF are ready. Add the email key on Integrations before they reach the inbox.",
    }
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${keys.resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: keys.resendFrom,
        to,
        subject: input.subject,
        text: input.body,
        attachments: [
          {
            filename: "proposal.pdf",
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
