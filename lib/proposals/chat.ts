import type { Estimate, ProposalMessage } from "../types.ts"

const MESSAGE_CAP = 80
const BODY_LIMIT = 2_000

export function postProposalMessage(
  estimate: Estimate,
  input: { from: ProposalMessage["from"]; body: string; now?: string; id?: string },
): { ok: true; estimate: Estimate; message: ProposalMessage } | { ok: false; reason: string } {
  const body = input.body.trim()
  if (!body) return { ok: false, reason: "Write a message before sending." }
  if (body.length > BODY_LIMIT) return { ok: false, reason: "That message is too long." }
  const message: ProposalMessage = {
    id: input.id ?? `chat_${crypto.randomUUID()}`,
    from: input.from,
    body,
    createdAt: input.now ?? new Date().toISOString(),
  }
  const proposalMessages = [...(estimate.proposalMessages ?? []), message].slice(-MESSAGE_CAP)
  return {
    ok: true,
    message,
    estimate: { ...estimate, proposalMessages, updatedAt: message.createdAt },
  }
}
