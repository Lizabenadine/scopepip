"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { ScheduleDialog } from "@/components/pipeline/schedule-dialog"
import { useScope } from "@/lib/data/store"
import { money, scopeSummary, jobDate } from "@/lib/format"
import { adjacentStage, NEXT_ACTION, stageTone } from "@/lib/stages"
import { cn } from "@/lib/utils"
import type { Estimate } from "@/lib/types"

export function EstimateCard({ estimate }: { estimate: Estimate }) {
  const router = useRouter()
  const { clientById, stageById, stages, quoteEstimate, moveStage } = useScope()
  const client = clientById(estimate.clientId)
  const stage = stageById(estimate.stageId)
  const quote = quoteEstimate(estimate)
  const next = adjacentStage(stages, estimate.stageId, 1)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  if (!stage) return null

  const advance = () => {
    if (!next) return
    if (next.slug === "scheduled") {
      setScheduleOpen(true)
      return
    }
    moveStage(estimate.id, next.id)
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
              stageTone(stage.slug),
            )}
          >
            {stage.name}
          </p>
          {estimate.paymentStatus === "deposit_paid" ? (
            <p className="ml-2 inline-flex rounded-full bg-[oklch(0.93_0.05_155)] px-2 py-0.5 text-xs font-medium text-[oklch(0.32_0.07_155)]">
              Deposit Paid / Scheduled
            </p>
          ) : estimate.clientStatus === "accepted" ? (
            <p className="ml-2 inline-flex rounded-full bg-[oklch(0.93_0.05_155)] px-2 py-0.5 text-xs font-medium text-[oklch(0.32_0.07_155)]">
              Accepted
            </p>
          ) : null}
          <h3 className="mt-2 truncate text-base font-semibold">
            <Link href={`/estimates/${estimate.id}`} className="hover:underline">
              {client?.name ?? "Missing client"}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">{estimate.title}</p>
        </div>
        <p className="font-display text-2xl leading-none text-price tabular-nums">
          {money(quote.total)}
        </p>
      </div>
      <p className="text-sm">{estimate.jobAddress || "No address yet"}</p>
      <p className="text-sm text-muted-foreground">{scopeSummary(estimate)}</p>
      {estimate.scheduledOn ? (
        <p className="text-sm font-medium">On site {jobDate(estimate.scheduledOn)}</p>
      ) : null}
      <div className="mt-auto flex gap-2">
        {next && NEXT_ACTION[stage.slug] ? (
          <Button type="button" className="h-11 flex-1" onClick={advance}>
            {NEXT_ACTION[stage.slug]}
          </Button>
        ) : (
          <span className="flex h-11 flex-1 items-center text-sm text-muted-foreground">
            Closed
          </span>
        )}
        {stage.slug === "scheduled" || stage.slug === "completed" ? (
          <Link
            href={`/work-orders/${estimate.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}
          >
            Crew sheet
          </Link>
        ) : null}
        <Link
          href={`/estimates/${estimate.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}
        >
          Open
        </Link>
      </div>
      {next?.slug === "scheduled" ? (
        <ScheduleDialog
          open={scheduleOpen}
          clientName={client?.name ?? "this job"}
          initialDate={estimate.scheduledOn}
          onOpenChange={setScheduleOpen}
          onConfirm={(date) => {
            moveStage(estimate.id, next.id, date)
            setScheduleOpen(false)
            router.push(`/work-orders/${estimate.id}`)
          }}
        />
      ) : null}
    </article>
  )
}
