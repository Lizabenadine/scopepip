"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { ScheduleDialog } from "@/components/pipeline/schedule-dialog"
import { NavigateToJobsite } from "@/components/pipeline/navigate-jobsite"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { money } from "@/lib/format"
import { officeAreas, officeLabel, officeNextAction, officeOnSite, officeStageName } from "@/lib/office/dashboard-copy"
import { adjacentStage, NEXT_ACTION, stageTone } from "@/lib/stages"
import { cn } from "@/lib/utils"
import type { Estimate } from "@/lib/types"

export function EstimateCard({ estimate }: { estimate: Estimate }) {
  const router = useRouter()
  const { clientById, stageById, stages, quoteEstimate, moveStage } = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
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
    <article className="flex flex-col gap-3 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
              stageTone(stage.slug),
            )}
          >
            {officeStageName(stage.slug, stage.name, language)}
          </p>
          {estimate.paymentStatus === "deposit_paid" ? (
            <p className="ml-2 inline-flex rounded-full bg-[oklch(0.93_0.05_155)] px-2 py-0.5 text-xs font-medium text-[oklch(0.32_0.07_155)]">
              {say("Deposit Paid / Scheduled")}
            </p>
          ) : estimate.clientStatus === "accepted" ? (
            <p className="ml-2 inline-flex rounded-full bg-[oklch(0.93_0.05_155)] px-2 py-0.5 text-xs font-medium text-[oklch(0.32_0.07_155)]">
              {say("Accepted")}
            </p>
          ) : estimate.clientStatus === "declined" ? (
            <p className="ml-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{say("Declined")}</p>
          ) : null}
          <h3 className="mt-2 truncate text-base font-semibold">
            <Link href={`/estimates/${estimate.id}`} className="hover:underline">
              {client?.name ?? say("Missing client")}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">{estimate.title}</p>
        </div>
        <p className="font-display text-2xl leading-none text-price tabular-nums">
          {money(quote.total)}
        </p>
      </div>
      <p className="text-sm">{estimate.jobAddress || say("No address yet")}</p>
      <NavigateToJobsite address={estimate.jobAddress} />
      <p className="text-sm text-muted-foreground">{officeAreas(estimate.areas.map((area) => area.name), language)}</p>
      {estimate.scheduledOn ? (
        <p className="text-sm font-medium">{officeOnSite(estimate.scheduledOn, language)}</p>
      ) : null}
      <div className="mt-auto flex gap-2">
        {next && NEXT_ACTION[stage.slug] ? (
          <Button type="button" className="h-11 flex-1" onClick={advance}>
            {officeNextAction(stage.slug, NEXT_ACTION[stage.slug], language)}
          </Button>
        ) : (
          <span className="flex h-11 flex-1 items-center text-sm text-muted-foreground">
            {say("Closed")}
          </span>
        )}
        {stage.slug === "scheduled" || stage.slug === "completed" ? (
          <Link
            href={`/work-orders/${estimate.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}
          >
            {say("Crew sheet")}
          </Link>
        ) : null}
        <Link
          href={`/estimates/${estimate.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}
        >
          {say("Open")}
        </Link>
      </div>
      {next?.slug === "scheduled" ? (
        <ScheduleDialog
          open={scheduleOpen}
          clientName={client?.name ?? say("Missing client")}
          language={language}
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
