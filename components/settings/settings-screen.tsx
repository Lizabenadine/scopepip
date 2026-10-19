"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, type ReactNode } from "react"
import { CalendarSync } from "@/components/appointments/calendar-sync"
import { FollowUpEditor } from "@/components/follow-ups/follow-up-editor"
import { QuickBooksSync } from "@/components/payments/quickbooks-sync"
import { Connections } from "@/components/settings/connections"
import { TeamPanel } from "@/components/settings/team-panel"
import { TimeRates } from "@/components/settings/time-rates"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { displayCompanyName } from "@/lib/brand/company"
import { useScope } from "@/lib/data/store"
import { DEFAULT_ESTIMATE_SETTINGS, MINIMUM_JOB_CHARGE, PAYMENT_METHODS, PLAN_NAME, PLAN_PRICE } from "@/lib/defaults"
import { FOLLOW_UP_STAGE_COPY } from "@/lib/follow-ups/defaults"
import { clampDepositPercent } from "@/lib/payments/deposit"
import type { EstimateSettings } from "@/lib/types"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "company", label: "Company" },
  { id: "brand", label: "Brand" },
  { id: "email", label: "Email" },
  { id: "app", label: "App" },
  { id: "calendar", label: "Calendar" },
  { id: "templates", label: "Templates" },
  { id: "notifications", label: "Notifications" },
  { id: "payments", label: "Payments" },
  { id: "integrations", label: "Integrations" },
  { id: "portal", label: "Portal" },
  { id: "add-ons", label: "Add-ons" },
] as const

type SettingsTab = (typeof TABS)[number]["id"]

function tabFrom(value: string | null): SettingsTab {
  return TABS.some((tab) => tab.id === value) ? (value as SettingsTab) : "company"
}

export function SettingsScreen() {
  const scope = useScope()
  const router = useRouter()
  const params = useSearchParams()
  const active = tabFrom(params.get("tab"))

  function openTab(id: SettingsTab) {
    const next = new URLSearchParams(params.toString())
    next.set("tab", id)
    router.replace(`/settings?${next.toString()}`, { scroll: false })
  }

  if (!scope.ready) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />

  return (
    <div className="flex flex-col gap-6" data-testid="settings-screen">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Company, estimating, messages, payments, and connections. A saved estimate keeps the rates it was priced with. A template you save picks up the current production rates when you add it again.
        </p>
      </div>
      <div role="tablist" aria-label="Settings" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`settings-tab-${tab.id}`}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
                selected ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => openTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" data-testid={`settings-panel-${active}`} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {active === "company" ? (
          <>
            <CompanyFields />
            <TeamPanel />
          </>
        ) : null}
        {active === "brand" ? <BrandPanel /> : null}
        {active === "email" ? <EmailFields /> : null}
        {active === "app" ? (
          <>
            <AppFields />
            <TimeRates />
          </>
        ) : null}
        {active === "calendar" ? <CalendarSync /> : null}
        {active === "templates" ? <FollowUpEditor heading={false} /> : null}
        {active === "notifications" ? <NotificationsPanel onEdit={() => openTab("templates")} /> : null}
        {active === "payments" ? (
          <>
            <PaymentFields />
            <QuickBooksSync />
          </>
        ) : null}
        {active === "integrations" ? <Connections /> : null}
        {active === "portal" ? <PortalPanel /> : null}
        {active === "add-ons" ? <AddOnsPanel /> : null}
      </div>
    </div>
  )
}

function CompanyFields() {
  return (
    <DefaultsForm title="Company" intro="The name and phone customers see, and how tax is applied.">
      <TextField id="companyName" name="companyName" label="Company name" placeholder="ScopePipe" wide />
      <TextField id="settings-business-phone" name="businessPhone" label="Business phone" placeholder="(503) 555-0100" wide />
      <TextField id="taxPercent" name="taxPercent" label="Tax %" />
      <SelectField id="taxBasis" name="taxBasis" label="Tax applies to">
        <option value="total_job">Total job</option>
        <option value="materials_only">Materials only</option>
      </SelectField>
    </DefaultsForm>
  )
}

function EmailFields() {
  return (
    <DefaultsForm
      title="Email"
      intro="Proposal mail uses this address. Follow-up email sends through Resend when RESEND_API_KEY and FOLLOW_UP_FROM_EMAIL are set. Until then those messages are logged."
    >
      <TextField id="companyEmail" name="companyEmail" label="Proposal email" type="email" placeholder="office@example.com" wide />
    </DefaultsForm>
  )
}

function AppFields() {
  return (
    <DefaultsForm
      title="App"
      intro="The hourly rate is the business in one number. Interior, exterior, and cabinet estimates can each use a different rate. Leave a type blank to use the hourly rate. New estimates copy these values."
    >
      <TextField id="hourlyRate" name="hourlyRate" label="Hourly rate" />
      <TextField id="interiorHourlyRate" name="interiorHourlyRate" label="Interior hourly rate" placeholder="Uses the hourly rate" />
      <TextField id="exteriorHourlyRate" name="exteriorHourlyRate" label="Exterior hourly rate" placeholder="Uses the hourly rate" />
      <TextField id="cabinetsHourlyRate" name="cabinetsHourlyRate" label="Cabinets hourly rate" placeholder="Uses the hourly rate" />
      <TextField id="materialMarkup" name="materialMarkup" label="Material markup %" />
      <TextField id="minimumJobCharge" name="minimumJobCharge" label="Minimum job charge" />
      <TextField id="expiryDays" name="expiryDays" label="Client-visible expiry, days" />
      <SelectField id="hourRounding" name="hourRounding" label="Hour rounding">
        <option value="0">No rounding</option>
        <option value="0.25">15 minutes</option>
        <option value="0.5">30 minutes</option>
        <option value="1">1 hour</option>
      </SelectField>
    </DefaultsForm>
  )
}

function PaymentFields() {
  const scope = useScope()
  return (
    <div className="flex flex-col gap-6">
      <DefaultsForm title="Payments" intro="Deposit and financing apply to the next proposal. Card and ACH checkout uses Stripe when the Stripe keys are set.">
        <TextField id="depositPercent" name="depositPercent" label="Deposit %" />
        <TextField id="financingApr" name="financingApr" label="Financing APR %" />
        <TextField id="financingMonths" name="financingMonths" label="Financing months" />
        <TextField id="financingLender" name="financingLender" label="Financing lender" placeholder="Leave blank to say Financing" wide />
        <TextField id="financingApplyUrl" name="financingApplyUrl" label="Financing apply link" placeholder="https://" wide />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="financingEnabled" value="on" defaultChecked={scope.estimateSettings.financingEnabled !== false} data-testid="financing-enabled" />
          Show financing on proposals
        </label>
      </DefaultsForm>
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold">Ways to pay</h2>
        <ul className="mt-2 text-sm text-muted-foreground">
          {PAYMENT_METHODS.map((method) => (
            <li key={method.id}>{method.label}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function BrandPanel() {
  const { estimateSettings } = useScope()
  const name = displayCompanyName(estimateSettings.companyName)
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="text-lg font-semibold">Brand</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Proposals, work orders, and follow-ups use {name}. Change that name on the Company tab. The office header keeps the ScopePipe wordmark.
      </p>
      <p className="mt-4 font-display text-3xl" data-testid="brand-preview">
        {name}
      </p>
    </section>
  )
}

function NotificationsPanel({ onEdit }: { onEdit: () => void }) {
  const { followUpSequences } = useScope()
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="text-lg font-semibold">Notifications</h2>
      <p className="text-sm text-muted-foreground">
        Each column can text or email the customer while the office is open. A reply or a booked visit stops that sequence.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {followUpSequences.map((sequence) => (
          <li key={sequence.stage} className="flex items-center justify-between gap-3">
            <span>{FOLLOW_UP_STAGE_COPY[sequence.stage].label}</span>
            <span className="text-muted-foreground">{sequence.enabled ? "On" : "Off"}</span>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" className="h-11 w-fit" onClick={onEdit}>
        Edit messages
      </Button>
    </section>
  )
}

function PortalPanel() {
  const { session } = useScope()
  const requestHref = session ? `/request/${session.companySlug}` : "/signup"
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="text-lg font-semibold">Customer portal</h2>
      <p className="text-sm text-muted-foreground">
        Customers open a proposal, request a visit, or book a time without the office menu.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        <li>
          <Link href={requestHref} className="font-medium text-primary">
            Website form
          </Link>
          <span className="text-muted-foreground"> opens a Cold Leads card for this company.</span>
        </li>
        <li className="text-muted-foreground">Each sales card has its own booking page.</li>
      </ul>
    </section>
  )
}

function AddOnsPanel() {
  const { updateEstimateSettings, resetDemo } = useScope()
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{PLAN_NAME}</p>
      <p className="font-display text-3xl">${PLAN_PRICE} / month</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Financing on proposals is turned on from Payments. Calendar, QuickBooks, Zapier, and CompanyCam connect from their own tabs.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-11"
        onClick={() => {
          updateEstimateSettings({ ...DEFAULT_ESTIMATE_SETTINGS })
          resetDemo()
        }}
      >
        Reset sample jobs
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">Restores the documented interior rates.</p>
    </section>
  )
}

function DefaultsForm({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: ReactNode
}) {
  const { estimateSettings, updateEstimateSettings } = useScope()
  const [saved, setSaved] = useState(false)

  return (
    <form
      className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        updateEstimateSettings(readDefaults(estimateSettings, data))
        setSaved(true)
      }}
    >
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
      </div>
      {children}
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" className="h-11">
          Save
        </Button>
        {saved ? <p className="text-sm text-primary">Saved</p> : null}
      </div>
    </form>
  )
}

function readDefaults(current: EstimateSettings, data: FormData): EstimateSettings {
  const next = { ...current }
  if (data.has("companyName")) next.companyName = String(data.get("companyName") ?? "")
  if (data.has("businessPhone")) next.businessPhone = String(data.get("businessPhone") ?? "")
  if (data.has("companyEmail")) next.companyEmail = String(data.get("companyEmail") ?? "")
  if (data.has("hourlyRate")) next.hourlyRate = Number(data.get("hourlyRate")) || 0
  if (data.has("interiorHourlyRate") || data.has("exteriorHourlyRate") || data.has("cabinetsHourlyRate")) {
    next.typeHourlyRates = writeTypeRates(next.typeHourlyRates, data)
  }
  if (data.has("taxPercent")) next.taxPercent = Number(data.get("taxPercent")) || 0
  if (data.has("expiryDays")) next.expiryDays = Number(data.get("expiryDays")) || 0
  if (data.has("hourRounding")) next.hourRounding = Number(data.get("hourRounding")) as EstimateSettings["hourRounding"]
  if (data.has("materialMarkup")) next.materialMarkup = (Number(data.get("materialMarkup")) || 0) / 100
  if (data.has("taxBasis")) next.taxBasis = data.get("taxBasis") === "materials_only" ? "materials_only" : "total_job"
  if (data.has("minimumJobCharge")) next.minimumJobCharge = Number(data.get("minimumJobCharge")) || 0
  if (data.has("depositPercent")) next.depositPercent = clampDepositPercent(Number(data.get("depositPercent")))
  if (data.has("financingApr")) next.financingApr = Number(data.get("financingApr"))
  if (data.has("financingMonths")) next.financingMonths = Number(data.get("financingMonths"))
  if (data.has("financingLender")) next.financingLender = String(data.get("financingLender") ?? "")
  if (data.has("financingApplyUrl")) next.financingApplyUrl = String(data.get("financingApplyUrl") ?? "")
  if (data.has("financingEnabled") || data.has("depositPercent")) next.financingEnabled = data.get("financingEnabled") === "on"
  return next
}

function TextField({
  id,
  name,
  label,
  placeholder,
  type,
  wide,
}: {
  id: string
  name: string
  label: string
  placeholder?: string
  type?: string
  wide?: boolean
}) {
  const { estimateSettings } = useScope()
  const value = fieldValue(estimateSettings, name)
  return (
    <div className={wide ? "grid gap-1 sm:col-span-2" : "grid gap-1"}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} defaultValue={value} placeholder={placeholder} className="h-11" />
    </div>
  )
}

function SelectField({
  id,
  name,
  label,
  children,
}: {
  id: string
  name: string
  label: string
  children: ReactNode
}) {
  const { estimateSettings } = useScope()
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={name} defaultValue={fieldValue(estimateSettings, name)} className="h-11 rounded-lg border border-input bg-transparent px-2">
        {children}
      </select>
    </div>
  )
}

function writeTypeRates(
  current: EstimateSettings["typeHourlyRates"],
  data: FormData,
): EstimateSettings["typeHourlyRates"] {
  const next = { ...current }
  const write = (kind: "interior" | "exterior" | "cabinets", name: string) => {
    const text = String(data.get(name) ?? "").trim()
    if (!text) delete next[kind]
    else next[kind] = Number(text) || 0
  }
  write("interior", "interiorHourlyRate")
  write("exterior", "exteriorHourlyRate")
  write("cabinets", "cabinetsHourlyRate")
  return next
}

function rateText(value: number | undefined): string {
  return typeof value === "number" ? String(value) : ""
}

function fieldValue(settings: EstimateSettings, name: string): string {
  if (name === "materialMarkup") return String((settings.materialMarkup ?? 0.2) * 100)
  if (name === "minimumJobCharge") return String(settings.minimumJobCharge ?? MINIMUM_JOB_CHARGE)
  if (name === "depositPercent") return String(settings.depositPercent ?? 30)
  if (name === "financingApr") return String(settings.financingApr ?? 9.99)
  if (name === "financingMonths") return String(settings.financingMonths ?? 12)
  if (name === "taxBasis") return settings.taxBasis ?? "total_job"
  if (name === "hourRounding") return String(settings.hourRounding)
  if (name === "interiorHourlyRate") return rateText(settings.typeHourlyRates?.interior)
  if (name === "exteriorHourlyRate") return rateText(settings.typeHourlyRates?.exterior)
  if (name === "cabinetsHourlyRate") return rateText(settings.typeHourlyRates?.cabinets)
  const value = settings[name as keyof EstimateSettings]
  return value === undefined || value === null ? "" : String(value)
}
