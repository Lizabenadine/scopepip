import { readSendKeys } from "../messaging/keys.ts"

export type OfferDelivery =
  | { delivery: "sent"; detail: string }
  | { delivery: "logged"; detail: string }
  | { delivery: "failed"; detail: string }

/** Email the work-order link. Without Resend, the office still has the link to send. */
export async function sendWorkOrderOffer(input: {
  to: string
  name: string
  jobName: string
  link: string
}): Promise<OfferDelivery> {
  const to = input.to.trim()
  if (!to.includes("@")) return { delivery: "failed", detail: "Enter an email with an @." }
  const keys = readSendKeys()
  const body = [
    `${input.name},`,
    "",
    `${input.jobName} is ready for you to accept or pass.`,
    input.link,
    "",
    "Open the link on your phone. You do not need to be in the office.",
  ].join("\n")
  if (!keys.resendKey || !keys.resendFrom.includes("@")) {
    return {
      delivery: "logged",
      detail: "The link is ready. Email is not connected, so send them this link.",
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
        subject: `Work order: ${input.jobName}`,
        text: body,
      }),
    })
    if (!response.ok) {
      const detail = await response.text()
      return { delivery: "failed", detail: detail.slice(0, 180) || "Email was rejected." }
    }
    return { delivery: "sent", detail: "Sent." }
  } catch {
    return { delivery: "failed", detail: "Email could not be reached." }
  }
}
