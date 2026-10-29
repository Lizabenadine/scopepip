"use client"

import { useState } from "react"
import { CompanyMark } from "@/components/brand/company-mark"
import { Button } from "@/components/ui/button"
import { removeStoredLogo, uploadCompanyLogo } from "@/lib/brand/logo-upload"
import { displayCompanyName } from "@/lib/brand/company"
import { useScope } from "@/lib/data/store"

export function CompanyLogoField() {
  const { estimateSettings, updateEstimateSettings } = useScope()
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const name = displayCompanyName(estimateSettings.companyName)
  const shown = preview || estimateSettings.logoUrl || ""

  async function choose(file: File | undefined) {
    if (!file) return
    setError(null)
    const local = URL.createObjectURL(file)
    setPreview(local)
    setPending(true)
    try {
      const url = await uploadCompanyLogo(file)
      updateEstimateSettings({ ...estimateSettings, logoUrl: url })
      setPreview(null)
    } catch (caught) {
      setPreview(null)
      setError(caught instanceof Error ? caught.message : "The logo could not be saved.")
    } finally {
      URL.revokeObjectURL(local)
      setPending(false)
    }
  }

  function remove() {
    setPreview(null)
    setError(null)
    updateEstimateSettings({ ...estimateSettings, logoUrl: "" })
    void removeStoredLogo()
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex min-h-24 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" data-testid="company-logo-preview">
        <CompanyMark name={name} logoUrl={shown} testId="company-logo-image" className="font-display text-3xl text-primary" imageClassName="h-16" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          {pending ? "Saving" : shown ? "Update logo" : "Upload logo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            data-testid="company-logo-file"
            disabled={pending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ""
              void choose(file)
            }}
          />
        </label>
        {shown ? (
          <Button type="button" variant="outline" className="h-11" data-testid="company-logo-remove" onClick={remove} disabled={pending}>
            Remove logo
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-sm text-muted-foreground">PNG, JPG, WEBP, or GIF under 2 MB. The preview updates as soon as you choose a file.</p>
    </div>
  )
}
