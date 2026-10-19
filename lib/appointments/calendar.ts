import { visitDayOf } from "../follow-ups/schedule.ts"
import type { Client, Estimate } from "../types.ts"

export interface SalesAppointment {
  estimateId: string
  clientId: string
  clientName: string
  jobAddress: string
  salesperson: string
  visitDay: string
  visitStartInstant: string | null
}

function startInstant(value: string | null | undefined): string | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? value : null
}

export function listSalesAppointments(estimates: Estimate[], clients: Client[]): SalesAppointment[] {
  const appointments: SalesAppointment[] = []
  for (const estimate of estimates) {
    if (estimate.archived) continue
    const visitDay = visitDayOf(estimate)
    if (!visitDay) continue
    const client = clients.find((item) => item.id === estimate.clientId)
    appointments.push({
      estimateId: estimate.id,
      clientId: estimate.clientId,
      clientName: client?.name ?? "Client",
      jobAddress: estimate.jobAddress.trim(),
      salesperson: estimate.salesperson?.trim() ?? "",
      visitDay,
      visitStartInstant: startInstant(estimate.estimateVisitAt),
    })
  }
  return appointments.sort((left, right) => {
    const day = left.visitDay.localeCompare(right.visitDay)
    if (day !== 0) return day
    const leftStart = left.visitStartInstant ?? ""
    const rightStart = right.visitStartInstant ?? ""
    const start = leftStart.localeCompare(rightStart)
    if (start !== 0) return start
    return left.clientName.localeCompare(right.clientName)
  })
}

export function appointmentsOnDay(appointments: SalesAppointment[], visitDay: string): SalesAppointment[] {
  return appointments.filter((appointment) => appointment.visitDay === visitDay)
}
