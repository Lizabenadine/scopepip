"use client"

import { useId, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Upload,
  X,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import {
  previewCsvLeads,
  type CsvPreviewResult,
  type ParsedCsvLead,
} from "@/lib/leads/csv-import"
import { cn } from "@/lib/utils"

export function ImportLeadsButton({
  label = "Import Leads",
  className,
  variant = "outline",
}: {
  label?: string
  className?: string
  variant?: "outline" | "default" | "secondary" | "ghost"
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant={variant}
        data-testid="import-leads"
        className={cn("gap-1.5 font-medium shadow-xs", className)}
        onClick={() => setOpen(true)}
      >
        <Upload className="size-4" />
        <span>{label}</span>
      </Button>
      <ImportLeadsDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function ImportLeadsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const scope = useScope()
  const { language } = useFieldLanguage()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<"upload" | "preview" | "complete">("upload")
  const [fileName, setFileName] = useState<string>("")
  const [csvContent, setCsvContent] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState("")

  // Import results
  const [importStats, setImportStats] = useState<{
    imported: number
    skipped: number
    failed: number
    total: number
  }>({ imported: 0, skipped: 0, failed: 0, total: 0 })

  const preview: CsvPreviewResult | null = useMemo(() => {
    if (!csvContent.trim()) return null
    return previewCsvLeads(csvContent, scope)
  }, [csvContent, scope])

  const reset = () => {
    setStep("upload")
    setFileName("")
    setCsvContent("")
    setParseError(null)
    setShowPaste(false)
    setPasteText("")
    setImportStats({ imported: 0, skipped: 0, failed: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const processFile = (file: File) => {
    setParseError(null)
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Please select a valid .csv file.")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === "string") {
        if (!text.trim()) {
          setParseError("The uploaded CSV file is empty.")
          return
        }
        setFileName(file.name)
        setCsvContent(text)
        setStep("preview")
      }
    }
    reader.onerror = () => {
      setParseError("Failed to read the file. Please try again.")
    }
    reader.readAsText(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setParseError("Please paste your CSV text first.")
      return
    }
    setFileName("pasted-leads.csv")
    setCsvContent(pasteText)
    setStep("preview")
  }

  const handleConfirmImport = () => {
    if (!preview || preview.validCount === 0) return
    const result = scope.importCsvLeads(preview.leads)
    setImportStats({
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      total: result.total,
    })
    setStep("complete")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl overflow-hidden p-0 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-xs">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {step === "complete"
                  ? "Import Summary"
                  : step === "preview"
                    ? `Preview Leads: ${fileName}`
                    : "Import Leads from CSV"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {step === "complete"
                  ? "Your leads have been added to the Sales Pipeline."
                  : step === "preview"
                    ? "Review recognized columns and duplicate detection before importing."
                    : "Upload a CSV spreadsheet with names, emails, phones, and addresses."}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-4">
              {parseError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0" />
                  <p>{parseError}</p>
                </div>
              )}

              {/* Drag & Drop Zone */}
              {!showPaste ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
                    isDragging
                      ? "border-cyan-500 bg-cyan-50/50"
                      : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50",
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="csv-drop-zone"
                >
                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                    data-testid="csv-file-input"
                  />
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 shadow-xs mb-3">
                    <Upload className="size-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Click to upload or drag & drop CSV file
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Supports standard .csv spreadsheets exported from Google Sheets, Excel, or other CRMs.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
                    Choose File
                  </span>
                </div>
              ) : (
                /* Raw CSV Paste Option */
                <div className="space-y-2">
                  <label htmlFor="csv-paste-area" className="block text-xs font-semibold text-slate-700">
                    Paste raw CSV text with headers:
                  </label>
                  <textarea
                    id="csv-paste-area"
                    data-testid="csv-paste-textarea"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`Name,Phone,Email,Address,Notes\nJohn Doe,(503) 555-0123,john@example.com,123 Main St,Interior repaint`}
                    rows={8}
                    className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowPaste(false)}
                    >
                      Back to file upload
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="text-xs bg-cyan-600 hover:bg-cyan-500"
                      onClick={handlePasteSubmit}
                      data-testid="csv-paste-submit"
                    >
                      Preview Pasted CSV
                    </Button>
                  </div>
                </div>
              )}

              {/* Supported Column Info Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <HelpCircle className="size-4 text-cyan-600" />
                  <span>Supported Column Headings</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Column names are automatically recognized:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-700 font-sans">Name:</span> Name, Full Name, First/Last Name, Contact
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 font-sans">Phone:</span> Phone, Mobile, Cell, Tel, Primary Phone
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 font-sans">Email:</span> Email, E-mail, Email Address
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 font-sans">Address:</span> Street, Address, City, State, Zip
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-700 font-sans">Notes:</span> Notes, Comments, Service, Description
                  </div>
                </div>
                {!showPaste && (
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                    <span>Don&apos;t have a file ready?</span>
                    <button
                      type="button"
                      onClick={() => setShowPaste(true)}
                      className="font-semibold text-cyan-600 hover:underline"
                    >
                      Paste CSV text instead
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Summary Stats Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Total Rows</p>
                  <p className="mt-0.5 text-xl font-bold text-slate-900" data-testid="preview-total-count">
                    {preview.totalRows}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center shadow-xs">
                  <p className="text-xs text-emerald-800 font-medium">Ready to Import</p>
                  <p className="mt-0.5 text-xl font-bold text-emerald-700" data-testid="preview-valid-count">
                    {preview.validCount}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center shadow-xs">
                  <p className="text-xs text-amber-800 font-medium">Duplicates (Skip)</p>
                  <p className="mt-0.5 text-xl font-bold text-amber-700" data-testid="preview-duplicate-count">
                    {preview.duplicateCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Invalid (Skip)</p>
                  <p className="mt-0.5 text-xl font-bold text-slate-600" data-testid="preview-invalid-count">
                    {preview.invalidCount}
                  </p>
                </div>
              </div>

              {/* Column Mapping Pill Bar */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-900">Recognized:</span>
                {preview.mapping.nameCol && (
                  <span className="rounded-md bg-white px-2 py-0.5 font-medium border border-slate-200 text-slate-700">
                    Name &larr; <strong className="text-cyan-700">{preview.mapping.nameCol}</strong>
                  </span>
                )}
                {preview.mapping.firstNameCol && (
                  <span className="rounded-md bg-white px-2 py-0.5 font-medium border border-slate-200 text-slate-700">
                    First &larr; <strong className="text-cyan-700">{preview.mapping.firstNameCol}</strong>
                  </span>
                )}
                {preview.mapping.lastNameCol && (
                  <span className="rounded-md bg-white px-2 py-0.5 font-medium border border-slate-200 text-slate-700">
                    Last &larr; <strong className="text-cyan-700">{preview.mapping.lastNameCol}</strong>
                  </span>
                )}
                {preview.mapping.phoneCol && (
                  <span className="rounded-md bg-white px-2 py-0.5 font-medium border border-slate-200 text-slate-700">
                    Phone &larr; <strong className="text-cyan-700">{preview.mapping.phoneCol}</strong>
                  </span>
                )}
                {preview.mapping.emailCol && (
                  <span className="rounded-md bg-white px-2 py-0.5 font-medium border border-slate-200 text-slate-700">
                    Email &larr; <strong className="text-cyan-700">{preview.mapping.emailCol}</strong>
                  </span>
                )}
                {preview.mapping.addressCol && (
                  <span className="rounded-md bg-white px-2 py-0.5 font-medium border border-slate-200 text-slate-700">
                    Address &larr; <strong className="text-cyan-700">{preview.mapping.addressCol}</strong>
                  </span>
                )}
                {preview.mapping.notesCol && (
                  <span className="rounded-md bg-white px-2 py-0.5 font-medium border border-slate-200 text-slate-700">
                    Notes &larr; <strong className="text-cyan-700">{preview.mapping.notesCol}</strong>
                  </span>
                )}
              </div>

              {/* Preview Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs" data-testid="csv-preview-table">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-16">Row</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Address</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.leads.map((lead) => {
                        const isValid = lead.status === "valid"
                        const isDup = lead.status === "duplicate"
                        return (
                          <tr
                            key={lead.rowNumber}
                            className={cn(
                              "transition-colors",
                              isValid
                                ? "bg-white hover:bg-slate-50"
                                : isDup
                                  ? "bg-amber-50/40 hover:bg-amber-50/70"
                                  : "bg-slate-50/60 hover:bg-slate-100/60 opacity-70",
                            )}
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                              #{lead.rowNumber}
                            </td>
                            <td className="py-2 px-3">
                              {isValid && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                  <CheckCircle2 className="size-3" />
                                  Ready
                                </span>
                              )}
                              {isDup && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                                  title={lead.duplicateReason}
                                >
                                  <AlertTriangle className="size-3" />
                                  Duplicate
                                </span>
                              )}
                              {lead.status === "invalid" && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                                  title={lead.invalidReason}
                                >
                                  <X className="size-3" />
                                  Invalid
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900 truncate max-w-[140px]">
                              {lead.name || <span className="text-slate-400 italic">Missing</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-[120px]">
                              {lead.phone || "—"}
                            </td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                              {lead.email || "—"}
                            </td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                              {lead.address || "—"}
                            </td>
                            <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]">
                              {lead.notes || "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETE */}
          {step === "complete" && (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Leads Successfully Imported!</h3>
                <p className="mt-1 text-sm text-slate-600">
                  New leads have been added to your Sales Pipeline under Cold Leads.
                </p>
              </div>

              {/* Result Counts Breakdown */}
              <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Successfully Imported:</span>
                  <span className="font-bold text-emerald-700" data-testid="result-imported-count">
                    {importStats.imported} leads
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Skipped (Duplicates):</span>
                  <span className="font-bold text-amber-700" data-testid="result-skipped-count">
                    {importStats.skipped} leads
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Skipped (Invalid/Incomplete):</span>
                  <span className="font-bold text-slate-700" data-testid="result-failed-count">
                    {importStats.failed} rows
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                  <span>Total Processed:</span>
                  <span data-testid="result-total-count">{importStats.total} rows</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-3 flex items-center justify-between">
          {step === "upload" && (
            <div className="flex w-full justify-end">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}

          {step === "preview" && (
            <>
              <Button type="button" variant="ghost" onClick={reset} className="text-xs">
                Back (Choose another file)
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  data-testid="confirm-import-leads"
                  disabled={!preview || preview.validCount === 0}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                  onClick={handleConfirmImport}
                >
                  Import {preview?.validCount ?? 0} Leads
                </Button>
              </div>
            </>
          )}

          {step === "complete" && (
            <div className="flex w-full justify-end">
              <Button
                type="button"
                data-testid="close-import-dialog"
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => handleOpenChange(false)}
              >
                View in Pipeline
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
