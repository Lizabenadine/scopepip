import type { Metadata } from "next"
import { UserGuide } from "@/components/marketing/user-guide"

export const metadata: Metadata = {
  title: "Help",
  description:
    "How to set up the company, sign a proposal, schedule the crew, print a price-free store list, and set the next room's speed from a finished job.",
}

export default function HelpPage() {
  return <UserGuide />
}
