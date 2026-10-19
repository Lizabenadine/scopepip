import type { Metadata } from "next"
import { FollowUpEditor } from "@/components/follow-ups/follow-up-editor"

export const metadata: Metadata = {
  title: "Follow-ups",
  description: "Email and text sequences for each pipeline column.",
}

export default function FollowUpsPage() {
  return <FollowUpEditor />
}
