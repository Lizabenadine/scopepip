"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import { zapierTarget } from "@/lib/zapier/events"

export function Connections() {
  const scope = useScope()
  const [webhook, setWebhook] = useState(scope.estimateSettings.zapierWebhookUrl ?? "")
  const [zapierDetail, setZapierDetail] = useState("")
  const [token, setToken] = useState("")
  const [companyCam, setCompanyCam] = useState("CompanyCam is not connected.")
  const [savingCam, setSavingCam] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/companycam/connection")
      .then((response) => response.json())
      .then((payload: { connected?: boolean; last4?: string }) => {
        if (cancelled) return
        setCompanyCam(payload.connected ? `CompanyCam connected · token ending ${payload.last4}` : "CompanyCam is not connected.")
      })
      .catch(() => {
        if (!cancelled) setCompanyCam("CompanyCam is not connected.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  function saveZapier() {
    const url = zapierTarget(webhook)
    if (webhook.trim() && !url) {
      setZapierDetail("Zapier needs an https webhook URL.")
      return
    }
    scope.updateEstimateSettings({
      ...scope.estimateSettings,
      zapierWebhookUrl: url ?? "",
      zapierSince: url ? new Date().toISOString() : scope.estimateSettings.zapierSince,
    })
    setZapierDetail(url ? "Zapier hook saved. New leads, visits, opens, acceptances, jobs, and deposits will post there." : "Zapier hook cleared.")
  }

  async function sendTest() {
    const url = zapierTarget(webhook)
    if (!url) {
      setZapierDetail("Zapier needs an https webhook URL.")
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
    setZapierDetail(payload.reason || (delivery === "sent" ? "Zapier accepted the test." : "Zapier did not accept the test."))
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
      setCompanyCam(payload.connected ? `CompanyCam connected · token ending ${payload.last4}` : "CompanyCam is not connected.")
    } catch {
      setCompanyCam("CompanyCam could not be saved.")
    } finally {
      setSavingCam(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-testid="connections">
      <div>
        <h2 className="text-lg font-semibold">Zapier</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a Catch Hook URL. ScopePipe posts new leads, booked visits, proposal opens, acceptances, scheduled jobs, and deposits. Older history stays put.
        </p>
        <div className="mt-3 grid gap-2">
          <Label htmlFor="zapierWebhook">Webhook URL</Label>
          <Input id="zapierWebhook" value={webhook} className="h-11" placeholder="https://" onValueChange={setWebhook} data-testid="zapier-webhook" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" className="h-11" data-testid="zapier-save" onClick={saveZapier}>
            Save Zapier hook
          </Button>
          <Button type="button" variant="outline" className="h-11" data-testid="zapier-test" onClick={() => void sendTest()}>
            Send test
          </Button>
        </div>
        {zapierDetail ? <p className="mt-2 text-sm" data-testid="zapier-status">{zapierDetail}</p> : null}
      </div>
      <div>
        <h2 className="text-lg font-semibold">CompanyCam</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A token pulls projects and photos onto the work order. A CompanyCam link stored on the job is not this connection.
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
          {savingCam ? "Saving..." : "Save CompanyCam token"}
        </Button>
      </div>
    </section>
  )
}
