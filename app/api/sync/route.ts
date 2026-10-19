import { sessionFromRequest } from "@/lib/auth/request"
import { deleteCloudEstimate, readCloud, writeCloudEstimate } from "@/lib/supabase/cloud-store"
import type { CloudWorkOrder, EstimateSyncPayload } from "@/lib/supabase/sync"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  try {
    const cloud = await readCloud(session.companyId)
    if (!cloud) return Response.json({ reason: "Supabase is not configured." }, { status: 503 })
    return Response.json(cloud)
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Supabase could not be read."
    return Response.json({ reason }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const session = sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => null)) as {
    payload?: EstimateSyncPayload
    workOrder?: CloudWorkOrder | null
  } | null
  if (!body?.payload?.client?.id || !body.payload.estimate?.id) {
    return Response.json({ reason: "The estimate could not be read." }, { status: 400 })
  }
  try {
    await writeCloudEstimate(session.companyId, body.payload, body.workOrder ?? null)
    return Response.json({ ok: true })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Supabase did not take this estimate."
    return Response.json({ reason }, { status: 502 })
  }
}

export async function DELETE(request: Request) {
  const session = sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  const estimateId = new URL(request.url).searchParams.get("estimateId")
  if (!estimateId) return Response.json({ reason: "Name the estimate." }, { status: 400 })
  try {
    await deleteCloudEstimate(session.companyId, estimateId)
    return Response.json({ ok: true })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Supabase did not remove this estimate."
    return Response.json({ reason }, { status: 502 })
  }
}
