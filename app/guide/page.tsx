import type { Metadata } from "next"
import { UserGuide } from "@/components/marketing/user-guide"

export const metadata: Metadata = {
  title: "User Guide",
  description:
    "How to price an estimate, send the client's work order, print a store list, and set the next room's speed from a finished job.",
}

export default function GuidePage() {
  return <UserGuide />
}
