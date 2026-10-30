import type { SubcontractorOffer, WorkOrder } from "../types.ts"

export function createSubcontractorOffer(input: {
  name: string
  email: string
  now?: string
  token?: string
  id?: string
}): SubcontractorOffer | null {
  const name = input.name.trim()
  const email = input.email.trim()
  if (!name || !email.includes("@")) return null
  const now = input.now ?? new Date().toISOString()
  return {
    id: input.id ?? crypto.randomUUID(),
    token: input.token ?? crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    name,
    email,
    status: "sent",
    sentAt: now,
  }
}

export function offerSendBlock(offers: SubcontractorOffer[] | undefined, _email: string): string | null {
  const list = offers ?? []
  if (list.some((offer) => offer.status === "accepted")) return "A subcontractor already accepted this job."
  if (list.some((offer) => offer.status === "sent")) {
    return "This work order is already with a subcontractor. Wait until they accept or pass."
  }
  return null
}

export function answerSubcontractorOffer(
  order: WorkOrder,
  token: string,
  decision: "accept" | "decline",
  answeredAt: string,
): { ok: true; order: WorkOrder } | { ok: false; reason: string } {
  const offers = order.offers ?? []
  const offer = offers.find((item) => item.token === token)
  if (!offer) return { ok: false, reason: "This work order link is not valid." }
  if (offer.status !== "sent") return { ok: true, order }
  const answered = offers.map((item) =>
    item.token === token
      ? { ...item, status: decision === "accept" ? ("accepted" as const) : ("declined" as const), answeredAt }
      : item,
  )
  if (decision === "decline") return { ok: true, order: { ...order, offers: answered } }
  const taken = Boolean(order.subSignature) || offers.some((item) => item.status === "accepted")
  if (taken) return { ok: false, reason: "Another subcontractor already accepted this job." }
  const signedDate = answeredAt.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(signedDate)) {
    return { ok: false, reason: "This work order could not be signed." }
  }
  return {
    ok: true,
    order: { ...order, offers: answered, subSignature: offer.name, subSignedDate: signedDate },
  }
}
