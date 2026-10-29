"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { EstimateVersion } from "@/lib/types"

export function EstimateVersions({
  versions,
  onRestore,
}: {
  versions: EstimateVersion[]
  onRestore: (versionId: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="font-medium text-primary"
        data-testid="versions-open"
        onClick={() => setOpen(true)}
      >
        Versions
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Versions</DialogTitle>
            <DialogDescription>
              Each save keeps the copy you had. Restore puts that copy back. The signature, payments, and change orders stay.
            </DialogDescription>
          </DialogHeader>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Save this estimate to keep a copy you can restore.</p>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="versions-list">
              {versions.map((version) => (
                <li key={version.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{version.title}</p>
                    <p className="text-xs text-muted-foreground">{savedLabel(version.savedAt)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0"
                    data-testid={`restore-${version.id}`}
                    onClick={() => {
                      onRestore(version.id)
                      setOpen(false)
                    }}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function savedLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}
