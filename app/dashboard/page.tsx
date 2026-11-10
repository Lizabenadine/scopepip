import type { Metadata } from "next"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of leads, proposals, active jobs, and revenue.",
}

export default function DashboardPage() {
  return <DashboardOverview />
}
