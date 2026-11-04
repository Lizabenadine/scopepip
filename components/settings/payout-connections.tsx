"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PayoutState {
  stripe: boolean
  paypal: boolean
  paddle: boolean
  bank: boolean
  bankName: string
  accountHolder: string
  accountLast4: string
}

const EMPTY: PayoutState = {
  stripe: false,
  paypal: false,
  paddle: false,
  bank: false,
  bankName: "",
  accountHolder: "",
  accountLast4: "",
}

export function PayoutConnections() {
  const [status, setStatus] = useState<PayoutState>(EMPTY)
  const [detail, setDetail] = useState("")
  const [stripeSecret, setStripeSecret] = useState("")
  const [stripePublishable, setStripePublishable] = useState("")
  const [paypalClientId, setPaypalClientId] = useState("")
  const [paypalSecret, setPaypalSecret] = useState("")
  const [paypalLive, setPaypalLive] = useState(false)
  const [paddleApiKey, setPaddleApiKey] = useState("")
  const [paddleClientToken, setPaddleClientToken] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [routingNumber, setRoutingNumber] = useState("")
  const [accountNumber, setAccountNumber] = useState("")

  useEffect(() => {
    void refresh(setStatus)
  }, [])

  async function save(body: Record<string, string>) {
    const response = await fetch("/api/payouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = (await response.json()) as PayoutState & { ok?: boolean; reason?: string }
    if (!response.ok || payload.ok === false) {
      setDetail(payload.reason || "That account could not be connected.")
      return
    }
    setStatus(payload)
    setDetail("Saved for this account. A customer can use it on the next deposit.")
    setStripeSecret("")
    setStripePublishable("")
    setPaypalClientId("")
    setPaypalSecret("")
    setPaddleApiKey("")
    setPaddleClientToken("")
    setRoutingNumber("")
    setAccountNumber("")
  }

  return (
    <div id="payout-connections" data-testid="payout-connections" className="scroll-mt-24">
      <h2 className="text-lg font-semibold">Get paid</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each ScopePipe account connects its own Stripe, PayPal, Paddle, or bank account. A customer deposit uses this account. ScopePipe&apos;s subscription checkout stays separate.
      </p>
      <p className="mt-2 text-sm" data-testid="payout-status">
        {status.stripe ? "Stripe is connected." : "Stripe is not connected."}{" "}
        {status.paypal ? "PayPal is connected." : "PayPal is not connected."}{" "}
        {status.paddle ? "Paddle is connected." : "Paddle is not connected."}{" "}
        {status.bank ? `Bank account ending ${status.accountLast4} is connected.` : "Bank account is not connected."}
      </p>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="payoutStripeSecret">Stripe secret key</Label>
        <SecretField id="payoutStripeSecret" value={stripeSecret} onChange={setStripeSecret} testId="payout-stripe-secret" />
        <Label htmlFor="payoutStripePublishable">Stripe publishable key</Label>
        <SecretField id="payoutStripePublishable" value={stripePublishable} onChange={setStripePublishable} testId="payout-stripe-publishable" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-11"
          data-testid="payout-stripe-save"
          onClick={() => {
            if (!stripeSecret.trim() && !stripePublishable.trim()) {
              setDetail("Add the Stripe secret key and publishable key.")
              return
            }
            void save({
              ...(stripeSecret.trim() ? { stripeSecret } : {}),
              ...(stripePublishable.trim() ? { stripePublishable } : {}),
            })
          }}
        >
          Save Stripe
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => void save({ clear: "stripe" })}>
          Clear Stripe
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="payoutPaypalClient">PayPal client id</Label>
        <SecretField id="payoutPaypalClient" value={paypalClientId} onChange={setPaypalClientId} testId="payout-paypal-client" />
        <Label htmlFor="payoutPaypalSecret">PayPal secret</Label>
        <SecretField id="payoutPaypalSecret" value={paypalSecret} onChange={setPaypalSecret} testId="payout-paypal-secret" />
        <label className="flex items-center gap-2 text-sm" htmlFor="payoutPaypalLive">
          <input id="payoutPaypalLive" type="checkbox" checked={paypalLive} data-testid="payout-paypal-live" onChange={(event) => setPaypalLive(event.target.checked)} />
          Live PayPal. Leave this off for sandbox keys.
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-11"
          data-testid="payout-paypal-save"
          onClick={() => {
            if (!paypalClientId.trim() && !paypalSecret.trim()) {
              setDetail("Add the PayPal client id and secret.")
              return
            }
            void save({
              ...(paypalClientId.trim() ? { paypalClientId } : {}),
              ...(paypalSecret.trim() ? { paypalSecret } : {}),
              paypalMode: paypalLive ? "live" : "sandbox",
            })
          }}
        >
          Save PayPal
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => void save({ clear: "paypal" })}>
          Clear PayPal
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="payoutPaddleKey">Paddle API key</Label>
        <SecretField id="payoutPaddleKey" value={paddleApiKey} onChange={setPaddleApiKey} testId="payout-paddle-key" />
        <Label htmlFor="payoutPaddleToken">Paddle client token</Label>
        <SecretField id="payoutPaddleToken" value={paddleClientToken} onChange={setPaddleClientToken} testId="payout-paddle-token" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-11"
          data-testid="payout-paddle-save"
          onClick={() => {
            if (!paddleApiKey.trim() && !paddleClientToken.trim()) {
              setDetail("Add the Paddle API key and client token for the account that gets paid.")
              return
            }
            void save({
              ...(paddleApiKey.trim() ? { paddleApiKey } : {}),
              ...(paddleClientToken.trim() ? { paddleClientToken } : {}),
            })
          }}
        >
          Save Paddle
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => void save({ clear: "paddle" })}>
          Clear Paddle
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="payoutBankName">Bank name</Label>
        <Input id="payoutBankName" value={bankName} className="h-11" onValueChange={setBankName} data-testid="payout-bank-name" />
        <Label htmlFor="payoutAccountHolder">Account holder</Label>
        <Input id="payoutAccountHolder" value={accountHolder} className="h-11" onValueChange={setAccountHolder} data-testid="payout-account-holder" />
        <Label htmlFor="payoutRouting">Routing number</Label>
        <Input id="payoutRouting" value={routingNumber} className="h-11" inputMode="numeric" onValueChange={setRoutingNumber} data-testid="payout-routing" />
        <Label htmlFor="payoutAccount">Account number</Label>
        <Input id="payoutAccount" value={accountNumber} className="h-11" inputMode="numeric" onValueChange={setAccountNumber} data-testid="payout-account" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-11"
          data-testid="payout-bank-save"
          onClick={() => {
            if (!bankName.trim() && !accountHolder.trim() && !routingNumber.trim() && !accountNumber.trim()) {
              setDetail("Add the bank name, account holder, routing number, and account number.")
              return
            }
            void save({ bankName, accountHolder, routingNumber, accountNumber })
          }}
        >
          Save bank account
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => void save({ clear: "bank" })}>
          Clear bank account
        </Button>
      </div>
      {detail ? <p className="mt-2 text-sm" data-testid="payout-detail">{detail}</p> : null}
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

async function refresh(setStatus: (status: PayoutState) => void) {
  const response = await fetch("/api/payouts")
  if (!response.ok) return
  setStatus((await response.json()) as PayoutState)
}
