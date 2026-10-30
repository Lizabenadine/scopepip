"use client"

import { useEffect, useState, type FormEvent } from "react"
import { CompanyMark } from "@/components/brand/company-mark"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { translatePainting } from "@/lib/field/terms"
import type { WorkOrderData } from "@/lib/work-orders/subcontractor"

export function SubcontractorWorkOrder({
  order,
  logoUrl,
  description,
  spanishDescription,
  workerName,
  setDescription,
  onSign,
}: {
  order: WorkOrderData
  logoUrl?: string | null
  description: string
  spanishDescription?: string
  workerName?: string | null
  setDescription: (description: string) => void
  onSign: (name: string, signedDate: string) => void
}) {
  const { copy, language } = useFieldLanguage()
  const say = (text: string) => translatePainting(text, language)
  const [subName, setSubName] = useState(workerName?.trim() ?? "")
  useEffect(() => {
    const name = workerName?.trim()
    if (!name) return
    setSubName((current) => current || name)
  }, [workerName])
  const [subDate, setSubDate] = useState(new Date().toISOString().split("T")[0])
  const signed = Boolean(order.subSignature)
  const brands = [...new Set(order.colorSpecs.map((spec) => spec.brand).filter(Boolean))]

  const handleSubSign = (event: FormEvent) => {
    event.preventDefault()
    if (!subName.trim()) return
    onSign(subName, subDate)
  }

  return (
    <div className="space-y-6 text-slate-900" data-testid="subcontractor-order">
      <div className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:flex-row">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-900 px-2.5 py-1 text-[10px] font-bold tracking-widest text-white uppercase">
              {copy.subOrder}
            </span>
            <span className="font-mono text-xs text-slate-400">#{order.jobId}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{order.jobName}</h1>
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{copy.customer}:</span> {order.customerName}
          </p>
          {order.jobAddress ? <p className="text-xs text-slate-500">{order.jobAddress}</p> : null}
          {order.customerPhone ? (
            <a className="block text-xs font-medium text-blue-700" href={`tel:${order.customerPhone}`}>
              {order.customerPhone}
            </a>
          ) : null}
          {order.customerEmail ? (
            <a className="block text-xs text-blue-700" href={`mailto:${order.customerEmail}`}>
              {order.customerEmail}
            </a>
          ) : null}
        </div>
        <div className="min-w-[220px] space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600 md:text-right">
          <CompanyMark name={order.companyName} logoUrl={logoUrl} className="text-base font-bold text-slate-900" imageClassName="ml-auto h-12" testId="work-order-brand" />
          {order.companyAddress ? <p>{order.companyAddress}</p> : null}
          {order.companyPhone ? <p>{copy.phone}: {order.companyPhone}</p> : null}
          {order.salespersonName ? (
            <p className="pt-2 text-slate-500">
              {copy.salesRep}: <span className="font-medium text-slate-800">{order.salespersonName}</span>
            </p>
          ) : null}
          {order.salespersonEmail ? <p className="text-[11px] text-slate-400">{order.salespersonEmail}</p> : null}
          {order.dateGenerated ? <p className="text-[11px] text-slate-400">{copy.generated}: {order.dateGenerated}</p> : null}
        </div>
      </div>

      {order.companyCamUrl ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="text-xs text-blue-900">
            <span className="font-bold">{copy.jobPhotos}</span>
          </div>
          <a
            href={order.companyCamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            {copy.openCompanyCam}
          </a>
        </div>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">{copy.colors}</h2>
          <span className="text-xs font-semibold text-slate-400">
            {brands.length > 0 ? brands.join(", ") : copy.fromEstimate}
          </span>
        </div>
        {order.colorSpecs.length === 0 ? (
          <p className="text-xs text-slate-500">{copy.noPaint}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {order.colorSpecs.map((spec) => (
              <div key={spec.id} className="relative space-y-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
                {spec.brand ? (
                  <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase">
                    {spec.brand}
                  </span>
                ) : null}
                <h3 className="text-sm font-bold text-slate-900">{say(spec.area)}</h3>
                <p className="text-xs font-semibold text-slate-700">{say(spec.product)}</p>
                <div className="flex justify-between border-t border-slate-200/60 pt-2 text-xs">
                  <span className="font-mono text-slate-800">{copy.photoLink(spec.colorNameCode)}</span>
                  <span className="font-bold text-slate-600">{copy.photoLink(spec.sheen)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
          {copy.scopePrep}
        </h2>
        <textarea
          id="scope-description"
          data-testid="scope-description"
          placeholder={copy.scopePlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
        />
        {spanishDescription ? (
          <p className="text-sm text-slate-600" data-testid="prep-note-es">
            Español: {spanishDescription}
          </p>
        ) : null}
        <div className="space-y-3">
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">{copy.surfacePrep}</h3>
          {order.prepTasks.length === 0 ? (
            <p className="text-xs text-slate-500">{copy.noPrep}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 text-xs text-slate-700">
              {order.prepTasks.map((task) => (
                <li key={task} className="flex items-start gap-2.5">
                  <span className="font-bold text-emerald-600">✓</span>
                  <span>{say(copy.checklistLabel(task))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">{copy.includedAreas}</h3>
            {order.applicationAreas.length === 0 ? (
              <p className="text-xs text-slate-500">{copy.noAreas}</p>
            ) : (
              <ul className="list-inside list-disc space-y-1.5 text-xs text-slate-700">
                {order.applicationAreas.map((area) => (
                  <li key={area}>{say(area)}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold tracking-wider text-rose-500 uppercase">{copy.exclusions}</h3>
            <ul className="list-inside list-disc space-y-1.5 rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-slate-600">
              {order.exclusions.length === 0 ? (
                <li>{copy.noneListed}</li>
              ) : (
                order.exclusions.map((exclusion) => <li key={exclusion}>{exclusion}</li>)
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-900">
          {copy.installerItems}
        </h2>
        {order.hybridItems.length === 0 ? (
          <p className="text-xs text-slate-500">{copy.noInstallerItems}</p>
        ) : (
          <div className="space-y-2">
            {order.hybridItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{say(item.description)}</p>
                  {item.notes ? <p className="mt-0.5 text-xs text-slate-500">{say(item.notes)}</p> : null}
                </div>
                <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-slate-700">
                  {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(2)} {copy.unit(item.unit)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6 rounded-2xl border-2 border-slate-900 bg-slate-900 p-6 text-white shadow-md sm:p-8">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{copy.signOff}</h2>
            <span className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-300 uppercase">
              {copy.subCopy}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {copy.signOffBody}
          </p>
        </div>
        {signed ? (
          <div
            className="space-y-1 rounded-xl border border-emerald-500/40 bg-emerald-950/80 p-4 text-xs text-emerald-200"
            data-testid="subcontractor-signed"
          >
            <p className="font-bold text-emerald-400">{copy.acceptedSigned}</p>
            <p>
              {copy.signedBy}: <span className="font-serif text-sm text-white">{order.subSignature}</span>
              {order.subSignedDate ? ` on ${order.subSignedDate}` : ""}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubSign} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="subcontractor-name" className="mb-1 block text-xs font-semibold text-slate-300">
                  {copy.printedName}
                </label>
                <input
                  id="subcontractor-name"
                  data-testid="subcontractor-name"
                  type="text"
                  required
                  placeholder={copy.crewLeadName}
                  value={subName}
                  onChange={(event) => setSubName(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-serif text-base text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="subcontractor-date" className="mb-1 block text-xs font-semibold text-slate-300">
                  {copy.date}
                </label>
                <input
                  id="subcontractor-date"
                  data-testid="subcontractor-date"
                  type="date"
                  required
                  value={subDate}
                  onChange={(event) => setSubDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                data-testid="subcontractor-sign"
                className="rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg transition-colors hover:bg-blue-500"
              >
                {copy.acceptSign}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
