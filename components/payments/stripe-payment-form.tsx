"use client"

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const stripeCache = new Map<string, Promise<Stripe | null>>()

function stripePromise(publishableKey: string) {
  const existing = stripeCache.get(publishableKey)
  if (existing) return existing
  const created = loadStripe(publishableKey)
  stripeCache.set(publishableKey, created)
  return created
}

export function StripePaymentForm({
  publishableKey,
  clientSecret,
  onSuccess,
  onError,
}: {
  publishableKey: string
  clientSecret: string
  onSuccess: () => void
  onError: (message: string) => void
}) {
  return (
    <Elements stripe={stripePromise(publishableKey)} options={{ clientSecret }}>
      <StripeConfirm onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}

function StripeConfirm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [pending, setPending] = useState(false)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!stripe || !elements) return
        setPending(true)
        const result = await stripe.confirmPayment({
          elements,
          redirect: "if_required",
          confirmParams: { return_url: window.location.href },
        })
        setPending(false)
        if (result.error) {
          onError(result.error.message ?? "The payment did not go through.")
          return
        }
        if (result.paymentIntent?.status === "succeeded") onSuccess()
      }}
    >
      <PaymentElement />
      <Button type="submit" className="h-12" disabled={!stripe || pending}>
        {pending ? "Processing" : "Pay deposit"}
      </Button>
    </form>
  )
}
