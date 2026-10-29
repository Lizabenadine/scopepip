"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { EstimateActivity } from "@/lib/types"

export function EstimateActivityLog({ entries }: { entries: EstimateActivity[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="font-medium text-primary"
        data-testid="activity-open"
        onClick={() => setOpen(true)}
      >
        Activity
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activity</DialogTitle>
            <DialogDescription>What changed on this estimate, newest first.</DialogDescription>
          </DialogHeader>
          <ol className="flex max-h-80 flex-col gap-2 overflow-y-auto" data-testid="activity-list">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-xl bg-muted/60 px-3 py-2" data-testid={`activity-${entry.id}`}>
                <p className="text-sm">{entry.label}</p>
                <p className="text-xs text-muted-foreground">{savedLabel(entry.at)}</p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  )
}

function savedLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}
