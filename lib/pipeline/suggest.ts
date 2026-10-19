import { appointmentLabel } from "../appointments/visit.ts"
import { bookingPath } from "../bookings/slots.ts"
import type { Client, Estimate, WorkOrder } from "../types.ts"
import { jobStageOf, salesStageOf } from "./board.ts"

export interface SuggestedFollowUp {
  channel: "text" | "email" | "none"
  label: string
  body: string
}

export function suggestFollowUp(input: {
  estimate: Estimate
  client: Client | undefined
  company: string
  reply?: string
  order?: WorkOrder
  stageSlug?: string
}): SuggestedFollowUp {
  const client = input.client
  const name = client?.name?.trim() || "there"
  const company = input.company.trim() || "ScopePipe"
  const address = input.estimate.jobAddress.trim() || client?.address.trim() || "the job"
  const book = bookingPath(input.estimate.publicToken)
  const channel = client && digits(client.phone).length >= 10 ? "text" : client?.email.includes("@") ? "email" : "none"
  if (channel === "none") {
    return { channel, label: "Missing contact", body: "Add a phone or email before sending a follow-up." }
  }
  const reply = input.reply?.trim()
  if (reply) {
    return {
      channel,
      label: "Reply to the customer",
      body: `Hi ${name}, thanks for writing back about "${clip(reply)}" I can work from that for ${address}.`,
    }
  }
  const opened = (input.estimate.proposalOpens ?? []).length > 0 && input.estimate.clientStatus !== "accepted"
  if (opened) {
    return {
      channel,
      label: "They opened the proposal",
      body: `Hi ${name}, I saw you opened the proposal for ${input.estimate.title}. I can answer questions, or you can pick a time: ${book}`,
    }
  }
  if (input.estimate.estimateVisitOn) {
    const when = appointmentLabel(input.estimate.estimateVisitOn, input.estimate.estimateVisitAt)
    return {
      channel,
      label: "Remind them of the visit",
      body: `Hi ${name}, we are set for ${when}. I will be at ${address}.`,
    }
  }
  const stage = salesStageOf(input.estimate) ?? jobStageOf(input.estimate, input.order, input.stageSlug)
  if (stage === "proposal_sent") {
    return {
      channel,
      label: "Check on the proposal",
      body: `Hi ${name}, the proposal for ${address} is ready when you want to look it over.`,
    }
  }
  if (stage === "estimate_requested") {
    return {
      channel,
      label: "Ask for a walkthrough",
      body: `Hi ${name}, this is ${company}. We can walk ${address} and send a painting price. Pick a time: ${book}`,
    }
  }
  if (stage === "warm") {
    return {
      channel,
      label: "Check in",
      body: `Hi ${name}, still happy to price the painting at ${address}. Pick a time: ${book}`,
    }
  }
  if (stage === "project_completed") {
    return {
      channel,
      label: "Ask for a review",
      body: `Hi ${name}, thank you for having ${company} paint ${address}. If the work looks right, a short review helps us.`,
    }
  }
  if (stage === "project_in_progress") {
    return {
      channel,
      label: "Check in on the crew",
      body: `Hi ${name}, the crew is at ${address}. Reply if you want anything changed.`,
    }
  }
  return {
    channel,
    label: "Introduce the company",
    body: `Hi ${name}, this is ${company}. We can walk the job at ${address} and send a painting price. Pick a time: ${book}`,
  }
}

function digits(phone: string): string {
  return phone.replace(/\D/g, "")
}

function clip(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim()
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean
}
