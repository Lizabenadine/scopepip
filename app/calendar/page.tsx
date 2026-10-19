import type { Metadata } from "next"
import { CrewCalendar } from "@/components/calendar/crew-calendar"

export const metadata: Metadata = {
  title: "Calendar",
  description: "Scheduled painting jobs by crew and job site.",
}

export default function CalendarPage() {
  return <CrewCalendar />
}