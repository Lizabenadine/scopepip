"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  Phone,
  Plus,
  Send,
  Sparkles,
  User,
  Volume2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useScope } from "@/lib/data/store"
import { parseVoiceCommand, type ParsedVoiceResult, type VoiceAction } from "@/lib/voice/voice-parser"
import { executeVoiceAction, type VoiceExecutionContext } from "@/lib/voice/voice-executor"
import type { AreaInput } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
}

function getSpeechRecognitionConstructor(): { new (): SpeechRecognitionInstance } | null {
  if (typeof window === "undefined") return null
  const win = window as unknown as {
    SpeechRecognition?: { new (): SpeechRecognitionInstance }
    webkitSpeechRecognition?: { new (): SpeechRecognitionInstance }
  }
  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

export interface VoiceAssistantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddRoom?: (room: AreaInput) => void
  initialMode?: "general" | "estimator"
}

export function VoiceAssistantModal({
  open,
  onOpenChange,
  onAddRoom,
  initialMode = "general",
}: VoiceAssistantModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { session, clients, estimates, createLead, addEstimateNote, updateClient, scheduleSalesVisit, advanceSalesStage } = useScope()

  const [isSupported, setIsSupported] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [parsedResult, setParsedResult] = useState<ParsedVoiceResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isStoppingRef = useRef(false)

  useEffect(() => {
    const Ctor = getSpeechRecognitionConstructor()
    setIsSupported(Boolean(Ctor))
  }, [])

  // Auto-start listening when modal opens
  useEffect(() => {
    if (open) {
      setTranscript("")
      setParsedResult(null)
      setErrorMessage(null)
      setSuccessMessage(null)
      setIsConfirming(false)
      // Slight delay for smooth dialog transition
      const timer = setTimeout(() => {
        startListening()
      }, 250)
      return () => clearTimeout(timer)
    } else {
      stopListening()
    }
  }, [open])

  function stopListening() {
    isStoppingRef.current = true
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsListening(false)
  }

  function startListening() {
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      setIsSupported(false)
      setErrorMessage("Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
      return
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }

      const recognition = new Ctor()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US"

      isStoppingRef.current = false
      setErrorMessage(null)
      setSuccessMessage(null)

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = ""
        let finalText = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          if (res) {
            const text = res[0]?.transcript || ""
            if (res.isFinal) {
              finalText += (finalText ? " " : "") + text
            } else {
              interimText += (interimText ? " " : "") + text
            }
          }
        }

        const currentSpoken = (finalText || interimText).trim()
        if (currentSpoken) {
          setTranscript(currentSpoken)
          const parsed = parseVoiceCommand(currentSpoken)
          setParsedResult(parsed)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false)
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permissions in your browser settings.")
        } else if (event.error === "no-speech") {
          setErrorMessage("No speech detected. Tap the mic and try speaking again.")
        } else if (event.error === "network") {
          setErrorMessage("Network connection error during voice recognition.")
        } else {
          setErrorMessage(`Voice recognition error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        if (!isStoppingRef.current && transcript) {
          handleVoiceProcessed(transcript)
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setIsListening(false)
      setErrorMessage("Could not access microphone.")
    }
  }

  function handleVoiceProcessed(spokenText: string) {
    const parsed = parseVoiceCommand(spokenText)
    setParsedResult(parsed)

    if (parsed.action.requiresConfirmation) {
      setIsConfirming(true)
    } else {
      executeAction(parsed.action)
    }
  }

  function executeAction(action: VoiceAction) {
    const ctx: VoiceExecutionContext = {
      sessionRole: session?.role,
      clients,
      estimates,
      createLead,
      addEstimateNote,
      updateClient,
      scheduleSalesVisit,
      advanceSalesStage,
      navigate: (href) => {
        startTransition(() => {
          router.push(href)
          onOpenChange(false)
        })
      },
      onAddRoom,
    }

    const result = executeVoiceAction(action, ctx)
    if (result.ok) {
      setSuccessMessage(result.message)
      setIsConfirming(false)
      // Auto-navigate and dismiss on redirect
      if (result.redirect) {
        setTimeout(() => {
          ctx.navigate(result.redirect!)
        }, 800)
      }
    } else {
      setErrorMessage(result.message)
      setIsConfirming(false)
    }
  }

  function handleExampleClick(sampleText: string) {
    setTranscript(sampleText)
    setErrorMessage(null)
    setSuccessMessage(null)
    handleVoiceProcessed(sampleText)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md w-full p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl bg-white"
        data-testid="voice-assistant-modal"
      >
        {/* Header with gradient badge */}
        <div className="bg-gradient-to-r from-[#02182F] via-[#0b2b4d] to-[#02182F] p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
                <Sparkles className="size-4 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white tracking-tight">
                  Scopepipe Voice Assistant
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-200/80">
                  {initialMode === "estimator"
                    ? "Hands-free Walkthrough Estimating"
                    : "Natural language CRM & walkthrough estimating"}
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close voice assistant"
              data-testid="voice-assistant-close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col items-center text-center gap-4">
          {/* Central Mic Button / Waveform */}
          <div className="relative my-2 flex items-center justify-center">
            {isListening && (
              <>
                <div className="absolute size-24 rounded-full bg-rose-500/20 animate-ping" />
                <div className="absolute size-20 rounded-full bg-rose-500/30 animate-pulse" />
              </>
            )}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={cn(
                "relative z-10 flex size-16 items-center justify-center rounded-full shadow-lg transition-all transform active:scale-95",
                isListening
                  ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/30"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30",
              )}
              aria-label={isListening ? "Stop listening" : "Start speaking"}
              data-testid="voice-assistant-mic-toggle"
            >
              {isListening ? (
                <Mic className="size-8 animate-pulse text-white" />
              ) : (
                <Mic className="size-8 text-white" />
              )}
            </button>
          </div>

          <p className="text-xs font-medium text-slate-500">
            {isListening ? (
              <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold">
                <span className="size-2 rounded-full bg-rose-600 animate-pulse" />
                Listening... Speak naturally
              </span>
            ) : (
              "Tap the microphone to speak"
            )}
          </p>

          {/* Real-time Transcription Feedback Box */}
          <div
            className="w-full min-h-[64px] rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-left text-sm transition-all"
            data-testid="voice-assistant-transcript-box"
          >
            {transcript ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Heard:
                </p>
                <p className="font-medium text-slate-800 leading-snug break-words" data-testid="voice-transcript-text">
                  "{transcript}"
                </p>
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs leading-relaxed text-center py-2">
                e.g. "Add living room, 15 by 20, walls and ceiling" or "Create lead John Smith, 503-555-1234"
              </p>
            )}
          </div>

          {/* Safety Confirmation Card (Requirement 8) */}
          {isConfirming && parsedResult?.action && (
            <div
              className="w-full rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-left shadow-sm transition-all"
              data-testid="voice-confirmation-card"
            >
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm mb-2">
                <AlertCircle className="size-4 text-amber-600" />
                <span>Confirm CRM Action</span>
              </div>
              <p className="text-xs text-amber-800 mb-3" data-testid="voice-action-summary">
                {parsedResult.action.summary}
              </p>

              {parsedResult.action.type === "CREATE_LEAD" && (
                <div className="grid grid-cols-2 gap-1.5 text-xs text-amber-950 bg-white/70 rounded-lg p-2.5 mb-3 border border-amber-100">
                  <div>
                    <span className="font-semibold text-slate-500">Name:</span> {parsedResult.action.name}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Phone:</span>{" "}
                    {parsedResult.action.phone || "—"}
                  </div>
                  {parsedResult.action.address && (
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-500">Address:</span>{" "}
                      {parsedResult.action.address}
                    </div>
                  )}
                  {parsedResult.action.service && (
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-500">Service:</span>{" "}
                      {parsedResult.action.service}
                    </div>
                  )}
                </div>
              )}

              {parsedResult.action.type === "ADD_CUSTOMER_NOTE" && (
                <div className="text-xs text-amber-950 bg-white/70 rounded-lg p-2.5 mb-3 border border-amber-100">
                  <span className="font-semibold text-slate-500">Customer:</span>{" "}
                  {parsedResult.action.targetName}
                  <div className="mt-1">
                    <span className="font-semibold text-slate-500">Note:</span> "{parsedResult.action.note}"
                  </div>
                </div>
              )}

              {parsedResult.action.type === "SCHEDULE_APPOINTMENT" && (
                <div className="text-xs text-amber-950 bg-white/70 rounded-lg p-2.5 mb-3 border border-amber-100">
                  <div>
                    <span className="font-semibold text-slate-500">Customer:</span>{" "}
                    {parsedResult.action.clientName}
                  </div>
                  <div className="mt-1">
                    <span className="font-semibold text-slate-500">When:</span>{" "}
                    {parsedResult.action.displayDateTime}
                  </div>
                  {parsedResult.action.address && (
                    <div className="mt-1">
                      <span className="font-semibold text-slate-500">Address:</span>{" "}
                      {parsedResult.action.address}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirming(false)}
                  className="h-8 text-xs font-medium"
                  data-testid="voice-confirm-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => parsedResult && executeAction(parsedResult.action)}
                  className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  data-testid="voice-confirm-apply"
                >
                  <Check className="size-3.5" />
                  Confirm & Apply
                </Button>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-left text-xs text-emerald-900 flex items-start gap-2"
              data-testid="voice-success-message"
            >
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Action Complete</p>
                <p className="mt-0.5 text-emerald-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              className="w-full rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-left text-xs text-rose-900 flex items-start gap-2"
              data-testid="voice-error-message"
            >
              <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Voice Notice</p>
                <p className="mt-0.5 text-rose-800">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Example Voice Commands / Quick Chips */}
          <div className="w-full border-t border-slate-100 pt-3 text-left">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="size-3 text-blue-500" />
              Quick Command Suggestions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Add living room, 15 by 20, walls and ceiling",
                "Create lead John Smith, 503-555-1234, 123 Oak St",
                "Schedule appointment with Sarah Connor tomorrow at 2 PM",
                "Add note to John Smith: wants satin finish on trim",
                "Go to sales pipeline",
                "Generate paint material list",
              ].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => handleExampleClick(cmd)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors text-left"
                  data-testid="voice-suggestion-chip"
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Universal Microphone Button to trigger the Voice Assistant modal.
 */
export function VoiceAssistantButton({
  className,
  variant = "outline",
  size = "sm",
  label = "Voice",
  initialMode = "general",
  onAddRoom,
  testId = "voice-assistant-button",
}: {
  className?: string
  variant?: "outline" | "default" | "secondary" | "ghost"
  size?: "sm" | "default" | "lg"
  label?: string
  initialMode?: "general" | "estimator"
  onAddRoom?: (room: AreaInput) => void
  testId?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn(
          "gap-1.5 font-medium transition-all",
          className,
        )}
        data-testid={testId}
        title="Open Scopepipe Voice Assistant"
        aria-label="Open Scopepipe Voice Assistant"
      >
        <Mic className="size-4 text-blue-600 animate-pulse" />
        {label ? <span>{label}</span> : null}
      </Button>

      <VoiceAssistantModal
        open={open}
        onOpenChange={setOpen}
        onAddRoom={onAddRoom}
        initialMode={initialMode}
      />
    </>
  )
}
