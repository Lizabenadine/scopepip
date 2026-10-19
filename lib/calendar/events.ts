import type { ScopeState } from "../data/seed.ts"

export interface CalendarEvent {
  uid: string
  kind: "visit" | "job"
  estimateId: string
  title: string
  location: string
  start: string
  allDay: boolean
  googleEventId?: string
}

export function calendarEvents(state: Pick<ScopeState, "clients" | "estimates" | "workOrders">): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const estimate of state.estimates) {
    if (estimate.archived) continue
    const client = state.clients.find((item) => item.id === estimate.clientId)
    const who = client?.name ?? "Client"
    const location = estimate.jobAddress || client?.address || ""
    if (estimate.estimateVisitOn) {
      const timed = Boolean(estimate.estimateVisitAt)
      events.push({
        uid: `visit-${estimate.id}`,
        kind: "visit",
        estimateId: estimate.id,
        title: `Estimate · ${who}`,
        location,
        start: timed ? estimate.estimateVisitAt! : estimate.estimateVisitOn,
        allDay: !timed,
        googleEventId: estimate.googleEventId,
      })
    }
    const order = state.workOrders.find((item) => item.estimateId === estimate.id)
    if (order?.scheduledStartDate && order.status !== "unscheduled") {
      events.push({
        uid: `job-${estimate.id}`,
        kind: "job",
        estimateId: estimate.id,
        title: `Job · ${who}`,
        location,
        start: order.scheduledStartDate,
        allDay: true,
        googleEventId: order.googleEventId,
      })
    }
  }
  return events.slice(0, 60)
}
