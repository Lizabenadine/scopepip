import { displayCompanyName } from "../brand/company.ts"
import type { ScopeState } from "../data/seed.ts"
import { deliverFollowUp } from "./deliver.ts"
import { holdDrip, recordDrip } from "./record.ts"
import { collectDueFollowUps, reconcileFollowUps } from "./schedule.ts"
import type { DueFollowUp, FollowUpMessage } from "./types.ts"

/** Sent quotes only. A reply, a decline, or an acceptance takes the quote off this list. */
export function dueQuoteFollowUps(state: ScopeState, nowMs: number, origin?: string): DueFollowUp[] {
  const open = new Set(
    state.estimates.filter((estimate) => estimate.clientStatus === "sent" && !estimate.archived).map((estimate) => estimate.id),
  )
  return collectDueFollowUps(state, nowMs, origin).filter((item) => item.stage === "proposal_sent" && open.has(item.estimateId))
}

export async function runQuoteDrip(
  state: ScopeState,
  nowMs: number,
  origin?: string,
): Promise<{ state: ScopeState; delivered: number }> {
  let current = reconcileFollowUps(state, new Date(nowMs).toISOString())
  const due = dueQuoteFollowUps(current, nowMs, origin).slice(0, 20)
  let delivered = 0
  const fromName = displayCompanyName(current.estimateSettings.companyName)
  for (const item of due) {
    const result = await deliverFollowUp({
      channel: item.channel,
      to: item.to,
      subject: item.subject,
      body: item.body,
      fromName,
    })
    if (result.delivery === "failed") {
      current = holdDrip(current, item.estimateId, 15, nowMs)
      continue
    }
    current = recordDrip(current, messageFrom(item, result.delivery, result.detail, nowMs))
    delivered += 1
  }
  return { state: current, delivered }
}

function messageFrom(
  item: DueFollowUp,
  delivery: FollowUpMessage["delivery"],
  detail: string,
  nowMs: number,
): FollowUpMessage {
  return {
    id: crypto.randomUUID(),
    estimateId: item.estimateId,
    stepId: item.stepId,
    stage: item.stage,
    channel: item.channel,
    to: item.to,
    subject: item.subject,
    body: item.body,
    sentAt: new Date(nowMs).toISOString(),
    delivery,
    detail,
  }
}
