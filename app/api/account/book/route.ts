import { bookForEstimator } from "@/lib/auth/access"
import { readCompanyBook, writeCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { isScopeState } from "@/lib/data/seed"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  const book = await readCompanyBook(session.companyId)
  if (!book) return Response.json({ reason: "This company has no book." }, { status: 404 })
  return Response.json({ revision: book.revision, state: book.state })
}

export async function PUT(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { revision?: unknown; state?: unknown } | null
  if (!body || typeof body.revision !== "number" || !isScopeState(body.state)) {
    return Response.json({ reason: "The book could not be read." }, { status: 400 })
  }
  const current = await readCompanyBook(session.companyId)
  if (!current) return Response.json({ reason: "This company has no book." }, { status: 404 })
  const state = session.role === "estimator" ? bookForEstimator(current.state, body.state, session.id) : body.state
  const saved = await writeCompanyBook(session.companyId, body.revision, state)
  if (!saved.ok && "state" in saved) {
    return Response.json({ reason: "conflict", revision: saved.revision, state: saved.state }, { status: 409 })
  }
  if (!saved.ok) return Response.json({ reason: saved.reason }, { status: 404 })
  return Response.json({ ok: true, revision: saved.revision })
}
