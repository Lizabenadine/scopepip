import type { Metadata } from "next"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "How a Scopepipe trial is canceled and when a subscription charge can be refunded.",
}

export default function RefundPage() {
  return (
    <div className="min-h-dvh bg-[#0B0F17]">
      <main className="mx-auto max-w-4xl px-6 py-16 text-slate-300">
        <h1 className="mb-6 text-3xl font-bold text-white">Refund & Cancellation Policy</h1>
        <p className="mb-4 text-sm text-slate-400">Last updated: October 29, 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">1. 14-Day Free Trial</h2>
            <p>
              Scopepipe provides a 14-day free trial for new accounts. You can cancel your subscription at any time
              during the trial period without being charged.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">2. Subscription Cancellations</h2>
            <p>
              You can cancel your monthly $49/month subscription at any time through your account settings or by
              contacting{" "}
              <a href="mailto:support@scopepipe.com" className="text-cyan-400 underline">
                support@scopepipe.com
              </a>
              . Upon cancellation, your account will remain active until the end of your current paid billing period.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">3. Refund Requests</h2>
            <p>
              Because Scopepipe offers a full 14-day free trial to evaluate the software before purchase, payments are
              generally non-refundable. However, if you experience technical issues preventing you from using the
              service, or if you were charged accidentally after attempting to cancel, please submit a refund request
              within 7 days of the charge date to{" "}
              <a href="mailto:support@scopepipe.com" className="text-cyan-400 underline">
                support@scopepipe.com
              </a>
              . Requests are evaluated within 2 business days.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">4. Merchant of Record</h2>
            <p>
              Our order process and subscription billing are conducted by our online reseller Paddle.com. Paddle is the
              Merchant of Record for all our orders and handles buyer customer service inquiries and refunds.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
