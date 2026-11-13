"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useScope } from "@/lib/data/store"
import { planHasFeatureAccess } from "@/lib/billing/entitlement"

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
  const globalWin = window as unknown as {
    SpeechRecognition?: { new (): SpeechRecognitionInstance }
    webkitSpeechRecognition?: { new (): SpeechRecognitionInstance }
  }
  return globalWin.SpeechRecognition || globalWin.webkitSpeechRecognition || null
}

export interface VoiceNoteButtonProps {
  onTranscript: (transcription: string) => void
  className?: string
  targetField?: string
}

export function VoiceNoteButton({ onTranscript, className, targetField = "notes" }: VoiceNoteButtonProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isStoppingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const Ctor = getSpeechRecognitionConstructor()
    setIsSupported(Boolean(Ctor))

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore cleanup abort errors
        }
      }
    }
  }, [])

  function showStatus(msg: string, autoClearMs = 3500) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStatusMessage(msg)
    if (autoClearMs > 0) {
      timeoutRef.current = setTimeout(() => {
        setStatusMessage("")
      }, autoClearMs)
    }
  }

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

  const { session } = useScope()
  const access = planHasFeatureAccess(session?.planTier, "voiceNotes", session?.subscriptionStatus)

  function startListening() {
    if (!access.allowed) {
      showStatus(access.reason || "Voice-to-Estimate Notes is available on the Business plan.", 4000)
      return
    }

    const RecognitionCtor = getSpeechRecognitionConstructor()
    if (!RecognitionCtor) {
      showStatus("Voice input is not supported in this browser.")
      return
    }

    try {
      // Abort any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }

      const recognition = new RecognitionCtor()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US"

      isStoppingRef.current = false

      recognition.onstart = () => {
        setIsListening(true)
        showStatus("Listening... Speak now.", 0)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let textAccumulator = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result && result.isFinal) {
            const transcript = result[0]?.transcript?.trim()
            if (transcript) {
              textAccumulator += (textAccumulator ? " " : "") + transcript
            }
          }
        }

        if (textAccumulator) {
          onTranscript(textAccumulator)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false)
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          showStatus("Microphone blocked. Allow mic access in browser settings.")
        } else if (event.error === "network") {
          showStatus("Network error during speech recognition.")
        } else if (event.error === "no-speech") {
          showStatus("No speech detected.", 2000)
        } else {
          showStatus(`Voice error: ${event.error}`, 3000)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        if (!isStoppingRef.current) {
          // Finished naturally
          setStatusMessage("")
        } else {
          showStatus("Voice dictation stopped.", 2000)
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setIsListening(false)
      showStatus("Could not start microphone.")
    }
  }

  function handleToggle() {
    if (!isSupported) {
      showStatus("Voice input is not supported in this browser.")
      return
    }

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className="flex items-center gap-2">
      {statusMessage ? (
        <span
          className={cn(
            "text-[11px] leading-tight font-medium max-w-[200px] truncate",
            isListening ? "text-rose-600" : "text-slate-500",
          )}
          data-testid={`voice-status-${targetField}`}
          role="status"
        >
          {statusMessage}
        </span>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className={cn(
          "h-7 px-2 text-xs font-medium gap-1 rounded-md transition-all select-none",
          isListening
            ? "border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 shadow-sm"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          !isSupported && "opacity-60 cursor-not-allowed",
          className,
        )}
        aria-label={isListening ? `Stop voice dictation for ${targetField}` : `Dictate ${targetField} using voice`}
        title={
          !isSupported
            ? "Voice input is not supported in this browser"
            : isListening
              ? "Listening... Tap to stop"
              : "Tap to dictate notes"
        }
        data-testid={`voice-dictate-${targetField}`}
      >
        {isListening ? (
          <>
            <span className="size-2 rounded-full bg-rose-600 animate-ping" />
            <Mic className="size-3.5 text-rose-600 animate-pulse" />
            <span className="text-[11px] font-semibold text-rose-700">Listening...</span>
          </>
        ) : !isSupported ? (
          <>
            <MicOff className="size-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400 hidden xs:inline">Mic</span>
          </>
        ) : (
          <>
            <Mic className="size-3.5 text-slate-500" />
            <span className="text-[11px] hidden xs:inline">Dictate</span>
          </>
        )}
      </Button>
    </div>
  )
}
