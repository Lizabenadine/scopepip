"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import { leadWebhookToken } from "@/lib/webhooks/token"
import { OutboundHooks } from "@/components/settings/outbound-hooks"
import { SendingKeys } from "@/components/settings/sending-keys"
import { IntegrationCards } from "@/components/settings/integration-cards"
import { zapierTarget } from "@/lib/zapier/events"
import { usePageOrigin } from "@/lib/browser/client-env"

export function Connections() {
  const scope = useScope()
  const [webhook, setWebhook] = useState(scope.estimateSettings.zapierWebhookUrl ?? "")
  const [zapierDetail, setZapierDetail] = useState("")
  const [leadDetail, setLeadDetail] = useState("")
  const [formDetail, setFormDetail] = useState("")
  const origin = usePageOrigin()
  const [token, setToken] = useState("")
  const [companyCam, setCompanyCam] = useState("Job photos are not connected.")
  const [companyCamConnected, setCompanyCamConnected] = useState(false)
  const [companyCamFeedback, setCompanyCamFeedback] = useState("")
  const [savingCam, setSavingCam] = useState(false)
  const [testingCam, setTestingCam] = useState(false)
  const [disconnectingCam, setDisconnectingCam] = useState(false)
  const creatingWebhook = useRef(false)
  const inboundToken = leadWebhookToken(scope.estimateSettings.leadWebhookToken)
  const inboundUrl = origin && inboundToken ? `${origin}/api/webhooks/leads/${inboundToken}` : ""

  useEffect(() => {
    if (!scope.ready || inboundToken || creatingWebhook.current) return
    creatingWebhook.current = true
    scope.updateEstimateSettings({
      ...scope.estimateSettings,
      leadWebhookToken: crypto.randomUUID().replace(/-/g, ""),
    })
  }, [scope, inboundToken])

  useEffect(() => {
    setWebhook(scope.estimateSettings.zapierWebhookUrl ?? "")
  }, [scope.estimateSettings.zapierWebhookUrl])

  useEffect(() => {
    let cancelled = false
    void fetch("/api/companycam/connection")
      .then((response) => response.json())
      .then((payload: { connected?: boolean; last4?: string }) => {
        if (cancelled) return
        setCompanyCamConnected(payload.connected === true)
        setCompanyCam(payload.connected ? `Job photos connected · token ending ${payload.last4}` : "Job photos are not connected.")
      })
      .catch(() => {
        if (!cancelled) {
          setCompanyCamConnected(false)
          setCompanyCam("Job photos are not connected.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function saveZapier() {
    const url = zapierTarget(webhook)
    if (webhook.trim() && !url) {
      setZapierDetail("The hook needs an https address.")
      return
    }
    scope.updateEstimateSettings({
      ...scope.estimateSettings,
      zapierWebhookUrl: url ?? "",
      zapierSince: url ? new Date().toISOString() : scope.estimateSettings.zapierSince,
    })
    setZapierDetail(url ? "Hook saved. New leads, visits, opens, acceptances, jobs, and deposits will post there." : "Hook cleared.")
  }

  async function sendTest() {
    const url = zapierTarget(webhook)
    if (!url) {
      setZapierDetail("The hook needs an https address.")
      return
    }
    const response = await fetch("/api/zapier/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        events: [
          {
            id: `zapier-test-${crypto.randomUUID()}`,
            event: "zapier.test",
            occurredAt: new Date().toISOString(),
            client: { name: "ScopePipe", email: "", phone: "" },
            job: { id: "test", title: "Test event", address: "" },
          },
        ],
      }),
    })
    const payload = (await response.json()) as { ok?: boolean; reason?: string; results?: { delivery: string }[] }
    const delivery = payload.results?.[0]?.delivery
    setZapierDetail(payload.reason || (delivery === "sent" ? "The hook accepted the test." : "The hook did not accept the test."))
  }

  async function saveCompanyCam() {
    setSavingCam(true)
    setCompanyCamFeedback("")
    try {
      const response = await fetch("/api/companycam/connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", token }),
      })
      const payload = (await response.json()) as { ok?: boolean; connected?: boolean; last4?: string; reason?: string }
      if (response.ok && payload.connected) {
        setToken("")
        setCompanyCamConnected(true)
        setCompanyCam(`Job photos connected · token ending ${payload.last4}`)
        setCompanyCamFeedback("CompanyCam connected and verified successfully.")
        window.dispatchEvent(new Event("scopepipe:integrations-refresh"))
      } else {
        setCompanyCamFeedback(payload.reason || "The photo token was rejected by CompanyCam.")
      }
    } catch {
      setCompanyCamFeedback("Job photos could not be saved.")
    } finally {
      setSavingCam(false)
    }
  }

  async function testCompanyCam() {
    setTestingCam(true)
    setCompanyCamFeedback("")
    try {
      const response = await fetch("/api/companycam/connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "test", token: token || undefined }),
      })
      const payload = (await response.json()) as { ok?: boolean; reason?: string; message?: string }
      if (response.ok && payload.ok) {
        setCompanyCamFeedback(payload.message || "CompanyCam connection verified.")
      } else {
        setCompanyCamFeedback(payload.reason || "The photo token was rejected by CompanyCam.")
      }
    } catch {
      setCompanyCamFeedback("CompanyCam could not be reached.")
    } finally {
      setTestingCam(false)
    }
  }

  async function disconnectCompanyCam() {
    setDisconnectingCam(true)
    setCompanyCamFeedback("")
    try {
      const response = await fetch("/api/companycam/connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      })
      if (response.ok) {
        setCompanyCamConnected(false)
        setCompanyCam("Job photos are not connected.")
        setCompanyCamFeedback("CompanyCam disconnected.")
        setToken("")
        window.dispatchEvent(new Event("scopepipe:integrations-refresh"))
      } else {
        setCompanyCamFeedback("CompanyCam could not be disconnected.")
      }
    } catch {
      setCompanyCamFeedback("CompanyCam could not be disconnected.")
    } finally {
      setDisconnectingCam(false)
    }
  }

  async function copyInbound() {
    if (!inboundUrl) return
    try {
      await navigator.clipboard.writeText(inboundUrl)
      setLeadDetail("Webhook address copied.")
    } catch {
      setLeadDetail("Copy the address above.")
    }
  }

  async function copyEmbedCode() {
    if (!inboundUrl || !inboundToken) return
    const code = `<iframe src="${origin}/lead-form/${inboundToken}" width="100%" height="560" frameborder="0" style="border:none;border-radius:12px;"></iframe>`
    try {
      await navigator.clipboard.writeText(code)
      setFormDetail("Embed code copied to clipboard!")
      setTimeout(() => setFormDetail(""), 3000)
    } catch {
      setFormDetail("Please copy manually from the box.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <IntegrationCards />
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="connections">
        <div>
          <h2 className="text-lg font-semibold">Lead webhook</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste this address into your website or the place leads come from. A post with a name and a phone or email opens a card immediately.
          </p>
          <p className="mt-3 break-all font-mono text-sm" data-testid="lead-webhook-url">
            {inboundUrl || "Preparing the webhook address."}
          </p>
          <Button type="button" variant="outline" className="mt-3 h-11" data-testid="lead-webhook-copy" disabled={!inboundUrl} onClick={() => void copyInbound()}>
            Copy webhook address
          </Button>
          {leadDetail ? <p className="mt-2 text-sm">{leadDetail}</p> : null}
        </div>
        <div id="lead-form-embed" className="scroll-mt-24 border-t border-slate-100 pt-4">
          <h2 className="text-lg font-semibold">Website Lead Form</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Embed this mobile-friendly inquiry form on your website (WordPress, Squarespace, Wix, or custom HTML). Submissions flow straight into your Sales Pipeline.
          </p>
          <div className="mt-3 grid gap-2">
            <Label htmlFor="leadFormEmbed" className="text-xs font-medium">Embed Code (iframe)</Label>
            <textarea
              id="leadFormEmbed"
              readOnly
              rows={2}
              value={inboundUrl ? `<iframe src="${origin}/lead-form/${inboundToken}" width="100%" height="560" frameborder="0" style="border:none;border-radius:12px;"></iframe>` : ""}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-800"
              data-testid="lead-form-embed-code"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              data-testid="copy-lead-form-embed-btn"
              disabled={!inboundUrl}
              onClick={() => void copyEmbedCode()}
            >
              Copy Embed Code
            </Button>
            <Button
              type="button"
              className="h-11"
              nativeButton={false}
              render={<a href={origin && inboundToken ? `/lead-form/${inboundToken}` : "#"} target="_blank" rel="noopener noreferrer" />}
              data-testid="preview-lead-form-btn"
              disabled={!inboundUrl}
            >
              Open Form Preview
            </Button>
          </div>
          {formDetail ? <p className="mt-2 text-sm font-medium text-cyan-600">{formDetail}</p> : null}
        </div>
        <div id="zapier-hook" className="scroll-mt-24">
          <h2 className="text-lg font-semibold">Outbound hooks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a hook address. Scopepipe posts new leads, booked visits, proposal opens, acceptances, scheduled jobs, and deposits. A new lead posts as soon as the webhook saves it. Older history stays put.
          </p>
          <div className="mt-3 grid gap-2">
            <Label htmlFor="zapierWebhook">Webhook URL</Label>
            <Input id="zapierWebhook" value={webhook} className="h-11" placeholder="https://" onValueChange={setWebhook} data-testid="zapier-webhook" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" className="h-11" data-testid="zapier-save" onClick={saveZapier}>
              Save hook
            </Button>
            <Button type="button" variant="outline" className="h-11" data-testid="zapier-test" onClick={() => void sendTest()}>
              Send test
            </Button>
          </div>
          {zapierDetail ? <p className="mt-2 text-sm" data-testid="zapier-status">{zapierDetail}</p> : null}
        </div>
        <div id="automatic-hooks" className="scroll-mt-24">
          <OutboundHooks />
        </div>
        <div id="integration-sending" className="scroll-mt-24">
          <SendingKeys />
        </div>
        <div id="job-photos" className="scroll-mt-24">
          <h2 className="text-lg font-semibold">Job photos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A token pulls projects and photos onto the work order. A photo link stored on the job is separate.
          </p>
          <p className="mt-2 text-sm" data-testid="companycam-status">{companyCam}</p>
          {companyCamFeedback ? (
            <p className="mt-2 text-sm font-medium text-slate-700" data-testid="companycam-feedback">{companyCamFeedback}</p>
          ) : null}
          <div className="mt-3 grid gap-2">
            <Label htmlFor="companyCamToken">{companyCamConnected ? "Update API token" : "API token"}</Label>
            <input
              id="companyCamToken"
              type="password"
              value={token}
              autoComplete="off"
              placeholder={companyCamConnected ? "Paste new token to update" : "Paste CompanyCam API token"}
              data-testid="companycam-token"
              onChange={(event) => setToken(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11"
              data-testid="companycam-save"
              disabled={savingCam || !token.trim()}
              onClick={() => void saveCompanyCam()}
            >
              {savingCam ? "Connecting..." : companyCamConnected ? "Update photo token" : "Connect CompanyCam"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              data-testid="companycam-test"
              disabled={testingCam || (!companyCamConnected && !token.trim())}
              onClick={() => void testCompanyCam()}
            >
              {testingCam ? "Testing..." : "Test Connection"}
            </Button>
            {companyCamConnected ? (
              <Button
                type="button"
                variant="destructive"
                className="h-11"
                data-testid="companycam-disconnect"
                disabled={disconnectingCam}
                onClick={() => void disconnectCompanyCam()}
              >
                {disconnectingCam ? "Disconnecting..." : "Disconnect"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
