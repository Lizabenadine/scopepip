"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SendStatus {
  email: boolean
  emailFrom: string
  text: boolean
  textFrom: string
  supabase: boolean
  cron: boolean
}

export function SendingKeys() {
  const [status, setStatus] = useState<SendStatus | null>(null)
  const [detail, setDetail] = useState("")
  const [resendKey, setResendKey] = useState("")
  const [resendFrom, setResendFrom] = useState("")
  const [twilioSid, setTwilioSid] = useState("")
  const [twilioToken, setTwilioToken] = useState("")
  const [twilioFrom, setTwilioFrom] = useState("")
  const [supabaseSecret, setSupabaseSecret] = useState("")

  useEffect(() => {
    void refresh(setStatus)
  }, [])

  async function save(body: Record<string, string>) {
    const response = await fetch("/api/sending", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = (await response.json()) as SendStatus & { ok?: boolean; reason?: string }
    if (!response.ok || payload.ok === false) {
      setDetail(payload.reason || "Those keys could not be saved.")
      return
    }
    setStatus(payload)
    setDetail("Saved. A follow-up uses these keys the next time it is due.")
    setResendKey("")
    setTwilioSid("")
    setTwilioToken("")
    setSupabaseSecret("")
  }

  return (
    <div data-testid="sending-keys">
      <h2 className="text-lg font-semibold">Sending</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Resend sends the email. Twilio sends the text. Until both are saved, the note is only logged on the deal. Hooks you turn on here post without Supabase. A service key is for hook addresses stored in Supabase.
      </p>
      <p className="mt-2 text-sm" data-testid="sending-status">
        {status
          ? `${status.email ? `Email sends from ${status.emailFrom}.` : "Email is logged."} ${status.text ? `Texts send from ${status.textFrom}.` : "Texts are logged."} ${status.supabase ? "Supabase can look up hook addresses." : "Supabase hook lookup is off."} ${status.cron ? "The daily follow-up check is ready." : "Set CRON_SECRET on the host so the daily follow-up check can run."}`
          : "Checking sending keys."}
      </p>
      <div className="mt-3 grid gap-2">
        <Label htmlFor="resendKey">Resend API key</Label>
        <SecretField id="resendKey" value={resendKey} onChange={setResendKey} testId="resend-key" />
        <Label htmlFor="resendFrom">From email</Label>
        <Input id="resendFrom" value={resendFrom} className="h-11" placeholder="office@example.com" onValueChange={setResendFrom} data-testid="resend-from" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-11"
          data-testid="resend-save"
          onClick={() => {
            if (!resendKey.trim() && !resendFrom.trim()) {
              setDetail("Add a Resend key and a from email.")
              return
            }
            void save({ ...(resendKey.trim() ? { resendKey } : {}), ...(resendFrom.trim() ? { resendFrom } : {}) })
          }}
        >
          Save Resend
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => void save({ clear: "resend" })}>
          Clear Resend
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="twilioSid">Twilio account SID</Label>
        <SecretField id="twilioSid" value={twilioSid} onChange={setTwilioSid} testId="twilio-sid" />
        <Label htmlFor="twilioToken">Twilio auth token</Label>
        <SecretField id="twilioToken" value={twilioToken} onChange={setTwilioToken} testId="twilio-token" />
        <Label htmlFor="twilioFrom">Twilio from number</Label>
        <Input id="twilioFrom" value={twilioFrom} className="h-11" placeholder="+15035550100" onValueChange={setTwilioFrom} data-testid="twilio-from" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-11"
          data-testid="twilio-save"
          onClick={() => {
            if (!twilioSid.trim() && !twilioToken.trim() && !twilioFrom.trim()) {
              setDetail("Add the Twilio SID, token, and from number.")
              return
            }
            void save({
              ...(twilioSid.trim() ? { twilioSid } : {}),
              ...(twilioToken.trim() ? { twilioToken } : {}),
              ...(twilioFrom.trim() ? { twilioFrom } : {}),
            })
          }}
        >
          Save Twilio
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => void save({ clear: "twilio" })}>
          Clear Twilio
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="supabaseSecret">Supabase service key</Label>
        <SecretField id="supabaseSecret" value={supabaseSecret} onChange={setSupabaseSecret} testId="supabase-secret" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-11"
          data-testid="supabase-save"
          onClick={() => {
            if (!supabaseSecret.trim()) {
              setDetail("Add the Supabase service key.")
              return
            }
            void save({ supabaseSecret })
          }}
        >
          Save Supabase key
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => void save({ clear: "supabase" })}>
          Clear Supabase key
        </Button>
      </div>
      {detail ? <p className="mt-2 text-sm" data-testid="sending-detail">{detail}</p> : null}
    </div>
  )
}

function SecretField({
  id,
  value,
  onChange,
  testId,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  testId: string
}) {
  return (
    <input
      id={id}
      type="password"
      value={value}
      autoComplete="off"
      data-testid={testId}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  )
}

async function refresh(setStatus: (status: SendStatus) => void) {
  const response = await fetch("/api/sending")
  if (!response.ok) return
  setStatus((await response.json()) as SendStatus)
}
