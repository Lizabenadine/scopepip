import type { Metadata } from "next"
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar"
import { CalendarSync } from "@/components/appointments/calendar-sync"

export const metadata: Metadata = {
  title: "Appointments",
  description: "Estimate visits booked with a day and a start time.",
}

export default function AppointmentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <CalendarSync />
      <AppointmentsCalendar />
    </div>
  )
}
