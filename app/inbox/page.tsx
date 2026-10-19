import type { Metadata } from "next"
import { Suspense } from "react"
import { InboxView } from "@/components/inbox/inbox-view"

export const metadata: Metadata = {
  title: "Inbox",
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
      <InboxView />
    </Suspense>
  )
}
