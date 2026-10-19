import type { Metadata } from "next"
import { Suspense } from "react"
import { SettingsScreen } from "@/components/settings/settings-screen"

export const metadata: Metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
      <SettingsScreen />
    </Suspense>
  )
}
