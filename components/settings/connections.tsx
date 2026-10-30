"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import { leadWebhookToken } from "@/lib/webhooks/token"
import { OutboundHooks } from "@/components/settings/outbound-hooks"
import { SendingKeys } from "@/components/settings/sending-keys"
import { zapierTarget } from "@/lib/zapier/events"
import { usePageOrigin } from "@/lib/browser/client-env"

export function Connections() {
  const scope = useScope()
  const [webhook, setWebhook] = useState(scope.estimateSettings.zapierWebhookUrl ?? "")
  const [zapierDetail, setZapierDetail] = useState("")
  const [leadDetail, setLeadDetail] = useState("")
  const origin = usePageOrigin()
  const [token, setToken] = useState("")
  const [companyCam, setCompanyCam] = useState("Job photos are not connected.")
  const [savingCam, setSavingCam] = useState(false)
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
    let cancelled = false
    void fetch("/api/companycam/connection")
      .then((response) => response.json())
      .then((payload: { connected?: boolean; last4?: string }) => {
        if (cancelled) return
        setCompanyCam(payload.connected ? `Job photos connected · token ending ${payload.last4}` : "Job photos are not connected.")
      })
      .catch(() => {
        if (!cancelled) setCompanyCam("Job photos are not connected.")
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
    try {
      const response = await fetch("/api/companycam/connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const payload = (await response.json()) as { connected?: boolean; last4?: string }
      setToken("")
      setCompanyCam(payload.connected ? `Job photos connected · token ending ${payload.last4}` : "Job photos are not connected.")
    } catch {
      setCompanyCam("Job photos could not be saved.")
    } finally {
      setSavingCam(false)
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

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm" data-testid="connections">
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
      <div>
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
      <OutboundHooks />
      <SendingKeys />
      <div>
        <h2 className="text-lg font-semibold">Job photos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A token pulls projects and photos onto the work order. A photo link stored on the job is separate.
        </p>
        <p className="mt-2 text-sm" data-testid="companycam-status">{companyCam}</p>
        <div className="mt-3 grid gap-2">
          <Label htmlFor="companyCamToken">API token</Label>
          <input
            id="companyCamToken"
            type="password"
            value={token}
            autoComplete="off"
            data-testid="companycam-token"
            onChange={(event) => setToken(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button type="button" className="mt-3 h-11" data-testid="companycam-save" disabled={savingCam} onClick={() => void saveCompanyCam()}>
          {savingCam ? "Saving..." : "Save photo token"}
        </Button>
      </div>
    </section>
  )
}
