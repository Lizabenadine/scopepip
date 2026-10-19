import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Request an estimate",
}

export default function RequestPage() {
  return (
    <div className="mx-auto grid max-w-lg gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <h1 className="text-2xl font-semibold tracking-tight">Ask your painter for their request link</h1>
      <p className="text-sm text-muted-foreground">
        Each company has its own form. It looks like /request/your-company and lands on that company&apos;s Cold Leads column.
      </p>
    </div>
  )
}
