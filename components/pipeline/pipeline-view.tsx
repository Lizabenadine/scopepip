"use client"

import { EstimateCard } from "@/components/pipeline/estimate-card"
import { JobsExport } from "@/components/pipeline/jobs-export"
import { Input } from "@/components/ui/input"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { usePipeline } from "@/hooks/use-pipeline"
import { money } from "@/lib/format"
import {
  officeEmptyStage,
  officeInView,
  officeLabel,
  officeNoMatch,
  officeStageName,
} from "@/lib/office/dashboard-copy"
import { EMPTY_STAGE, stageTone } from "@/lib/stages"
import { cn } from "@/lib/utils"

export function PipelineView() {
  const { ready, ordered, visible, pipelineValue, query, setQuery, filter, setFilter } =
    usePipeline()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)

  if (!ready) {
    return (
      <div className="grid gap-3" aria-hidden>
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{say("Dashboard")}</h1>
          <p className="text-sm text-muted-foreground">
            {officeInView(visible.length, money(pipelineValue), language)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onValueChange={setQuery}
          placeholder={say("Search clients or streets")}
          aria-label={say("Search jobs")}
          className="h-11"
        />
        <JobsExport
          estimates={ordered
            .filter((stage) => filter === "all" || filter === stage.slug)
            .flatMap((stage) => visible.filter((estimate) => estimate.stageId === stage.id))}
        />
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
        role="tablist"
        aria-label="Pipeline stage"
      >
        <StageChip
          active={filter === "all"}
          label={say("All")}
          count={visible.length}
          onClick={() => setFilter("all")}
        />
        {ordered.map((stage) => (
          <StageChip
            key={stage.id}
            active={filter === stage.slug}
            label={officeStageName(stage.slug, stage.name, language)}
            count={visible.filter((estimate) => estimate.stageId === stage.id).length}
            onClick={() => setFilter(stage.slug)}
          />
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {query.trim()
            ? officeNoMatch(query.trim(), language)
            : say("The book is empty. Price a room to start a lead.")}
        </p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ordered
            .filter((stage) => filter === "all" || filter === stage.slug)
            .map((stage) => {
              const cards = visible
                .filter((estimate) => estimate.stageId === stage.id)
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              return (
                <section key={stage.id} className="flex flex-col gap-3">
                  <header className="flex items-center justify-between">
                    <h2
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        stageTone(stage.slug),
                      )}
                    >
                      {officeStageName(stage.slug, stage.name, language)}
                    </h2>
                    <span className="text-xs text-muted-foreground">{cards.length}</span>
                  </header>
                  {cards.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                      {officeEmptyStage(stage.slug, EMPTY_STAGE[stage.slug], language)}
                    </p>
                  ) : (
                    cards.map((estimate) => (
                      <EstimateCard key={estimate.id} estimate={estimate} />
                    ))
                  )}
                </section>
              )
            })}
        </div>
      )}
    </div>
  )
}

function StageChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-2 text-sm font-medium",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground",
      )}
    >
      {label}
      <span className="ml-1 tabular-nums opacity-80">{count}</span>
    </button>
  )
}
