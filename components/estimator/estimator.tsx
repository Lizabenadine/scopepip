"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { ChangeOrderDialog } from "@/components/change-orders/change-order-dialog"
import { AreaEditor } from "@/components/estimator/area-editor"
import { HourlyRateBuildButton } from "@/components/estimator/hourly-rate-build"
import { EstimateActivityLog } from "@/components/estimator/activity"
import { EstimateVersions } from "@/components/estimator/versions"
import { LinePhotoField } from "@/components/estimator/line-photo"
import { CalculationPanel } from "@/components/estimator/calculation-panel"
import { ClientField } from "@/components/estimator/client-field"
import { PriceSummary } from "@/components/estimator/price-summary"
import { PhotoGallery } from "@/components/photos/photo-gallery"
import { ScheduleDialog } from "@/components/pipeline/schedule-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useEstimator } from "@/hooks/use-estimator"
import { copyLineItem, insertAfter } from "@/lib/estimate/copy"
import { blankLineItem, paintUpgradeLine } from "@/lib/defaults"
import { selectEstimateKind, setKindHourlyRate } from "@/lib/estimate/kinds"
import { pendingAmount } from "@/lib/estimate/pending"
import { withCurrentRates } from "@/lib/estimate/saved-templates"
import { ESTIMATE_KINDS, ESTIMATE_KIND_LABEL } from "@/lib/estimate/templates"
import { clampDepositPercent, depositAmount } from "@/lib/payments/deposit"
import { money, moneyExact } from "@/lib/format"
import { NEXT_ACTION } from "@/lib/stages"
import type { LineItemInput, LineMaterial, LinePricingMode } from "@/lib/types"

export function Estimator({
  mode,
  estimateId,
}: {
  mode: "new" | "edit"
  estimateId?: string
}) {
  const router = useRouter()
  const estimator = useEstimator(mode, estimateId)
  const [explainOpen, setExplainOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateError, setTemplateError] = useState<string | null>(null)

  if (!estimator.ready) {
    return (
      <div className="grid gap-3" aria-hidden>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  const {
    missing,
    draft,
    quote,
    stage,
    next,
    previous,
    disabled,
    disabledReason,
    status,
    clients,
    patch,
    persist,
    versions,
    activity,
    restoreVersion,
    setStatus,
    moveStage,
    deleteEstimate,
    paymentMethods,
    productionRates,
    savedTemplates,
    saveEstimateTemplate,
    deleteEstimateTemplate,
    areaNames,
    setAreaNames,
  } = estimator

  if (missing || !draft || !quote) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">This estimate isn&apos;t on this device</h1>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to jobs
        </Link>
      </div>
    )
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (disabled) return
    const saved = persist()
    if (saved && mode === "new") router.push(`/estimates/${saved.id}`)
  }

  const onAdvance = () => {
    if (disabled || !next) return
    const saved = persist()
    if (!saved) return
    if (next.slug === "scheduled") {
      setScheduleOpen(true)
      if (mode === "new") router.push(`/estimates/${saved.id}`)
      return
    }
    moveStage(saved.id, next.id)
    patch({ id: saved.id, clientId: saved.clientId, stageId: next.id })
    if (mode === "new") router.push(`/estimates/${saved.id}`)
  }

  const addLine = (modeName: LinePricingMode) => {
    patch({ lineItems: [...draft.lineItems, blankLineItem(crypto.randomUUID(), modeName)] })
  }

  const addPaintUpgrade = () => {
    patch({ lineItems: [...draft.lineItems, paintUpgradeLine(crypto.randomUUID())] })
  }

  return (
    <form onSubmit={onSubmit} className="pb-44 lg:pb-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          Jobs
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {draft.id ? (
            <Link href={`/proposal/${draft.id}`} className="font-medium text-primary">
              Proposal
            </Link>
          ) : null}
          {draft.id ? <EstimateVersions versions={versions} onRestore={restoreVersion} /> : null}
          {draft.id ? <EstimateActivityLog entries={activity} /> : null}
          {draft.id ? <PhotoGallery estimateId={draft.id} /> : null}
          {draft.id ? (
            <ChangeOrderDialog
              estimateId={draft.id}
              onApplied={(lineItems, message) => {
                patch({ lineItems: [...draft.lineItems, ...lineItems] })
                setStatus(message)
              }}
            />
          ) : null}
          {draft.id && (stage?.slug === "scheduled" || stage?.slug === "completed") ? (
            <Link href={`/work-orders/${draft.id}`} className="font-medium text-primary">
              Work order
            </Link>
          ) : null}
          {stage ? <span className="font-medium">{stage.name}</span> : null}
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "new" ? "New estimate" : draft.title || "Estimate"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Pick Interior, Exterior, or Cabinets. Templates and surfaces follow that type, and each type can use its own hourly rate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="estimate-kind">
            {ESTIMATE_KINDS.map((kind) => {
              const selected = (draft.estimateKind ?? "interior") === kind
              return (
                <button
                  key={kind}
                  type="button"
                  data-testid={`estimate-kind-${kind}`}
                  onClick={() =>
                    patch({
                      estimateKind: kind,
                      settings: selectEstimateKind(draft.settings, kind),
                    })
                  }
                  className={
                    selected
                      ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                      : "rounded-full bg-muted px-3 py-1.5 text-sm"
                  }
                >
                  {ESTIMATE_KIND_LABEL[kind]}
                </button>
              )
            })}
          </div>
          <ClientField
            clients={clients}
            name={draft.clientName}
            clientId={draft.clientId}
            onChange={(nextClient) =>
              patch({ clientName: nextClient.name, clientId: nextClient.clientId })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="job-title">Job</Label>
              <Input
                id="job-title"
                value={draft.title}
                placeholder="Interior repaint"
                className="h-11"
                onValueChange={(value) => patch({ title: value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="job-address">Address</Label>
              <Input
                id="job-address"
                value={draft.jobAddress}
                placeholder="Street, city"
                className="h-11"
                onValueChange={(value) => patch({ jobAddress: value })}
              />
            </div>
          </div>
          <AreaEditor
            areas={draft.areas}
            areaGroups={draft.areaGroups ?? []}
            rates={draft.rates}
            kind={draft.estimateKind ?? "interior"}
            savedTemplates={savedTemplates}
            onDeleteSaved={deleteEstimateTemplate}
            onSaveTemplate={() => {
              setTemplateName(draft.title.trim() || `${ESTIMATE_KIND_LABEL[draft.estimateKind ?? "interior"]} template`)
              setTemplateError(null)
              setSaveOpen(true)
            }}
            areaNames={areaNames}
            onAreaNames={setAreaNames}
            onChange={(areas, title, lineItems, rates) => {
              const added = areas.length > draft.areas.length ? areas.slice(draft.areas.length) : []
              patch({
                areas,
                rates: rates ?? withCurrentRates(draft.rates, productionRates, added),
                ...(lineItems && lineItems.length > 0 ? { lineItems: [...draft.lineItems, ...lineItems] } : {}),
                ...(title && draft.title.trim().length === 0 ? { title } : {}),
              })
            }}
            onGroups={(areaGroups) => patch({ areaGroups })}
            onDuplicate={(areas) => patch({ areas })}
          />
          <section className="flex min-w-0 flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Line items
            </h2>
            {draft.lineItems.map((line) => {
              const materials = line.materials ?? []
              return (
              <div key={line.id} className="min-w-0 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid flex-1 gap-1">
                    <Label htmlFor={`${line.id}-name`}>Name</Label>
                    <Input
                      id={`${line.id}-name`}
                      value={line.label}
                      className="h-11"
                      onValueChange={(label) => updateLine(draft.lineItems, line.id, { label }, patch)}
                    />
                  </div>
                  <div className="mt-6 flex shrink-0 gap-3">
                    <button
                      type="button"
                      className="text-sm font-medium text-primary"
                      data-testid="copy-line"
                      onClick={() => patch({ lineItems: insertAfter(draft.lineItems, line.id, copyLineItem(line)) })}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground"
                      onClick={() =>
                        patch({ lineItems: draft.lineItems.filter((item) => item.id !== line.id) })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-1">
                  <Label htmlFor={`${line.id}-description`}>Description</Label>
                  <textarea
                    id={`${line.id}-description`}
                    value={line.clientNote}
                    onChange={(event) =>
                      updateLine(draft.lineItems, line.id, { clientNote: event.target.value }, patch)
                    }
                    className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none"
                  />
                </div>
                <LinePhotoField
                  lineId={line.id}
                  photo={line.photo}
                  onPhoto={(photo) => updateLine(draft.lineItems, line.id, { photo }, patch)}
                />
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(line.hiddenOnWorkOrder)}
                    onChange={(event) =>
                      updateLine(
                        draft.lineItems,
                        line.id,
                        { hiddenOnWorkOrder: event.target.checked },
                        patch,
                      )
                    }
                  />
                  Hidden on Work Order
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(line.optional)}
                    onChange={(event) =>
                      updateLine(
                        draft.lineItems,
                        line.id,
                        { optional: event.target.checked, selected: event.target.checked ? line.selected !== false : true },
                        patch,
                      )
                    }
                  />
                  Optional add-on
                </label>
                {line.optional && line.selected === false && !line.pending ? (
                  <p className="mt-2 text-sm text-muted-foreground">The client left this off the accepted proposal.</p>
                ) : null}
                {draft.clientStatus === "accepted" ? (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      data-testid={`pending-${line.id}`}
                      checked={Boolean(line.pending)}
                      onChange={(event) => {
                        if (!event.target.checked && pendingAmount(line, draft.settings) < 0) return
                        updateLine(
                          draft.lineItems,
                          line.id,
                          event.target.checked
                            ? { pending: true, optional: true, selected: false }
                            : { pending: false, selected: true },
                          patch,
                        )
                      }}
                    />
                    Pending additional work
                  </label>
                ) : null}
                {line.pending ? (
                  <p className="mt-2 text-sm text-muted-foreground" data-testid={`pending-note-${line.id}`}>
                    Off the invoice until the customer signs. A negative price becomes a QuickBooks credit.{" "}
                    {money(pendingAmount(line, draft.settings))} is waiting.
                  </p>
                ) : null}
                <fieldset className="mt-3">
                  <legend className="text-sm font-medium">Calculate Price By</legend>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {(
                      [
                        ["hourly", "Hourly Rate"],
                        ["quantity", "Quantity"],
                        ["custom", "Custom"],
                      ] as const
                    ).map(([modeName, modeLabel]) => (
                      <label key={modeName} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`${line.id}-mode`}
                          checked={line.mode === modeName}
                          onChange={() => updateLine(draft.lineItems, line.id, { mode: modeName }, patch)}
                        />
                        {modeLabel}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {line.mode === "hourly" ? (
                    <NumberBox
                      label="Hours"
                      value={line.hours}
                      onChange={(hours) => updateLine(draft.lineItems, line.id, { hours }, patch)}
                    />
                  ) : null}
                  {line.mode === "quantity" ? (
                    <>
                      <NumberBox
                        label="Qty/Vol"
                        value={line.units}
                        onChange={(units) => updateLine(draft.lineItems, line.id, { units }, patch)}
                      />
                      <NumberBox
                        label="Unit Price"
                        value={line.pricePerUnit}
                        onChange={(pricePerUnit) =>
                          updateLine(draft.lineItems, line.id, { pricePerUnit }, patch)
                        }
                      />
                    </>
                  ) : null}
                  {line.mode === "custom" ? (
                    <NumberBox
                      label="Price ($)"
                      value={line.customPrice}
                      allowNegative={Boolean(line.pending)}
                      onChange={(customPrice) =>
                        updateLine(draft.lineItems, line.id, { customPrice }, patch)
                      }
                    />
                  ) : null}
                  {line.mode !== "hourly" ? (
                    <NumberBox
                      label="Hrs for Work Order"
                      value={line.workOrderHours}
                      onChange={(workOrderHours) =>
                        updateLine(draft.lineItems, line.id, { workOrderHours }, patch)
                      }
                    />
                  ) : null}
                </div>
                <div className="mt-4 max-w-full overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead className="bg-slate-800 text-left text-white">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Qty/Vol</th>
                        <th className="px-3 py-2 font-medium">Unit Price</th>
                        <th className="px-3 py-2 font-medium">Cost</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((row) => (
                        <tr key={row.id} className="border-b border-border">
                          <td className="px-2 py-2">
                            <Input
                              aria-label="Material name"
                              value={row.name}
                              className="h-10"
                              onValueChange={(name) =>
                                updateMaterial(draft.lineItems, line.id, row.id, { name }, patch)
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <NumberBox
                              label="Qty/Vol"
                              hideLabel
                              ariaLabel="Material quantity"
                              value={row.quantity}
                              onChange={(quantity) =>
                                updateMaterial(draft.lineItems, line.id, row.id, { quantity }, patch)
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <NumberBox
                              label="Unit Price"
                              hideLabel
                              ariaLabel="Material unit price"
                              value={row.unitPrice}
                              onChange={(unitPrice) =>
                                updateMaterial(draft.lineItems, line.id, row.id, { unitPrice }, patch)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 tabular-nums">{money(row.quantity * row.unitPrice)}</td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              className="text-sm text-muted-foreground"
                              onClick={() =>
                                updateLine(
                                  draft.lineItems,
                                  line.id,
                                  { materials: materials.filter((item) => item.id !== row.id) },
                                  patch,
                                )
                              }
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-primary"
                    onClick={() =>
                      updateLine(
                        draft.lineItems,
                        line.id,
                        {
                          materials: [
                            ...materials,
                            { id: crypto.randomUUID(), name: "", quantity: 1, unitPrice: 0 },
                          ],
                        },
                        patch,
                      )
                    }
                  >
                    + Add Materials
                  </button>
                </div>
              </div>
              )
            })}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => addLine("hourly")}>
                Hourly Rate
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => addLine("quantity")}>
                Quantity
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => addLine("custom")}>
                Custom
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={addPaintUpgrade}>
                Paint Upgrade
              </Button>
            </div>
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <NumberBox
                label={`${ESTIMATE_KIND_LABEL[draft.estimateKind ?? "interior"]} hourly rate`}
                value={draft.settings.hourlyRate}
                onChange={(hourlyRate) =>
                  patch({
                    settings: setKindHourlyRate(draft.settings, draft.estimateKind ?? "interior", hourlyRate),
                  })
                }
              />
              <HourlyRateBuildButton
                initial={draft.settings.hourlyRateBuild}
                onApply={(hourlyRate, hourlyRateBuild) =>
                  patch({
                    settings: {
                      ...setKindHourlyRate(draft.settings, draft.estimateKind ?? "interior", hourlyRate),
                      hourlyRateBuild,
                    },
                  })
                }
              />
            </div>
            <NumberBox
              label="Tax %"
              value={draft.settings.taxPercent}
              onChange={(taxPercent) => patch({ settings: { ...draft.settings, taxPercent } })}
            />
            <div className="grid gap-1">
              <NumberBox
                label="Deposit %"
                value={draft.settings.depositPercent ?? 30}
                onChange={(depositPercent) =>
                  patch({
                    settings: {
                      ...draft.settings,
                      depositPercent: clampDepositPercent(depositPercent),
                    },
                  })
                }
              />
              <p className="text-sm text-muted-foreground tabular-nums" data-testid="estimate-deposit-amount">
                Deposit {moneyExact(depositAmount(quote.total, draft.settings.depositPercent ?? 30))}
              </p>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="tax-basis">Tax basis</Label>
              <select
                id="tax-basis"
                className="h-11 rounded-lg border border-input bg-transparent px-2"
                value={draft.settings.taxBasis}
                onChange={(event) =>
                  patch({
                    settings: {
                      ...draft.settings,
                      taxBasis: event.target.value === "materials_only" ? "materials_only" : "total_job",
                    },
                  })
                }
              >
                <option value="total_job">Total job</option>
                <option value="materials_only">Materials only</option>
              </select>
            </div>
            <NumberBox
              label={draft.settings.discountKind === "percent" ? "Discount %" : "Discount $"}
              value={draft.settings.discountValue}
              onChange={(discountValue) => patch({ settings: { ...draft.settings, discountValue } })}
            />
            <div className="grid gap-1">
              <Label htmlFor="payment-method">Payment method</Label>
              <select
                id="payment-method"
                className="h-11 rounded-lg border border-input bg-transparent px-2"
                value={draft.settings.paymentMethodId}
                onChange={(event) =>
                  patch({ settings: { ...draft.settings, paymentMethodId: event.target.value } })
                }
              >
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <NumberBox
              label="Card surcharge %"
              value={draft.settings.surchargePercent}
              onChange={(surchargePercent) =>
                patch({ settings: { ...draft.settings, surchargePercent } })
              }
            />
          </section>
          <div className="grid gap-2">
            <Label htmlFor="client-note">Client note</Label>
            <textarea
              id="client-note"
              value={draft.notes}
              onChange={(event) => patch({ notes: event.target.value })}
              className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crew-note">Crew note</Label>
            <textarea
              id="crew-note"
              value={draft.crewNote}
              onChange={(event) => patch({ crewNote: event.target.value })}
              placeholder="Hidden from the customer proposal"
              className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none"
            />
          </div>
          {previous && draft.id ? (
            <button
              type="button"
              className="self-start text-sm text-muted-foreground"
              onClick={() => {
                moveStage(draft.id!, previous.id)
                patch({ stageId: previous.id })
              }}
            >
              Move back to {previous.name}
            </button>
          ) : null}
          {draft.id ? (
            <button
              type="button"
              className="self-start text-sm text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete job
            </button>
          ) : null}
        </div>
        <PriceSummary
          variant="card"
          quote={quote}
          saveLabel={draft.id ? "Save" : "Save to Lead"}
          disabled={disabled}
          disabledReason={disabledReason}
          nextLabel={next && stage ? NEXT_ACTION[stage.slug] : null}
          status={status}
          onAdvance={onAdvance}
          onExplain={() => setExplainOpen(true)}
          details={
            <CalculationPanel
              quote={quote}
              settings={draft.settings}
              areas={draft.areas}
              areaGroups={draft.areaGroups}
            />
          }
        />
      </div>
      <PriceSummary
        variant="dock"
        quote={quote}
        saveLabel={draft.id ? "Save" : "Save to Lead"}
        disabled={disabled}
        disabledReason={disabledReason}
        nextLabel={next && stage ? NEXT_ACTION[stage.slug] : null}
        status={status}
        onAdvance={onAdvance}
        onExplain={() => setExplainOpen(true)}
      />
      <Sheet open={explainOpen} onOpenChange={setExplainOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>How this price is built</SheetTitle>
            <SheetDescription>
              Sales rate is the total divided by project hours.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <CalculationPanel
              quote={quote}
              settings={draft.settings}
              areas={draft.areas}
              areaGroups={draft.areaGroups}
            />
          </div>
        </SheetContent>
      </Sheet>
      <ScheduleDialog
        open={scheduleOpen}
        clientName={draft.clientName || "this job"}
        initialDate={draft.scheduledOn}
        onOpenChange={setScheduleOpen}
        onConfirm={(date) => {
          if (!draft.id || !next) return
          moveStage(draft.id, next.id, date)
          patch({ stageId: next.id, scheduledOn: date })
          setScheduleOpen(false)
          router.push(`/work-orders/${draft.id}`)
        }}
      />
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as a template</DialogTitle>
            <DialogDescription>
              The rooms, their groups, and the line items are saved for this {ESTIMATE_KIND_LABEL[draft.estimateKind ?? "interior"].toLowerCase()} type. The next time you add it, the hours use your current production rates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              data-testid="template-name"
              value={templateName}
              className="h-11"
              onValueChange={setTemplateName}
            />
          </div>
          {templateError ? <p className="text-sm text-destructive">{templateError}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              className="h-11"
              data-testid="template-save"
              onClick={() => {
                const saved = saveEstimateTemplate(templateName)
                if (!saved) {
                  setTemplateError("Add an area or a line item, and name the template.")
                  return
                }
                setSaveOpen(false)
              }}
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this job?</DialogTitle>
            <DialogDescription>The client stays in the book.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              onClick={() => {
                if (!draft.id) return
                deleteEstimate(draft.id)
                router.push("/")
              }}
            >
              Delete job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}

function updateLine(
  lines: LineItemInput[],
  id: string,
  partial: Partial<LineItemInput>,
  patch: (partial: { lineItems: LineItemInput[] }) => void,
) {
  patch({
    lineItems: lines.map((item) => (item.id === id ? { ...item, ...partial } : item)),
  })
}

function updateMaterial(
  lines: LineItemInput[],
  lineId: string,
  materialId: string,
  partial: Partial<LineMaterial>,
  patch: (partial: { lineItems: LineItemInput[] }) => void,
) {
  patch({
    lineItems: lines.map((item) =>
      item.id === lineId
        ? {
            ...item,
            materials: (item.materials ?? []).map((row) =>
              row.id === materialId ? { ...row, ...partial } : row,
            ),
          }
        : item,
    ),
  })
}

function NumberBox({
  label,
  value,
  onChange,
  ariaLabel,
  hideLabel,
  allowNegative = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  ariaLabel?: string
  hideLabel?: boolean
  allowNegative?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="grid gap-1">
      {hideLabel ? null : <Label>{label}</Label>}
      <Input
        aria-label={ariaLabel ?? label}
        inputMode="decimal"
        value={draft ?? String(value)}
        className="h-11"
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onValueChange={(next) => {
          const negative = allowNegative && next.trim().startsWith("-")
          const cleaned = next.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
          const shown = negative ? `-${cleaned}` : cleaned
          setDraft(shown)
          const parsed = cleaned === "" || cleaned === "." ? 0 : Number(shown)
          onChange(Number.isFinite(parsed) ? parsed : 0)
        }}
      />
    </div>
  )
}
