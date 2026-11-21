"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck2,
  MapPin,
  Plus,
  Send,
  TrendingUp,
  Users,
} from "lucide-react"
import { NewLeadButton, newLeadButtonClass } from "@/components/pipeline/new-lead-dialog"
import { EstimatorPerformance } from "@/components/pipeline/estimator-performance"
import { VoiceAssistantButton } from "@/components/voice/voice-assistant-modal"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { roleCanOpen } from "@/lib/auth/access"
import { useScope } from "@/lib/data/store"
import { money } from "@/lib/format"
import { officeLabel, officeOnSite } from "@/lib/office/dashboard-copy"
import { appointmentLabel } from "@/lib/appointments/visit"
import { salesStageOf } from "@/lib/pipeline/board"
import {
  DASHBOARD_METRIC_TARGETS,
  dashboardMetricHref,
  type DashboardMetricKey,
} from "@/lib/pipeline/targets"
import { cn } from "@/lib/utils"
import type { Estimate } from "@/lib/types"

function todayIso(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

export function DashboardOverview() {
  const { ready, session, estimates, clients, stages, workOrders, quoteEstimate } = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const today = todayIso()
  const [activityFilter, setActivityFilter] = useState<"all" | "leads" | "estimates" | "signed" | "jobs">("all")

  const completedStageId = useMemo(
    () => stages.find((s) => s.slug === "completed")?.id,
    [stages],
  )
  const scheduledStageId = useMemo(
    () => stages.find((s) => s.slug === "scheduled")?.id,
    [stages],
  )

  const activeEstimates = useMemo(
    () => estimates.filter((e) => !e.archived),
    [estimates],
  )

  // Metrics
  const metrics = useMemo(() => {
    let newLeadsCount = 0
    let estimatesSentCount = 0
    let acceptedCount = 0
    let scheduledJobsCount = 0
    let completedJobsCount = 0
    let totalRevenue = 0
    let salesPipelineValue = 0

    for (const est of activeEstimates) {
      const quote = quoteEstimate(est)
      const salesStage = salesStageOf(est)
      const isWon =
        est.clientStatus === "accepted" ||
        est.paymentStatus === "deposit_paid" ||
        est.paymentStatus === "paid"

      if (isWon) {
        acceptedCount += 1
        totalRevenue += quote.total
      } else {
        salesPipelineValue += quote.total
        if (salesStage === "proposal_sent" || est.clientStatus === "sent") {
          estimatesSentCount += 1
        } else {
          newLeadsCount += 1
        }
      }

      const isCompleted =
        est.stageId === completedStageId ||
        workOrders.some((wo) => wo.estimateId === est.id && wo.status === "complete")

      if (isCompleted) {
        completedJobsCount += 1
      } else if (
        est.scheduledOn ||
        est.stageId === scheduledStageId ||
        workOrders.some((wo) => wo.estimateId === est.id && wo.status === "scheduled")
      ) {
        scheduledJobsCount += 1
      }
    }

    return {
      newLeadsCount,
      estimatesSentCount,
      acceptedCount,
      scheduledJobsCount,
      completedJobsCount,
      totalRevenue,
      salesPipelineValue,
    }
  }, [activeEstimates, completedStageId, scheduledStageId, workOrders, quoteEstimate])

  // Upcoming activities: scheduled estimate visits and job starts
  const upcomingVisits = useMemo(() => {
    return activeEstimates
      .filter((e) => e.estimateVisitOn && e.estimateVisitOn >= today)
      .sort((a, b) => (a.estimateVisitOn || "").localeCompare(b.estimateVisitOn || ""))
      .slice(0, 5)
  }, [activeEstimates, today])

  const upcomingJobs = useMemo(() => {
    return activeEstimates
      .filter((e) => e.scheduledOn && e.scheduledOn >= today && e.stageId !== completedStageId)
      .sort((a, b) => (a.scheduledOn || "").localeCompare(b.scheduledOn || ""))
      .slice(0, 5)
  }, [activeEstimates, today, completedStageId])

  // Filtered recent activity based on active pill
  const filteredActivity = useMemo(() => {
    let list = activeEstimates
    if (activityFilter === "leads") {
      list = list.filter((e) => {
        const isWon =
          e.clientStatus === "accepted" ||
          e.paymentStatus === "deposit_paid" ||
          e.paymentStatus === "paid" ||
          Boolean(e.signature)
        return !isWon && e.clientStatus !== "sent"
      })
    } else if (activityFilter === "estimates") {
      list = list.filter((e) => e.clientStatus === "sent")
    } else if (activityFilter === "signed") {
      list = list.filter((e) =>
        e.clientStatus === "accepted" ||
        e.paymentStatus === "deposit_paid" ||
        e.paymentStatus === "paid" ||
        Boolean(e.signature) ||
        Boolean(e.acceptedAt)
      )
    } else if (activityFilter === "jobs") {
      list = list.filter((e) =>
        Boolean(e.scheduledOn) ||
        e.stageId === scheduledStageId ||
        e.stageId === completedStageId ||
        workOrders.some((w) => w.estimateId === e.id)
      )
    }
    return [...list]
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .slice(0, 8)
  }, [activeEstimates, activityFilter, scheduledStageId, completedStageId, workOrders])

  if (session?.role === "estimator") return <EstimatorPerformance />

  const canOpenRoute = (route: "/sales-pipeline" | "/dispatch") =>
    !session || roleCanOpen(session.role, route)

  const salesPermitted = canOpenRoute("/sales-pipeline")
  const jobsPermitted = canOpenRoute("/dispatch")

  const metricCards: {
    key: DashboardMetricKey
    label: string
    subtitle: string
    value: string | number
    valueClass: string
    icon: ReactNode
  }[] = [
    {
      key: "new_leads",
      label: say("New Leads"),
      subtitle: say("Inquiries & warm leads"),
      value: metrics.newLeadsCount,
      valueClass: "text-2xl text-slate-900",
      icon: <Users className="size-4 text-sky-500" />,
    },
    {
      key: "estimates_sent",
      label: say("Estimates Sent"),
      subtitle: say("Proposals sent"),
      value: metrics.estimatesSentCount,
      valueClass: "text-2xl text-slate-900",
      icon: <Send className="size-4 text-blue-500" />,
    },
    {
      key: "accepted",
      label: say("Accepted"),
      subtitle: say("Proposals won"),
      value: metrics.acceptedCount,
      valueClass: "text-2xl text-indigo-600",
      icon: <FileCheck2 className="size-4 text-indigo-500" />,
    },
    {
      key: "scheduled",
      label: say("Scheduled"),
      subtitle: say("On schedule"),
      value: metrics.scheduledJobsCount,
      valueClass: "text-2xl text-slate-900",
      icon: <Calendar className="size-4 text-amber-500" />,
    },
    {
      key: "completed",
      label: say("Completed"),
      subtitle: say("Finished jobs"),
      value: metrics.completedJobsCount,
      valueClass: "text-2xl text-emerald-600",
      icon: <CheckCircle2 className="size-4 text-emerald-500" />,
    },
    {
      key: "revenue",
      label: say("Revenue"),
      subtitle: say("Accepted contracts"),
      value: money(metrics.totalRevenue),
      valueClass: "text-xl text-price truncate",
      icon: <DollarSign className="size-4 text-emerald-600" />,
    },
  ]

  if (!ready) {
    return (
      <div className="grid gap-4" aria-hidden>
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6" data-testid="dashboard-overview">
      {/* Header and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {say("Dashboard")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {say("Connected overview of your painting sales and active jobs.")}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <VoiceAssistantButton
            label={say("Voice Assistant")}
            testId="dashboard-voice-assistant"
            className="h-9 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 shadow-xs px-3 font-semibold"
          />
          <NewLeadButton label={say("+ New Lead")} className={newLeadButtonClass()} />
          <Link
            href="/estimates/new"
            data-testid="new-proposal"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Plus className="mr-1.5 size-4 text-slate-500" />
            {say("New Proposal")}
          </Link>
        </div>
      </div>

      {/* 4 Core CRM Pillars: Leads, Estimates, Signed Contracts, Jobs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Leads Pillar */}
        <Link
          href="/sales-pipeline"
          data-testid="summary-card-leads"
          className="group relative flex flex-col justify-between rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
                <Users className="size-5" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:translate-x-1 group-hover:text-sky-600 transition-all" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
              {say("Leads")}
            </h2>
            <p className="text-2xl font-bold font-display text-slate-900 mt-1">
              {metrics.newLeadsCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {say("Inquiries & warm leads")}
            </p>
          </div>
          <div className="mt-4 border-t border-sky-100/80 pt-2.5 text-xs font-semibold text-sky-700 flex items-center justify-between">
            <span>{say("Sales Pipeline")}</span>
            <span>→</span>
          </div>
        </Link>

        {/* 2. Estimates Pillar */}
        <Link
          href="/estimate"
          data-testid="summary-card-estimates"
          className="group relative flex flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Send className="size-5" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
              {say("Estimates")}
            </h2>
            <p className="text-2xl font-bold font-display text-slate-900 mt-1">
              {metrics.estimatesSentCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {say("Proposals sent & review")}
            </p>
          </div>
          <div className="mt-4 border-t border-blue-100/80 pt-2.5 text-xs font-semibold text-blue-700 flex items-center justify-between">
            <span>{say("Open Estimator")}</span>
            <span>→</span>
          </div>
        </Link>

        {/* 3. Signed Contracts Pillar */}
        <Link
          href="/proposal?tab=signed"
          data-testid="summary-card-signed-contracts"
          className="group relative flex flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <FileCheck2 className="size-5" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {say("Signed Contracts")}
            </h2>
            <p className="text-2xl font-bold font-display text-emerald-700 mt-1">
              {metrics.acceptedCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold text-emerald-800">{money(metrics.totalRevenue)}</span> {say("won revenue")}
            </p>
          </div>
          <div className="mt-4 border-t border-emerald-100/80 pt-2.5 text-xs font-semibold text-emerald-700 flex items-center justify-between">
            <span>{say("View Contracts")}</span>
            <span>→</span>
          </div>
        </Link>

        {/* 4. Jobs Pillar */}
        <Link
          href="/dispatch"
          data-testid="summary-card-jobs"
          className="group relative flex flex-col justify-between rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
                <Briefcase className="size-5" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-all" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
              {say("Jobs & Dispatch")}
            </h2>
            <p className="text-2xl font-bold font-display text-slate-900 mt-1">
              {metrics.scheduledJobsCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {say("Scheduled on calendar")}
            </p>
          </div>
          <div className="mt-4 border-t border-amber-100/80 pt-2.5 text-xs font-semibold text-amber-800 flex items-center justify-between">
            <span>{say("Jobs Dispatch")}</span>
            <span>→</span>
          </div>
        </Link>
      </div>

      {/* KPI Business Overview Grid */}
      <div>
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
          {say("Key Metrics")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metricCards.map((card) => {
            const target = DASHBOARD_METRIC_TARGETS[card.key]
            const allowed = canOpenRoute(target.route)
            const cardContent = (
              <>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">{card.label}</span>
                  {card.icon}
                </div>
                <p className={cn("mt-2 font-display font-bold tracking-tight", card.valueClass)}>
                  {card.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{card.subtitle}</p>
              </>
            )

            if (!allowed) {
              return (
                <div
                  key={card.key}
                  data-testid={`metric-card-${card.key}`}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  {cardContent}
                </div>
              )
            }

            return (
              <Link
                key={card.key}
                href={dashboardMetricHref(card.key)}
                data-testid={`metric-card-${card.key}`}
                aria-label={`${card.label}: ${card.value}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {cardContent}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Upcoming Activities & Schedule */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Estimate Visits */}
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">{say("Upcoming Estimate Visits")}</h2>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-medium text-primary hover:underline"
            >
              {say("View all")} →
            </Link>
          </div>

          {upcomingVisits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-muted-foreground">
              {say("No upcoming estimate visits scheduled. Book appointments from the Sales Pipeline.")}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {upcomingVisits.map((estimate) => {
                const client = clients.find((c) => c.id === estimate.clientId)
                return (
                  <div key={estimate.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1 pr-3">
                      <Link
                        href={`/estimates/${estimate.id}`}
                        className="truncate text-sm font-medium text-slate-900 hover:text-primary hover:underline block"
                      >
                        {client?.name ?? say("Client")}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {estimate.title || estimate.jobAddress || say("Estimate visit")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {appointmentLabel(estimate.estimateVisitOn || "", estimate.estimateVisitAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Upcoming Jobs On Site */}
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">{say("Scheduled Job Starts")}</h2>
            </div>
            <Link
              href="/dispatch"
              className="text-xs font-medium text-primary hover:underline"
            >
              {say("View dispatch")} →
            </Link>
          </div>

          {upcomingJobs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-muted-foreground">
              {say("No active jobs on site right now. Schedule accepted jobs from the Jobs Pipeline.")}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {upcomingJobs.map((estimate) => {
                const client = clients.find((c) => c.id === estimate.clientId)
                return (
                  <div key={estimate.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1 pr-3">
                      <Link
                        href={`/work-orders/${estimate.id}`}
                        className="truncate text-sm font-medium text-slate-900 hover:text-primary hover:underline block"
                      >
                        {client?.name ?? say("Client")}
                      </Link>
                      <p className="truncate text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="size-3 shrink-0 text-slate-400" />
                        <span className="truncate">{estimate.jobAddress || say("No address yet")}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        {officeOnSite(estimate.scheduledOn || "", language)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Recent Business Activity Summary (Clean table with filter tabs) */}
      <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{say("Recent Project Activity")}</h2>
            <p className="text-xs text-muted-foreground">{say("Quick access across leads, proposals, signed contracts, and jobs")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
            {(
              [
                { id: "all", label: say("All") },
                { id: "leads", label: say("Leads") },
                { id: "estimates", label: say("Estimates") },
                { id: "signed", label: say("Signed Contracts") },
                { id: "jobs", label: say("Jobs") },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivityFilter(tab.id)}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  activityFilter === tab.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-muted-foreground">
            {activityFilter === "signed"
              ? say("No signed contracts found. Once a client accepts a proposal, it appears here.")
              : activityFilter === "jobs"
                ? say("No scheduled jobs found.")
                : activityFilter === "estimates"
                  ? say("No sent estimates found.")
                  : activityFilter === "leads"
                    ? say("No open leads found.")
                    : say("No recent activity found. Create a new lead or proposal to get started.")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-muted-foreground">
                  <th className="pb-2 font-medium">{say("Customer")}</th>
                  <th className="pb-2 font-medium">{say("Service / Project")}</th>
                  <th className="pb-2 font-medium">{say("Status")}</th>
                  <th className="pb-2 font-medium text-right">{say("Value")}</th>
                  <th className="pb-2 text-right font-medium">{say("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivity.map((estimate) => {
                  const client = clients.find((c) => c.id === estimate.clientId)
                  const quote = quoteEstimate(estimate)
                  const isWon =
                    estimate.clientStatus === "accepted" ||
                    estimate.paymentStatus === "deposit_paid" ||
                    estimate.paymentStatus === "paid" ||
                    Boolean(estimate.signature)

                  return (
                    <tr key={estimate.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">
                        <Link
                          href={isWon ? `/work-orders/${estimate.id}` : `/estimates/${estimate.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {client?.name ?? say("Missing client")}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground truncate max-w-[200px]">
                        {estimate.title || "Painting project"}
                      </td>
                      <td className="py-3">
                        {isWon ? (
                          <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                            {estimate.paymentStatus === "paid"
                              ? say("Paid")
                              : estimate.paymentStatus === "deposit_paid"
                                ? say("Deposit Paid")
                                : say("Accepted")}
                          </span>
                        ) : estimate.clientStatus === "sent" ? (
                          <span className="inline-flex rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                            {say("Proposal Sent")}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {say("Lead in progress")}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-display text-sm font-bold text-price tabular-nums">
                        {quote.total > 0 ? money(quote.total) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isWon && (
                            <Link
                              href={`/proposal/${estimate.id}`}
                              className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                            >
                              {say("Contract")}
                            </Link>
                          )}
                          <Link
                            href={isWon ? `/work-orders/${estimate.id}` : `/estimates/${estimate.id}`}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
                          >
                            {isWon ? say("Work order") : say("Open")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
