import type { ScopeState } from "../data/seed.ts"
import { salesStageOf } from "../pipeline/board.ts"
import type { Estimate, WorkOrder } from "../types.ts"

export const HOOK_EVENTS = ["lead.created", "proposal.sent", "proposal.signed", "job.completed"] as const

export type HookEvent = (typeof HOOK_EVENTS)[number]

export interface HookMoment {
  event: HookEvent
  payload: {
    estimateId: string
    client: { name: string; email: string; phone: string }
    job: { id: string; title: string; address: string }
    occurredAt: string
  }
}

type Book = Pick<ScopeState, "clients" | "estimates" | "workOrders" | "stages">

/** Moments that appeared between two saved books. A repeat save sends nothing. */
export function hookMoments(before: Book, after: Book): HookMoment[] {
  const previous = new Map(before.estimates.map((estimate) => [estimate.id, estimate]))
  const previousOrders = new Map(before.workOrders.map((order) => [order.estimateId, order]))
  const moments: HookMoment[] = []
  for (const estimate of after.estimates) {
    const earlier = previous.get(estimate.id)
    const order = after.workOrders.find((item) => item.estimateId === estimate.id)
    if (!earlier) moments.push(moment("lead.created", after, estimate, estimate.createdAt || estimate.updatedAt))
    if (becameSent(before, after, earlier, estimate)) {
      moments.push(moment("proposal.sent", after, estimate, estimate.updatedAt))
    }
    if (becameSigned(earlier, estimate)) {
      moments.push(moment("proposal.signed", after, estimate, estimate.acceptedAt || estimate.updatedAt))
    }
    if (becameComplete(before, after, earlier, estimate, previousOrders.get(estimate.id), order)) {
      moments.push(moment("job.completed", after, estimate, estimate.updatedAt))
    }
  }
  return moments.slice(0, 20)
}

function becameSent(before: Book, after: Book, earlier: Estimate | undefined, estimate: Estimate): boolean {
  return !wasSent(before, earlier) && isSent(after, estimate)
}

function wasSent(book: Book, estimate: Estimate | undefined): boolean {
  if (!estimate) return false
  return estimate.clientStatus === "sent" || salesStageOf(estimate) === "proposal_sent" || stageSlug(book, estimate.stageId) === "estimate_sent"
}

function isSent(book: Book, estimate: Estimate): boolean {
  return wasSent(book, estimate)
}

function becameSigned(earlier: Estimate | undefined, estimate: Estimate): boolean {
  const was = earlier?.clientStatus === "accepted" || Boolean(earlier?.signature)
  const now = estimate.clientStatus === "accepted" || Boolean(estimate.signature)
  return !was && now
}

function becameComplete(
  before: Book,
  after: Book,
  earlier: Estimate | undefined,
  estimate: Estimate,
  previousOrder: WorkOrder | undefined,
  order: WorkOrder | undefined,
): boolean {
  const was = previousOrder?.status === "complete" || stageSlug(before, earlier?.stageId) === "completed"
  const now = order?.status === "complete" || stageSlug(after, estimate.stageId) === "completed"
  return !was && now
}

function stageSlug(book: Book, stageId: string | undefined): string | undefined {
  if (!stageId) return undefined
  return book.stages.find((stage) => stage.id === stageId)?.slug
}

function moment(event: HookEvent, book: Book, estimate: Estimate, occurredAt: string): HookMoment {
  const client = book.clients.find((item) => item.id === estimate.clientId)
  return {
    event,
    payload: {
      estimateId: estimate.id,
      client: {
        name: client?.name ?? "Client",
        email: client?.email ?? "",
        phone: client?.phone ?? "",
      },
      job: { id: estimate.id, title: estimate.title, address: estimate.jobAddress },
      occurredAt,
    },
  }
}
