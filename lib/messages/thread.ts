import type { ScopeState } from "../data/seed.ts"
import { followUpStageFor, startEnrollment } from "../follow-ups/schedule.ts"
import type { FollowUpEnrollment } from "../follow-ups/types.ts"
import type { Client, Estimate, TextMessage } from "../types.ts"

const MESSAGE_CAP = 200

export interface InboundText {
  id: string
  from: string
  body: string
  mediaUrls: string[]
  createdAt: string
}

export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 10) return ""
  return digits.slice(-10)
}

export function clientForPhone(clients: Client[], phone: string): Client | null {
  const key = phoneKey(phone)
  if (!key) return null
  const matches = clients.filter((client) => phoneKey(client.phone) === key)
  if (matches.length === 0) return null
  return [...matches].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
}

export function dealForClient(estimates: Estimate[], clientId: string): Estimate | null {
  const rows = estimates.filter((estimate) => estimate.clientId === clientId && !estimate.archived)
  const active = rows.find((estimate) => estimate.followUp?.status === "active")
  if (active) return active
  return [...rows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
}

export function latestInbound(messages: TextMessage[] | undefined): TextMessage | null {
  const inbound = (messages ?? []).filter((message) => message.direction === "in")
  return inbound[inbound.length - 1] ?? null
}

export function applyInbound(state: ScopeState, inbound: InboundText): { state: ScopeState; matched: boolean } {
  const client = clientForPhone(state.clients, inbound.from)
  if (!client) {
    if ((state.unmatchedTexts ?? []).some((message) => message.id === inbound.id)) return { state, matched: false }
    const unmatched = {
      ...inboundMessage(inbound, null),
      from: inbound.from,
    }
    return {
      state: { ...state, unmatchedTexts: [...(state.unmatchedTexts ?? []), unmatched].slice(-MESSAGE_CAP) },
      matched: false,
    }
  }
  if ((client.messages ?? []).some((message) => message.id === inbound.id)) return { state, matched: true }
  return { state: landOnClient(state, client.id, inboundMessage(inbound, dealForClient(state.estimates, client.id)?.id ?? null), inbound.createdAt), matched: true }
}

export function applyCustomerReply(
  state: ScopeState,
  clientId: string,
  inbound: InboundText,
): ScopeState {
  const client = state.clients.find((item) => item.id === clientId)
  if (!client) return state
  if ((client.messages ?? []).some((message) => message.id === inbound.id)) return state
  const deal = dealForClient(state.estimates, clientId)
  return landOnClient(state, clientId, { ...inboundMessage(inbound, deal?.id ?? null), from: inbound.from || client.phone }, inbound.createdAt)
}

export function applyAssignUnmatched(state: ScopeState, messageId: string, clientId: string): ScopeState {
  const message = (state.unmatchedTexts ?? []).find((item) => item.id === messageId)
  if (!message) return state
  const next = applyCustomerReply(state, clientId, {
    id: message.id,
    from: message.from ?? "",
    body: message.body,
    mediaUrls: message.mediaUrls,
    createdAt: message.createdAt,
  })
  if (next === state) return state
  return {
    ...next,
    unmatchedTexts: (next.unmatchedTexts ?? state.unmatchedTexts ?? []).filter((item) => item.id !== messageId),
  }
}

export function applyOutbound(state: ScopeState, clientId: string, message: TextMessage): ScopeState {
  const client = state.clients.find((item) => item.id === clientId)
  if (!client) return state
  if ((client.messages ?? []).some((item) => item.id === message.id)) return state
  return {
    ...state,
    clients: state.clients.map((item) =>
      item.id === clientId ? { ...item, messages: cap([...item.messages ?? [], message]), updatedAt: message.createdAt } : item,
    ),
  }
}

export function markOutboundDelivery(
  state: ScopeState,
  clientId: string,
  messageId: string,
  delivery: TextMessage["delivery"],
): ScopeState {
  let changed = false
  const clients = state.clients.map((client) => {
    if (client.id !== clientId) return client
    const messages = (client.messages ?? []).map((message) => {
      if (message.id !== messageId || message.delivery === delivery) return message
      changed = true
      return { ...message, delivery }
    })
    return changed ? { ...client, messages } : client
  })
  if (!changed) return state
  return { ...state, clients }
}

function landOnClient(state: ScopeState, clientId: string, message: TextMessage, nowIso: string): ScopeState {
  const clients = state.clients.map((client) =>
    client.id === clientId
      ? { ...client, messages: cap([...(client.messages ?? []), message]), updatedAt: nowIso }
      : client,
  )
  const estimates = state.estimates.map((estimate) => {
    const active = estimate.clientId === clientId && estimate.followUp?.status === "active"
    const landed = estimate.id === message.estimateId
    if (!active && !landed) return estimate
    const followUp = stoppedForReply(state, estimate, nowIso)
    if (followUp === estimate.followUp) return estimate
    const line = "Customer replied. Follow-up stopped."
    const notes = estimate.notes.includes(line) ? estimate.notes : estimate.notes.trim() ? `${estimate.notes.trim()}\n${line}` : line
    return { ...estimate, followUp, notes, updatedAt: nowIso }
  })
  return { ...state, clients, estimates }
}

function stoppedForReply(state: ScopeState, estimate: Estimate, nowIso: string): FollowUpEnrollment | null | undefined {
  if (estimate.followUp?.status === "stopped") return estimate.followUp
  const stage = followUpStageFor(state, estimate)
  if (!estimate.followUp && !stage) return estimate.followUp
  const base = estimate.followUp ?? startEnrollment(stage!, nowIso)
  return { ...base, status: "stopped", stoppedReason: "reply", holdUntil: null }
}

function inboundMessage(inbound: InboundText, estimateId: string | null): TextMessage {
  return {
    id: inbound.id,
    direction: "in",
    body: inbound.body.trim(),
    mediaUrls: inbound.mediaUrls.filter(Boolean).slice(0, 4),
    createdAt: inbound.createdAt,
    estimateId,
    from: inbound.from,
    delivery: "received",
  }
}

function cap(messages: TextMessage[]): TextMessage[] {
  return messages.slice(-MESSAGE_CAP)
}
