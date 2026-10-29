"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"

export function CompanyCamSync({ estimateId }: { estimateId: string }) {
  const scope = useScope()
  const { copy } = useFieldLanguage()
  const estimate = scope.estimates.find((item) => item.id === estimateId)
  const order = scope.workOrders.find((item) => item.estimateId === estimateId)
  const [sending, setSending] = useState(false)
  const [detail, setDetail] = useState("")

  async function sync() {
    if (!estimate || sending) return
    setSending(true)
    setDetail("")
    try {
      const response = await fetch("/api/companycam/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobs: [
            {
              estimateId: estimate.id,
              address: estimate.jobAddress,
              title: estimate.title,
              projectId: order?.companyCamProjectId,
            },
          ],
        }),
      })
      const payload = (await response.json()) as {
        connected?: boolean
        detail?: string
        jobs?: { estimateId: string; matched?: boolean; projectId?: string; projectUrl?: string; photos?: { id: string; url: string; capturedAt: string }[]; detail?: string }[]
      }
      const job = payload.jobs?.[0]
      if (payload.connected && job?.matched && job.projectId) {
        scope.applyCompanyCam([
          {
            estimateId: job.estimateId,
            projectId: job.projectId,
            projectUrl: job.projectUrl || "",
            syncedAt: new Date().toISOString(),
            photos: job.photos ?? [],
          },
        ])
      }
      setDetail(job?.detail || payload.detail || "CompanyCam could not be reached.")
    } catch {
      setDetail("CompanyCam could not be reached.")
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm" data-testid="companycam-sync">
      <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{copy.companyCam}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {order?.companyCamUrl ? copy.companyCamLinked : copy.companyCamUnlinked}
      </p>
      {order?.companyCamSyncedAt ? (
        <p className="mt-2 text-sm">{copy.lastSync} {order.companyCamSyncedAt.slice(0, 16).replace("T", " ")}</p>
      ) : null}
      <Button type="button" className="mt-3 h-11" data-testid="companycam-pull" disabled={sending} onClick={() => void sync()}>
        {sending ? copy.syncing : copy.syncCompanyCam}
      </Button>
      {detail ? <p className="mt-2 text-sm" data-testid="companycam-sync-status">{detail}</p> : null}
    </section>
  )
}
