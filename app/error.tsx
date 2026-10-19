"use client"

import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border px-4 py-10 text-center">
      <h1 className="text-xl font-semibold">This page hit a snag</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "Something failed while drawing the page."}
      </p>
      <Button type="button" className="mt-4 h-11" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
