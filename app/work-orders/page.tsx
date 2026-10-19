import type { Metadata } from "next"
import { ActiveJobs } from "@/components/work-orders/active-jobs"

export const metadata: Metadata = {
  title: "Work Orders",
}

export default function ActiveJobsPage() {
  return <ActiveJobs />
}
