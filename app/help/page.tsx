import type { Metadata } from "next"
import { UserGuide } from "@/components/marketing/user-guide"

export const metadata: Metadata = {
  title: "Help Center • Scopepipe User Guides",
  description:
    "Comprehensive guides for Scopepipe: room estimating, proposals, Sketch & Notes, voice notes, paint buy lists, sales pipeline, Spanish crew sheets, team management, and billing.",
}

export default function HelpPage() {
  return <UserGuide />
}
