import type { SupabaseClient } from "@supabase/supabase-js"
import type { CloudSnapshot, CloudWorkOrder, EstimateSyncPayload } from "./sync.ts"
import { supabaseAdmin } from "./admin.ts"

const BUCKET = "scopepipe"

function workOrderPath(companyId: string): string {
  return `work-orders/${companyId}.json`
}

async function readWorkOrders(supabase: SupabaseClient, companyId: string): Promise<CloudWorkOrder[]> {
  const downloaded = await supabase.storage.from(BUCKET).download(workOrderPath(companyId))
  if (downloaded.error || !downloaded.data) return []
  try {
    const parsed = JSON.parse(await downloaded.data.text()) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCloudWorkOrder)
  } catch {
    return []
  }
}

async function writeWorkOrders(supabase: SupabaseClient, companyId: string, orders: CloudWorkOrder[]): Promise<void> {
  const uploaded = await supabase.storage.from(BUCKET).upload(workOrderPath(companyId), JSON.stringify(orders), {
    upsert: true,
    contentType: "application/json",
  })
  if (uploaded.error) throw new Error(uploaded.error.message)
}

function isCloudWorkOrder(value: unknown): value is CloudWorkOrder {
  if (!value || typeof value !== "object") return false
  const order = value as CloudWorkOrder
  return typeof order.estimateId === "string" && typeof order.status === "string" && Array.isArray(order.checklist)
}

export async function readCloud(companyId: string): Promise<CloudSnapshot | null> {
  const supabase = supabaseAdmin()
  if (!supabase) return null
  const [clients, estimates, areas, workOrders] = await Promise.all([
    supabase.from("clients").select("id, name, email, phone, address, created_at").limit(1000),
    supabase
      .from("estimates")
      .select("id, client_id, room_name, length, width, height, wall_sqft, labor_hours, gallons_needed, total_price, status, created_at")
      .limit(1000),
    supabase.from("estimate_areas").select("id, project_id, name, length, width, height").limit(2000),
    readWorkOrders(supabase, companyId),
  ])
  if (clients.error) throw new Error(clients.error.message)
  if (estimates.error) throw new Error(estimates.error.message)
  if (areas.error) throw new Error(areas.error.message)
  return {
    clients: clients.data ?? [],
    estimates: estimates.data ?? [],
    areas: areas.data ?? [],
    workOrders,
  }
}

export async function writeCloudEstimate(companyId: string, payload: EstimateSyncPayload, workOrder: CloudWorkOrder | null): Promise<void> {
  const supabase = supabaseAdmin()
  if (!supabase) throw new Error("Supabase is not configured.")
  const clientResult = await supabase.from("clients").upsert(payload.client, { onConflict: "id" })
  if (clientResult.error) throw new Error(clientResult.error.message)
  const estimateResult = await supabase.from("estimates").upsert(payload.estimate, { onConflict: "id" })
  if (estimateResult.error) throw new Error(estimateResult.error.message)
  if (payload.areas.length > 0) {
    const areaResult = await supabase.from("estimate_areas").upsert(payload.areas, { onConflict: "id" })
    if (areaResult.error) throw new Error(areaResult.error.message)
  }
  const kept = payload.areas.map((area) => area.id)
  const stale =
    kept.length === 0
      ? supabase.from("estimate_areas").delete().eq("project_id", payload.estimate.id)
      : supabase.from("estimate_areas").delete().eq("project_id", payload.estimate.id).not("id", "in", `(${kept.join(",")})`)
  const removed = await stale
  if (removed.error) throw new Error(removed.error.message)
  if (!workOrder) return
  const orders = await readWorkOrders(supabase, companyId)
  const next = orders.filter((order) => order.estimateId !== workOrder.estimateId)
  next.push(workOrder)
  await writeWorkOrders(supabase, companyId, next)
}

export async function deleteCloudEstimate(companyId: string, estimateId: string): Promise<void> {
  const supabase = supabaseAdmin()
  if (!supabase) throw new Error("Supabase is not configured.")
  const areas = await supabase.from("estimate_areas").delete().eq("project_id", estimateId)
  if (areas.error) throw new Error(areas.error.message)
  const estimate = await supabase.from("estimates").delete().eq("id", estimateId)
  if (estimate.error) throw new Error(estimate.error.message)
  const orders = await readWorkOrders(supabase, companyId)
  await writeWorkOrders(
    supabase,
    companyId,
    orders.filter((order) => order.estimateId !== estimateId),
  )
}
