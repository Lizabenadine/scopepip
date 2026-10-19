import type { Metadata } from "next"
import { BookingPage } from "@/components/bookings/booking-page"

export const metadata: Metadata = {
  title: "Book an estimate",
  description: "Pick a day and start time for a painting walkthrough.",
}

export default async function BookVisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <BookingPage token={token} />
}
