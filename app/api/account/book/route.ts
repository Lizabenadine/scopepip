import { bookForEstimator } from "@/lib/auth/access"
import { readCompanyBook, writeCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { parseBookPayload } from "@/lib/data/book-payload"
import { isScopeState } from "@/lib/data/seed"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  const book = await readCompanyBook(session.companyId, { bypassCache: true })
  if (!book) return Response.json({ reason: "This company has no book." }, { status: 404 })
  return Response.json(
    { revision: book.revision, state: book.state },
    { headers: { "cache-control": "no-store" } },
  )
}

export async function PUT(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  const body = (await parseBookPayload(request).catch(() => null)) as { revision?: unknown; state?: unknown } | null
  if (!body || typeof body.revision !== "number" || !isScopeState(body.state)) {
    return Response.json({ reason: "The book could not be read." }, { status: 400 })
  }
  const current = await readCompanyBook(session.companyId, { bypassCache: true })
  if (!current) return Response.json({ reason: "This company has no book." }, { status: 404 })

  // Preserve signed proposals and their work orders from being overwritten by an older browser snapshot
  const preservedEstimates = body.state.estimates.map((incoming) => {
    const existing = current.state.estimates.find((item) => item.id === incoming.id)
    const isExistingSigned = Boolean(
      existing && (existing.signature || existing.acceptedAt || existing.clientStatus === "accepted")
    )
    const isIncomingSigned = Boolean(
      incoming.signature || incoming.acceptedAt || incoming.clientStatus === "accepted"
    )
    if (isExistingSigned && !isIncomingSigned && existing) {
      return {
        ...incoming,
        clientStatus: "accepted" as const,
        acceptedAt: existing.acceptedAt || new Date().toISOString(),
        signature: existing.signature,
        declinedAt: null,
      }
    }
    return incoming
  })

  // Ensure work orders for signed estimates are preserved
  const preservedWorkOrders = [...body.state.workOrders]
  for (const existingOrder of current.state.workOrders) {
    if (!preservedWorkOrders.some((order) => order.estimateId === existingOrder.estimateId)) {
      const isSigned = current.state.estimates.some(
        (e) => e.id === existingOrder.estimateId && (e.signature || e.acceptedAt || e.clientStatus === "accepted")
      )
      if (isSigned) {
        preservedWorkOrders.push(existingOrder)
      }
    }
  }

  const mergedState = {
    ...body.state,
    estimates: preservedEstimates,
    workOrders: preservedWorkOrders,
  }

  const state = session.role === "estimator" ? bookForEstimator(current.state, mergedState, session.id) : mergedState
  try {
    const saved = await writeCompanyBook(session.companyId, body.revision, state)
    if (!saved.ok && "state" in saved) {
      return Response.json({ reason: "conflict", revision: saved.revision, state: saved.state }, { status: 409 })
    }
    if (!saved.ok) return Response.json({ reason: saved.reason }, { status: 404 })
    return Response.json({ ok: true, revision: saved.revision })
  } catch (error) {
    const reason = error instanceof Error && error.message.trim()
      ? `Could not save this estimate: ${error.message}`
      : "Could not save this estimate to your account. Your edits are still on screen."
    return Response.json({ reason }, { status: 500 })
  }
}
