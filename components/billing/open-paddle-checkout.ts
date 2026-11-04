"use client"

import type { PaddleCheckout } from "@/lib/billing/paddle-checkout"

interface PaddleClient {
  Environment: { set: (environment: "sandbox" | "production") => void }
  Initialize: (options: {
    token: string
    eventCallback?: (event: { name?: string; data?: { transaction_id?: string } }) => void
  }) => void
  Checkout: {
    open: (options: {
      items?: { priceId: string; quantity: number }[]
      transactionId?: string
      customData?: { user_id: string; office_user_id: string }
      customer?: { email: string }
      settings: { successUrl?: string; displayMode?: "overlay"; variant?: "one-page" }
    }) => void
  }
}

let ready: Promise<PaddleClient> | null = null
let initializedToken = ""

export function openPaddleCheckout(checkout: PaddleCheckout): Promise<void> {
  return loadPaddle().then((paddle) => {
    if (initializedToken !== checkout.token) {
      paddle.Environment.set(checkout.token.startsWith("test_") ? "sandbox" : "production")
      paddle.Initialize({ token: checkout.token })
      initializedToken = checkout.token
    }
    paddle.Checkout.open({
      items: [{ priceId: checkout.priceId, quantity: 1 }],
      customData: { user_id: checkout.userId, office_user_id: checkout.officeUserId },
      customer: { email: checkout.email },
      settings: { successUrl: `${window.location.origin}/billing` },
    })
  })
}

export function openPaddleDeposit(input: {
  token: string
  transactionId: string
  onPaid: (transactionId: string) => void
}): Promise<void> {
  return loadPaddle().then((paddle) => {
    paddle.Environment.set(input.token.startsWith("test_") ? "sandbox" : "production")
    paddle.Initialize({
      token: input.token,
      eventCallback: (event) => {
        if (event.name === "checkout.completed") input.onPaid(event.data?.transaction_id || input.transactionId)
      },
    })
    initializedToken = input.token
    paddle.Checkout.open({
      transactionId: input.transactionId,
      settings: { displayMode: "overlay", variant: "one-page", successUrl: window.location.href },
    })
  })
}

function loadPaddle(): Promise<PaddleClient> {
  if (ready) return ready
  ready = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-paddle]")
    const finish = () => {
      const paddle = (window as Window & { Paddle?: PaddleClient }).Paddle
      if (paddle) resolve(paddle)
      else reject(new Error("Checkout did not load."))
    }
    if (existing) {
      finish()
      return
    }
    const script = document.createElement("script")
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js"
    script.defer = true
    script.dataset.paddle = "true"
    script.onload = finish
    script.onerror = () => reject(new Error("Checkout did not load."))
    document.body.appendChild(script)
  })
  return ready
}
