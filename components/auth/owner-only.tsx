"use client"

import { useScope } from "@/lib/data/store"

export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { ready, session } = useScope()
  if (!ready) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  if (session?.role === "project_manager") {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">Client records stay with the owner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A project manager can open progress jobs, work orders, and invoices.
        </p>
      </div>
    )
  }
  return children
}
