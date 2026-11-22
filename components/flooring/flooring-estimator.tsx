"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useMemo, useEffect, useRef } from "react"
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ShoppingBag,
  Calculator,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Percent,
  DollarSign,
  Maximize2,
  Scissors,
  Hammer,
  Printer,
  CopyCheck,
  Send,
  Share2,
  Eye,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { confirmEstimateSavedOnServer, flushBook, useScope } from "@/lib/data/store"
import { runSendEstimateWorkflow } from "@/lib/proposals/send-workflow"
import { ClientField } from "@/components/estimator/client-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { money, moneyExact } from "@/lib/format"
import { formatFeetInches, toDecimalFeet } from "@/lib/estimate/dimensions"
import type {
  FlooringAssemblyTemplate,
  FlooringDeduction,
  FlooringMaterialType,
  FlooringRoom,
  FlooringScope,
} from "@/lib/estimate/multi-trade-types"
import {
  FLOORING_ASSEMBLY_TEMPLATES,
  FLOORING_DEFAULT_SPECS,
  FLOORING_MATERIAL_LABELS,
  createBlankFlooringRoom,
  createBlankFlooringScope,
} from "@/lib/flooring/defaults"
import { calculateFlooringQuote, recomputeRoomGeometry } from "@/lib/flooring/calculate"
import { cn } from "@/lib/utils"

export function FlooringEstimator({
  initialScope,
  estimateId,
  clientName,
  onSaveScope,
}: {
  initialScope?: FlooringScope
  estimateId?: string
  clientName?: string
  onSaveScope?: (scope: FlooringScope) => void
}) {
  const router = useRouter()
  const { clients, stages, estimates, productionRates, estimateSettings, saveEstimate, placeOnColumn, moveStage } = useScope()

  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(estimateId || null)
  const [scope, setScope] = useState<FlooringScope>(() => initialScope || createBlankFlooringScope())
  const [activeTab, setActiveTab] = useState<"takeoff" | "buylist" | "templates">("takeoff")
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(
    () => scope.rooms[0]?.id || null
  )
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string>(clientName || "")
  const [customerEmail, setCustomerEmail] = useState<string>("")
  const [customerPhone, setCustomerPhone] = useState<string>("")
  const [projectTitle, setProjectTitle] = useState<string>("Flooring Project")
  const [jobAddress, setJobAddress] = useState<string>("")
  const [publicToken, setPublicToken] = useState<string>("")
  const [saving, setSaving] = useState<boolean>(false)
  const [sending, setSending] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  const quote = useMemo(() => calculateFlooringQuote(scope), [scope])

  // Propagate scope changes to parent when provided
  useEffect(() => {
    if (onSaveScope) onSaveScope(scope)
  }, [scope, onSaveScope])

  // Reopen existing estimate when estimateId is provided
  useEffect(() => {
    if (!estimateId || estimates.length === 0) return
    const existing = estimates.find((e) => e.id === estimateId)
    if (existing) {
      setCurrentEstimateId(existing.id)
      if (existing.flooringScope) {
        setScope(existing.flooringScope)
        if (existing.flooringScope.rooms.length > 0) {
          setExpandedRoomId(existing.flooringScope.rooms[0].id)
        }
      }
      if (existing.title) setProjectTitle(existing.title)
      if (existing.jobAddress) setJobAddress(existing.jobAddress)
      if (existing.publicToken) setPublicToken(existing.publicToken)
      if (existing.clientId) {
        setSelectedClientId(existing.clientId)
        const client = clients.find((c) => c.id === existing.clientId)
        if (client) {
          setCustomerName(client.name || "")
          setCustomerEmail(client.email || "")
          setCustomerPhone(client.phone || "")
        }
      }
    }
  }, [estimateId, estimates, clients])

  function updateRoom(roomId: string, patch: Partial<FlooringRoom>) {
    setScope((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id !== roomId) return r
        const updated = { ...r, ...patch }
        return recomputeRoomGeometry(updated)
      }),
    }))
  }

  function addRoom() {
    const newRoom = createBlankFlooringRoom(`Room ${scope.rooms.length + 1}`)
    setScope((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }))
    setExpandedRoomId(newRoom.id)
  }

  function duplicateRoom(room: FlooringRoom) {
    const dup: FlooringRoom = {
      ...room,
      id: `fl-room-${Math.random().toString(36).slice(2, 9)}`,
      name: `${room.name} (Copy)`,
    }
    setScope((prev) => ({
      ...prev,
      rooms: [...prev.rooms, dup],
    }))
    setExpandedRoomId(dup.id)
  }

  function deleteRoom(roomId: string) {
    if (scope.rooms.length <= 1) return
    setScope((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== roomId),
    }))
  }

  function applyAssemblyTemplate(roomId: string, template: FlooringAssemblyTemplate) {
    updateRoom(roomId, {
      materialType: template.materialType,
      materialName: template.name,
      sqFtPerBox: template.sqFtPerBox,
      wastePercent: template.wastePercent,
      materialCostPerSqFt: template.materialCostPerSqFt,
      installCostPerSqFt: template.installCostPerSqFt,
      underlaymentType: template.underlaymentType,
      underlaymentCostPerSqFt: template.underlaymentCostPerSqFt,
      removeExistingType: template.removeExistingType,
      removeCostPerSqFt: template.removeCostPerSqFt,
      subfloorPrepType: template.subfloorPrepType,
      subfloorCostPerSqFt: template.subfloorCostPerSqFt,
      includeBaseboard: template.includeBaseboard,
      baseboardCostPerFt: template.baseboardCostPerFt,
      includeQuarterRound: template.includeQuarterRound,
      quarterRoundCostPerFt: template.quarterRoundCostPerFt,
    })
  }

  function addDeduction(roomId: string) {
    const newDed: FlooringDeduction = {
      id: `ded-${Math.random().toString(36).slice(2, 7)}`,
      name: "Kitchen Island",
      length: { feet: 5, inches: 0 },
      width: { feet: 3, inches: 0 },
      sqFt: 15,
    }
    const room = scope.rooms.find((r) => r.id === roomId)
    if (!room) return
    updateRoom(roomId, {
      deductions: [...room.deductions, newDed],
    })
  }

  function removeDeduction(roomId: string, dedId: string) {
    const room = scope.rooms.find((r) => r.id === roomId)
    if (!room) return
    updateRoom(roomId, {
      deductions: room.deductions.filter((d) => d.id !== dedId),
    })
  }

  function persistProject(targetStatus: "draft" | "sent" = "draft") {
    const existing = currentEstimateId ? estimates.find((e) => e.id === currentEstimateId) : null
    const client = clients.find((c) => c.id === selectedClientId)
    const lead = stages.find((s) => s.slug === "lead") || stages[0]
    const effectiveClientId = selectedClientId || (client ? client.id : null)

    const saved = saveEstimate({
      id: currentEstimateId,
      clientId: effectiveClientId,
      clientName: customerName.trim() || client?.name || "Customer",
      clientEmail: customerEmail.trim() || client?.email || "",
      clientPhone: customerPhone.trim() || client?.phone || "",
      stageId: existing?.stageId || lead?.id || "",
      title: projectTitle.trim() || "Flooring Installation",
      jobAddress: jobAddress.trim() || existing?.jobAddress || "",
      trades: ["flooring"],
      primaryTrade: "flooring",
      flooringScope: scope,
      estimateKind: "interior",
      areas: existing?.areas || [],
      lineItems: existing?.lineItems || [],
      rates: existing?.rates || productionRates,
      settings: existing?.settings || estimateSettings,
      scheduledOn: existing?.scheduledOn ?? null,
      notes: existing?.notes || "",
      crewNote: existing?.crewNote || "",
      acceptedAt: existing?.acceptedAt ?? null,
      publicToken: existing?.publicToken || publicToken || "",
      clientStatus: targetStatus === "sent" ? "sent" : (existing?.clientStatus || "draft"),
      signature: existing?.signature || null,
      paymentStatus: existing?.paymentStatus || "unpaid",
      depositReceipt: existing?.depositReceipt || null,
      createdAt: existing?.createdAt || null,
    })

    setCurrentEstimateId(saved.id)
    setSelectedClientId(saved.clientId)
    setPublicToken(saved.publicToken)
    return saved
  }

  async function handleSaveDraft() {
    if (saving || sending) return
    setSaving(true)
    setFeedback(null)
    try {
      const saved = persistProject("draft")
      const confirmed = await confirmEstimateSavedOnServer(saved.id)
      if (!confirmed.ok) {
        setFeedback({ tone: "error", text: confirmed.reason })
        return
      }
      setFeedback({ tone: "success", text: "Flooring estimate draft saved to CRM!" })
      if (!estimateId && typeof window !== "undefined") {
        window.history.replaceState(null, "", `/estimates/${saved.id}`)
      }
    } catch {
      setFeedback({ tone: "error", text: "Could not save estimate draft. Check your network." })
    } finally {
      setSaving(false)
    }
  }

  async function handlePreviewProposal() {
    if (saving || sending) return
    setSaving(true)
    setFeedback(null)
    try {
      const saved = persistProject()
      await confirmEstimateSavedOnServer(saved.id)
      router.push(`/proposal/${saved.id}`)
    } catch {
      if (currentEstimateId) router.push(`/proposal/${currentEstimateId}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendProposal() {
    if (sending || saving) return
    const email = customerEmail.trim()
    if (!email.includes("@") || /\s/.test(email)) {
      setFeedback({
        tone: "error",
        text: "Please enter a valid customer email address before sending the proposal.",
      })
      return
    }

    setSending(true)
    setFeedback(null)
    try {
      const result = await runSendEstimateWorkflow({
        persistLocal: () => persistProject("sent"),
        confirmServerSave: confirmEstimateSavedOnServer,
        onConfirmedSave: (saved) => {
          if (!estimateId && typeof window !== "undefined") {
            window.history.replaceState(null, "", `/estimates/${saved.id}`)
          }
        },
        sendEmail: async (saved) => {
          try {
            const res = await fetch(`/api/proposals/${saved.id}/email`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                email,
                clientName: customerName.trim() || "Customer",
              }),
            })
            const body = (await res.json().catch(() => null)) as {
              detail?: string
              reason?: string
              delivery?: string
            } | null
            if (!res.ok || body?.delivery !== "sent") {
              return {
                ok: false,
                reason: body?.reason || body?.detail || "The proposal email could not be delivered.",
              }
            }
            return {
              ok: true,
              message: "Proposal sent! The customer can review, sign, and accept online.",
            }
          } catch {
            return { ok: false, reason: "The proposal could not be emailed." }
          }
        },
        onSentSuccess: async (saved) => {
          const sentStage = stages.find((item) => item.slug === "estimate_sent")
          if (sentStage) {
            moveStage(saved.id, sentStage.id)
          }
          placeOnColumn(saved.id, "proposal_sent")
          await flushBook()
        },
      })

      if (!result.ok) {
        setFeedback({ tone: "error", text: result.reason })
      } else {
        setFeedback({ tone: "success", text: result.message })
      }
    } finally {
      setSending(false)
    }
  }

  async function handleCopyShareLink() {
    try {
      const saved = persistProject()
      const token = saved.publicToken || publicToken
      const link = `${window.location.origin}/p/${token}`
      await navigator.clipboard.writeText(link)
      setFeedback({ tone: "success", text: "Customer proposal link copied to clipboard!" })
    } catch {
      setFeedback({ tone: "error", text: "Could not copy link." })
    }
  }

  function handleDuplicateProject() {
    const client = clients.find((c) => c.id === selectedClientId)
    const lead = stages.find((s) => s.slug === "lead") || stages[0]
    const created = saveEstimate({
      id: null,
      clientId: selectedClientId || null,
      clientName: customerName.trim() || client?.name || "",
      clientEmail: customerEmail.trim() || client?.email || "",
      clientPhone: customerPhone.trim() || client?.phone || "",
      stageId: lead?.id || "",
      title: `${projectTitle} (Copy)`,
      jobAddress,
      trades: ["flooring"],
      primaryTrade: "flooring",
      flooringScope: scope,
      estimateKind: "interior",
      areas: [],
      lineItems: [],
      rates: productionRates,
      settings: estimateSettings,
      scheduledOn: null,
      notes: "",
      crewNote: "",
      acceptedAt: null,
      publicToken: "",
      clientStatus: "draft",
      signature: null,
      paymentStatus: "unpaid",
      depositReceipt: null,
      createdAt: null,
    })
    setFeedback({ tone: "success", text: "Flooring estimate duplicated as a new draft!" })
    if (created?.id) {
      router.push(`/flooring?id=${created.id}`)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
              <Layers className="size-3.5" /> Flooring Estimator
            </span>
            <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">
              ← Jobs &amp; Estimates
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            {projectTitle || "Flooring Takeoff & Pricing"}
          </h1>
          <p className="text-xs text-slate-500">
            Professional box quantities, underlayment, transitions, subfloor prep, proposals, and material buy-lists.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2" data-testid="flooring-top-actions">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || sending}
            data-testid="flooring-save-draft"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 text-slate-500" />}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handlePreviewProposal}
            disabled={saving || sending}
            data-testid="flooring-preview-proposal"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <Eye className="size-3.5" />
            <span>Preview Proposal</span>
          </button>

          <button
            type="button"
            onClick={handleSendProposal}
            disabled={saving || sending}
            data-testid="flooring-send-proposal"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            <span>Send to Customer</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            data-testid="flooring-copy-link"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            title="Copy shareable customer proposal link"
          >
            <Share2 className="size-3.5 text-slate-500" />
            <span className="hidden sm:inline">Share Link</span>
          </button>

          {currentEstimateId && (
            <Link
              href={`/estimates/${currentEstimateId}/store-list`}
              data-testid="flooring-store-list-link"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title="View material buy-list"
            >
              <ShoppingBag className="size-3.5 text-slate-500" />
              <span className="hidden sm:inline">Store List</span>
            </Link>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          data-testid="flooring-feedback-banner"
          className={cn(
            "flex items-center gap-2 rounded-xl p-3 text-xs font-semibold transition-all animate-in fade-in",
            feedback.tone === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-red-50 border border-red-200 text-red-900"
          )}
        >
          {feedback.tone === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="size-4 text-red-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Customer & Jobsite Details Card */}
      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4"
        data-testid="flooring-customer-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <User className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900">Customer &amp; Jobsite Details</h2>
          </div>
          <span className="text-xs text-slate-500">
            {selectedClientId
              ? "Saved Customer in CRM"
              : customerName.trim()
              ? "New Customer (auto-creates on save)"
              : "Enter or select customer below"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <ClientField
              clients={clients}
              name={customerName}
              clientId={selectedClientId}
              onChange={(next) => {
                setCustomerName(next.name)
                setSelectedClientId(next.clientId)
                const picked = clients.find((c) => c.id === next.clientId)
                if (picked) {
                  if (picked.email) setCustomerEmail(picked.email)
                  if (picked.phone) setCustomerPhone(picked.phone)
                  if (picked.address) setJobAddress(picked.address)
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flooring-customer-email" className="text-xs font-semibold text-slate-700">
              Customer Email
            </Label>
            <Input
              id="flooring-customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="client@example.com"
              className="h-12 text-sm"
            />
            <p className="text-[11px] text-slate-400">Proposal link and contract sent here</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flooring-customer-phone" className="text-xs font-semibold text-slate-700">
              Customer Phone
            </Label>
            <Input
              id="flooring-customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="h-12 text-sm"
            />
            <p className="text-[11px] text-slate-400">Contact number for crew &amp; updates</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flooring-job-address" className="text-xs font-semibold text-slate-700">
              Jobsite Address
            </Label>
            <Input
              id="flooring-job-address"
              value={jobAddress}
              onChange={(e) => setJobAddress(e.target.value)}
              placeholder="123 Maple St, Seattle, WA"
              className="h-12 text-sm"
            />
            <p className="text-[11px] text-slate-400">Printed on proposal and work order</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <Label htmlFor="flooring-project-title" className="text-xs font-semibold text-slate-700">
              Project Title
            </Label>
            <Input
              id="flooring-project-title"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. Main Floor Luxury Vinyl Plank"
              className="h-10 text-sm font-medium"
            />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("takeoff")}
          data-testid="tab-flooring-takeoff"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "takeoff"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <Calculator className="size-3.5" />
          <span>Room Takeoff ({scope.rooms.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("buylist")}
          data-testid="tab-flooring-buylist"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "buylist"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60"
          )}
        >
          <ShoppingBag className="size-3.5" />
          <span>Material Buy-List ({quote.buyList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          data-testid="tab-flooring-templates"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "templates"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60"
          )}
        >
          <Sparkles className="size-3.5" />
          <span>Assemblies &amp; Templates</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Room Takeoff or Buy-List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {activeTab === "takeoff" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Rooms &amp; Measurement Areas
                </h2>
                <button
                  type="button"
                  onClick={addRoom}
                  data-testid="add-flooring-room"
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <Plus className="size-3.5" /> Add Room
                </button>
              </div>

              {scope.rooms.map((room, index) => {
                const isExpanded = expandedRoomId === room.id
                return (
                  <div
                    key={room.id}
                    data-testid={`flooring-room-card-${room.id}`}
                    className="rounded-2xl border border-slate-200 bg-white shadow-xs transition-all overflow-hidden"
                  >
                    {/* Room Card Header */}
                    <div
                      onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/70 border-b border-slate-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{room.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatFeetInches(room.length)} × {formatFeetInches(room.width)} ·{" "}
                            <span className="font-semibold text-slate-800">{room.netSqFt} sq ft net</span> ·{" "}
                            <span className="text-blue-700 font-medium">
                              {FLOORING_MATERIAL_LABELS[room.materialType]}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => duplicateRoom(room)}
                          title="Duplicate room"
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        {scope.rooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteRoom(room.id)}
                            title="Delete room"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-800"
                        >
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Room Card Body */}
                    {isExpanded && (
                      <div className="p-4 flex flex-col gap-5 bg-slate-50/30">
                        {/* Name and Measurements */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Room Name</label>
                            <input
                              type="text"
                              value={room.name}
                              onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Length (Ft &amp; In)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={room.length.feet}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    length: { ...room.length, feet: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">ft</span>
                              <input
                                type="number"
                                min={0}
                                max={11}
                                value={room.length.inches}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    length: { ...room.length, inches: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">in</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Width (Ft &amp; In)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={room.width.feet}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    width: { ...room.width, feet: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">ft</span>
                              <input
                                type="number"
                                min={0}
                                max={11}
                                value={room.width.inches}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    width: { ...room.width, inches: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">in</span>
                            </div>
                          </div>
                        </div>

                        {/* Deductions & Irregular Shapes */}
                        <div className="border border-slate-200 bg-white rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <Scissors className="size-3 text-slate-500" /> Deductions (Islands, Fireplaces, Stairwells)
                            </span>
                            <button
                              type="button"
                              onClick={() => addDeduction(room.id)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              + Add Deduction
                            </button>
                          </div>
                          {room.deductions.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No deductions in this room.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {room.deductions.map((ded) => {
                                const dSqFt = Number((toDecimalFeet(ded.length) * toDecimalFeet(ded.width)).toFixed(1))
                                return (
                                  <div key={ded.id} className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-lg text-xs border border-slate-100">
                                    <input
                                      type="text"
                                      value={ded.name}
                                      onChange={(e) => {
                                        const updatedDeds = room.deductions.map((d) =>
                                          d.id === ded.id ? { ...d, name: e.target.value } : d
                                        )
                                        updateRoom(room.id, { deductions: updatedDeds })
                                      }}
                                      placeholder="Deduction label"
                                      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium flex-1 min-w-[120px]"
                                    />
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500 font-semibold text-[11px]">L:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={ded.length.feet}
                                        onChange={(e) => {
                                          const feet = Math.max(0, parseInt(e.target.value || "0", 10))
                                          const newLen = { ...ded.length, feet }
                                          const sqFt = Number((toDecimalFeet(newLen) * toDecimalFeet(ded.width)).toFixed(2))
                                          const updatedDeds = room.deductions.map((d) =>
                                            d.id === ded.id ? { ...d, length: newLen, sqFt } : d
                                          )
                                          updateRoom(room.id, { deductions: updatedDeds })
                                        }}
                                        className="h-8 w-11 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold"
                                      />
                                      <span className="text-slate-400 font-medium">ft</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="11"
                                        value={ded.length.inches}
                                        onChange={(e) => {
                                          const inches = Math.max(0, Math.min(11, parseInt(e.target.value || "0", 10)))
                                          const newLen = { ...ded.length, inches }
                                          const sqFt = Number((toDecimalFeet(newLen) * toDecimalFeet(ded.width)).toFixed(2))
                                          const updatedDeds = room.deductions.map((d) =>
                                            d.id === ded.id ? { ...d, length: newLen, sqFt } : d
                                          )
                                          updateRoom(room.id, { deductions: updatedDeds })
                                        }}
                                        className="h-8 w-11 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold"
                                      />
                                      <span className="text-slate-400 font-medium">in</span>
                                    </div>
                                    <span className="text-slate-300 font-bold">×</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500 font-semibold text-[11px]">W:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={ded.width.feet}
                                        onChange={(e) => {
                                          const feet = Math.max(0, parseInt(e.target.value || "0", 10))
                                          const newWidth = { ...ded.width, feet }
                                          const sqFt = Number((toDecimalFeet(ded.length) * toDecimalFeet(newWidth)).toFixed(2))
                                          const updatedDeds = room.deductions.map((d) =>
                                            d.id === ded.id ? { ...d, width: newWidth, sqFt } : d
                                          )
                                          updateRoom(room.id, { deductions: updatedDeds })
                                        }}
                                        className="h-8 w-11 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold"
                                      />
                                      <span className="text-slate-400 font-medium">ft</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="11"
                                        value={ded.width.inches}
                                        onChange={(e) => {
                                          const inches = Math.max(0, Math.min(11, parseInt(e.target.value || "0", 10)))
                                          const newWidth = { ...ded.width, inches }
                                          const sqFt = Number((toDecimalFeet(ded.length) * toDecimalFeet(newWidth)).toFixed(2))
                                          const updatedDeds = room.deductions.map((d) =>
                                            d.id === ded.id ? { ...d, width: newWidth, sqFt } : d
                                          )
                                          updateRoom(room.id, { deductions: updatedDeds })
                                        }}
                                        className="h-8 w-11 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold"
                                      />
                                      <span className="text-slate-400 font-medium">in</span>
                                    </div>
                                    <span className="text-slate-500 font-semibold bg-white border border-slate-200 px-2 py-1 rounded-md text-[11px]">
                                      -{dSqFt} sq ft
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeDeduction(room.id, ded.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-auto"
                                      title="Remove deduction"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Flooring Material Specifications */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Flooring Type</label>
                            <select
                              value={room.materialType}
                              onChange={(e) => {
                                const type = e.target.value as FlooringMaterialType
                                const spec = FLOORING_DEFAULT_SPECS[type] || FLOORING_DEFAULT_SPECS.lvp
                                updateRoom(room.id, {
                                  materialType: type,
                                  materialName: FLOORING_MATERIAL_LABELS[type],
                                  sqFtPerBox: spec.sqFtPerBox,
                                  wastePercent: spec.wastePercent,
                                  materialCostPerSqFt: spec.materialCostPerSqFt,
                                  installCostPerSqFt: spec.installCostPerSqFt,
                                })
                              }}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium"
                            >
                              {Object.entries(FLOORING_MATERIAL_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Box / Carton Coverage (sq ft)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={room.sqFtPerBox}
                              onChange={(e) => updateRoom(room.id, { sqFtPerBox: parseFloat(e.target.value || "20") })}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Waste Factor %</label>
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={room.wastePercent}
                              onChange={(e) =>
                                updateRoom(room.id, { wastePercent: parseInt(e.target.value || "10", 10) })
                              }
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                            />
                          </div>
                        </div>

                        {/* Pricing per Sq Ft */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Material Cost ($/sq ft)
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              value={room.materialCostPerSqFt}
                              onChange={(e) =>
                                updateRoom(room.id, { materialCostPerSqFt: parseFloat(e.target.value || "0") })
                              }
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Installation Labor ($/sq ft)
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              value={room.installCostPerSqFt}
                              onChange={(e) =>
                                updateRoom(room.id, { installCostPerSqFt: parseFloat(e.target.value || "0") })
                              }
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        {/* Underlayment, Demo, Prep & Trim Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Underlayment</label>
                            <select
                              value={room.underlaymentType}
                              onChange={(e) =>
                                updateRoom(room.id, {
                                  underlaymentType: e.target.value as any,
                                  underlaymentCostPerSqFt:
                                    e.target.value === "none"
                                      ? 0
                                      : e.target.value === "cement_backer"
                                      ? 1.25
                                      : e.target.value === "cork"
                                      ? 0.75
                                      : 0.45,
                                })
                              }
                              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
                            >
                              <option value="none">None / Attached Pad</option>
                              <option value="foam_2mm">2mm Standard Foam ($0.35/sf)</option>
                              <option value="moisture_barrier">Sound &amp; Moisture Barrier ($0.45/sf)</option>
                              <option value="cork">Acoustical Cork ($0.75/sf)</option>
                              <option value="cement_backer">Cement Backerboard for Tile ($1.25/sf)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Remove Existing Floor
                            </label>
                            <select
                              value={room.removeExistingType}
                              onChange={(e) =>
                                updateRoom(room.id, {
                                  removeExistingType: e.target.value as any,
                                  removeCostPerSqFt:
                                    e.target.value === "none"
                                      ? 0
                                      : e.target.value === "tile"
                                      ? 2.5
                                      : e.target.value === "hardwood"
                                      ? 1.75
                                      : 0.5,
                                })
                              }
                              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
                            >
                              <option value="none">None (Bare Subfloor)</option>
                              <option value="carpet_pad">Tear out Carpet &amp; Pad ($0.50/sf)</option>
                              <option value="tile">Demo Ceramic / Porcelain Tile ($2.50/sf)</option>
                              <option value="hardwood">Remove Hardwood ($1.75/sf)</option>
                              <option value="vinyl">Remove Sheet Vinyl ($0.65/sf)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Subfloor Prep &amp; Leveling
                            </label>
                            <select
                              value={room.subfloorPrepType}
                              onChange={(e) =>
                                updateRoom(room.id, {
                                  subfloorPrepType: e.target.value as any,
                                  subfloorCostPerSqFt:
                                    e.target.value === "none"
                                      ? 0
                                      : e.target.value === "self_leveler"
                                      ? 0.85
                                      : 0.35,
                                })
                              }
                              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
                            >
                              <option value="none">None (Level &amp; Ready)</option>
                              <option value="patch">Fast-Set Patch ($0.35/sf)</option>
                              <option value="self_leveler">Self-Leveling Compound ($0.85/sf)</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-4 pt-4">
                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={room.includeQuarterRound}
                                onChange={(e) => updateRoom(room.id, { includeQuarterRound: e.target.checked })}
                                className="rounded text-blue-600 size-4"
                              />
                              <span>Quarter Round / Shoe ({room.perimeterFt} ft)</span>
                            </label>

                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={room.includeBaseboard}
                                onChange={(e) => updateRoom(room.id, { includeBaseboard: e.target.checked })}
                                className="rounded text-blue-600 size-4"
                              />
                              <span>Baseboards ({room.perimeterFt} ft)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === "buylist" && (
            <div className="flex flex-col gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Automatic Material Buy-List</h2>
                  <p className="text-xs text-slate-500">
                    Exact purchasing units calculated with waste allowances for ordering from suppliers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    {quote.buyList.length} line items
                  </span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Printer className="size-3.5 text-slate-500" />
                    <span>Print Buy-List</span>
                  </button>
                </div>
              </div>

              {quote.buyList.length === 0 ? (
                <p className="text-sm text-slate-500 italic p-6 text-center">No materials calculated yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-semibold">Category</th>
                        <th className="py-2.5 font-semibold">Item &amp; Spec</th>
                        <th className="py-2.5 font-semibold text-right">Estimated</th>
                        <th className="py-2.5 font-semibold text-right">Order Quantity</th>
                        <th className="py-2.5 font-semibold text-right">Unit Cost</th>
                        <th className="py-2.5 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quote.buyList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 font-medium capitalize text-slate-600">{item.category}</td>
                          <td className="py-2 font-bold text-slate-900">{item.label}</td>
                          <td className="py-2 text-right text-slate-500">{item.estimatedQuantity}</td>
                          <td className="py-2 text-right font-bold text-blue-700">
                            {item.purchasingQuantity} {item.unit}
                          </td>
                          <td className="py-2 text-right text-slate-600">{moneyExact(item.unitCost)}</td>
                          <td className="py-2 text-right font-bold text-slate-900">{moneyExact(item.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "templates" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Pre-Built Flooring Assemblies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FLOORING_ASSEMBLY_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="border border-slate-200 bg-white rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{tmpl.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{tmpl.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1 text-[11px] font-medium text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          Material: {moneyExact(tmpl.materialCostPerSqFt)}/sf
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          Labor: {moneyExact(tmpl.installCostPerSqFt)}/sf
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedRoomId) applyAssemblyTemplate(expandedRoomId, tmpl)
                        setActiveTab("takeoff")
                      }}
                      className="w-full rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 text-xs font-bold transition-colors"
                    >
                      Apply to Active Room
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Live Pricing Summary */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs sticky top-20 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Pricing &amp; Project Summary</span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {quote.netSqFt.toLocaleString()} sq ft
              </span>
            </h2>

            {/* Metrics Breakdown */}
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Net Floor Area:</span>
                <span className="font-bold text-slate-900">{quote.netSqFt.toLocaleString()} sq ft</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Gross Area w/ Waste:</span>
                <span className="font-bold text-slate-900">{quote.grossSqFt.toLocaleString()} sq ft</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Flooring Cartons / Boxes:</span>
                <span className="font-bold text-blue-700">{quote.totalBoxes} boxes</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Flooring Materials:</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.materialCost)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Installation Labor:</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.laborCost)}</span>
              </div>
              {quote.demoCost > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Tear-Out &amp; Demo:</span>
                  <span className="font-bold text-slate-900">{moneyExact(quote.demoCost)}</span>
                </div>
              )}
              {quote.prepCost > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Subfloor Prep / Patch:</span>
                  <span className="font-bold text-slate-900">{moneyExact(quote.prepCost)}</span>
                </div>
              )}
              {quote.trimCost > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Trim &amp; Baseboards:</span>
                  <span className="font-bold text-slate-900">{moneyExact(quote.trimCost)}</span>
                </div>
              )}
              {quote.transitionsCost > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Transitions / Moldings:</span>
                  <span className="font-bold text-slate-900">{moneyExact(quote.transitionsCost)}</span>
                </div>
              )}
              {quote.dumpsterFee > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Dumpster &amp; Haul Away:</span>
                  <span className="font-bold text-slate-900">{moneyExact(quote.dumpsterFee)}</span>
                </div>
              )}
            </div>

            {/* Overhead & Profit Settings */}
            <div className="border-t border-slate-200 pt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-600 font-medium">Overhead %:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={scope.overheadPercent}
                    onChange={(e) =>
                      setScope((prev) => ({
                        ...prev,
                        overheadPercent: Math.max(0, parseFloat(e.target.value) || 0),
                      }))
                    }
                    className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1.5 text-right text-xs font-bold text-slate-800"
                  />
                  <span className="text-slate-400 font-semibold">%</span>
                  <span className="font-bold text-slate-900 w-16 text-right">{moneyExact(quote.overhead)}</span>
                </div>
              </div>

              {/* Profit Mode Selector: Margin vs Markup */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-semibold">Profit Pricing Mode:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setScope((prev) => ({ ...prev, profitMode: "margin" }))}
                      className={cn(
                        "rounded-md px-2 py-0.5 transition-colors",
                        (scope.profitMode ?? "margin") === "margin"
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Margin %
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope((prev) => ({ ...prev, profitMode: "markup" }))}
                      className={cn(
                        "rounded-md px-2 py-0.5 transition-colors",
                        scope.profitMode === "markup"
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Markup %
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600 font-medium">
                    {(scope.profitMode ?? "margin") === "margin" ? "Target Profit Margin:" : "Cost Markup:"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="95"
                      step="0.5"
                      value={scope.profitPercent}
                      onChange={(e) =>
                        setScope((prev) => ({
                          ...prev,
                          profitPercent: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1.5 text-right text-xs font-bold text-slate-800"
                    />
                    <span className="text-slate-400 font-semibold">%</span>
                    <span className="font-bold text-slate-900 w-16 text-right">{moneyExact(quote.profit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 mt-1">
                  <span>Effective Margin: <strong className="text-slate-800">{quote.effectiveMarginPercent}%</strong></span>
                  <span>Effective Markup: <strong className="text-slate-800">{quote.effectiveMarkupPercent}%</strong></span>
                </div>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="rounded-xl bg-slate-900 text-white p-4 flex items-baseline justify-between shadow-xs">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Price</p>
                <p className="text-2xl font-black font-display tracking-tight text-white">{money(quote.total)}</p>
              </div>
              <span className="text-xs font-semibold text-slate-300">
                {quote.netSqFt > 0 ? `${moneyExact(quote.total / quote.netSqFt)}/sf` : ""}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSendProposal}
                disabled={sending || saving}
                data-testid="flooring-save-action"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                <span>Send Proposal to Customer</span>
              </button>

              <button
                type="button"
                onClick={handlePreviewProposal}
                disabled={sending || saving}
                data-testid="flooring-rail-preview-action"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Eye className="size-3.5" />
                <span>Preview Customer Proposal</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={sending || saving}
                data-testid="flooring-rail-draft-action"
                className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 text-slate-500" />}
                <span>Save Estimate Draft</span>
              </button>

              <button
                type="button"
                onClick={handleCopyShareLink}
                data-testid="flooring-rail-share-action"
                className="w-full py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors text-center flex items-center justify-center gap-1.5"
              >
                <Share2 className="size-3.5 text-slate-500" />
                <span>Copy Shareable Link</span>
              </button>

              {currentEstimateId && (
                <button
                  type="button"
                  onClick={handleDuplicateProject}
                  data-testid="flooring-duplicate-action"
                  className="w-full py-2 rounded-xl border border-dashed border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <CopyCheck className="size-3.5 text-slate-500" />
                  <span>Duplicate as New Estimate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
