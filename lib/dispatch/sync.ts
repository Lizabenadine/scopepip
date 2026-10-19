import type { AssignmentInput } from "./assign.ts"
import type { DispatchStatus } from "../types.ts"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface RemoteAssignment {
  estimate_id: string
  status: DispatchStatus
  assigned_crew_id: string | null
  scheduled_start_date: string | null
  notified_at: string | null
}

function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function syncAssignment(input: AssignmentInput): Promise<void> {
  if (!supabaseConfigured()) return
  if (!UUID_PATTERN.test(input.estimateId)) return
  if (input.assignedCrewId && !UUID_PATTERN.test(input.assignedCrewId)) return
  const { createClient } = await import("@/lib/supabase/client")
  const supabase = createClient()
  const { error } = await supabase.rpc("assign_work_order", {
    target_estimate_id: input.estimateId,
    target_crew_id: input.assignedCrewId,
    start_date: input.scheduledStartDate,
    next_status: input.status,
  })
  if (error) throw new Error(error.message)
}

export function subscribeDispatch(onChange: (row: RemoteAssignment) => void): () => void {
  if (typeof window === "undefined" || !supabaseConfigured()) return () => undefined
  let stopped = false
  let unsubscribe = () => undefined
  void (async () => {
    const { createClient } = await import("@/lib/supabase/client")
    if (stopped) return
    const supabase = createClient()
    const channel = supabase
      .channel("scopepipe-dispatch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_orders" },
        (payload) => {
          const row = payload.new as Partial<RemoteAssignment> | null
          if (!row?.estimate_id || !row.status) return
          onChange({
            estimate_id: row.estimate_id,
            status: row.status,
            assigned_crew_id: row.assigned_crew_id ?? null,
            scheduled_start_date: row.scheduled_start_date ?? null,
            notified_at: row.notified_at ?? null,
          })
        },
      )
      .subscribe()
    unsubscribe = () => {
      void supabase.removeChannel(channel)
    }
  })()
  return () => {
    stopped = true
    unsubscribe()
  }
}
