import { bookForEstimator } from "@/lib/auth/access"
import { readCompanyBook, writeCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import {
  applySingleEstimatePatch,
  isSingleEstimatePayload,
  parseBookPayload,
} from "@/lib/data/book-payload"
import type { Client, WorkOrder } from "@/lib/types"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, reason: "Sign in first." }, { status: 401 })
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? ""
  if (!id) return Response.json({ ok: false, reason: "Estimate id is required." }, { status: 400 })
  const book = await readCompanyBook(session.companyId)
  if (!book) return Response.json({ ok: false, reason: "This company has no book." }, { status: 404 })
  const estimate = book.state.estimates.find((item) => item.id === id)
  if (!estimate || !estimate.publicToken) {
    return Response.json(
      { ok: false, reason: "The saved proposal could not be confirmed on the server. Save and try again." },
      { status: 404 },
    )
  }
  return Response.json(
    { ok: true, id: estimate.id, publicToken: estimate.publicToken, updatedAt: estimate.updatedAt },
    { headers: { "cache-control": "no-store" } },
  )
}

export async function PATCH(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })

  const body = (await parseBookPayload(request).catch(() => null)) as {
    revision?: unknown
    estimate?: unknown
    client?: unknown
    workOrder?: unknown
  } | null
  if (!body || typeof body.revision !== "number" || !isSingleEstimatePayload(body.estimate)) {
    return Response.json({ reason: "The estimate save payload could not be read." }, { status: 400 })
  }

  const client =
    body.client && typeof body.client === "object" && "id" in body.client
      ? (body.client as Client)
      : undefined
  const workOrder =
    body.workOrder && typeof body.workOrder === "object" && "estimateId" in body.workOrder
      ? (body.workOrder as WorkOrder)
      : undefined

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readCompanyBook(session.companyId)
    if (!current) return Response.json({ reason: "This company has no book." }, { status: 404 })

    const patched = applySingleEstimatePatch(current.state, {
      estimate: body.estimate,
      client,
      workOrder,
    })
    const state = session.role === "estimator" ? bookForEstimator(current.state, patched, session.id) : patched

    try {
      const saved = await writeCompanyBook(session.companyId, current.revision, state)
      if (saved.ok) {
        return Response.json({ ok: true, revision: saved.revision })
      }
      if ("state" in saved) {
        continue
      }
      return Response.json({ reason: saved.reason }, { status: 404 })
    } catch (error) {
      const reason = error instanceof Error && error.message.trim()
        ? `Could not save this estimate: ${error.message}`
        : "Could not save this estimate to your account. Your edits are still on screen."
      return Response.json({ reason }, { status: 500 })
    }
  }
  return Response.json({ reason: "conflict" }, { status: 409 })
}

export async function DELETE(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? ""
  if (!id) return Response.json({ reason: "Estimate id is required." }, { status: 400 })

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readCompanyBook(session.companyId)
    if (!current) return Response.json({ reason: "This company has no book." }, { status: 404 })

    const state = {
      ...current.state,
      estimates: current.state.estimates.filter((estimate) => estimate.id !== id),
      workOrders: current.state.workOrders.filter((order) => order.estimateId !== id),
    }

    try {
      const saved = await writeCompanyBook(session.companyId, current.revision, state)
      if (saved.ok) {
        return Response.json({ ok: true, revision: saved.revision })
      }
      if ("state" in saved) {
        continue
      }
      return Response.json({ reason: saved.reason }, { status: 404 })
    } catch (error) {
      const reason = error instanceof Error && error.message.trim()
        ? `Could not delete this estimate: ${error.message}`
        : "Could not delete this estimate from your account."
      return Response.json({ reason }, { status: 500 })
    }
  }
  return Response.json({ reason: "conflict" }, { status: 409 })
}
