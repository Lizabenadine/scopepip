import type { Metadata } from "next"
import { LegalDocument, LegalSection } from "@/components/marketing/legal-document"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for a Scopepipe subscription.",
}

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service">
      <LegalSection heading="The service">
        <p>
          Scopepipe is software for painting contractors. It covers estimating, customer proposals, crew sheets, and the
          office tools on this site. These terms cover the subscription you buy for that software.
        </p>
      </LegalSection>
      <LegalSection heading="Accounts">
        <p>
          The person who creates the company login is the owner. The owner can add project managers who share that
          company&apos;s jobs. The Founding Plan includes 3 seats. An extra seat is $15 per month. You are responsible for
          the logins on your company and for the customer information you enter.
        </p>
      </LegalSection>
      <LegalSection heading="Price and trial">
        <p>
          The Founding Plan is $49 per month after a 14-day free trial. The trial does not require a credit card. When
          a paid subscription starts, the plan and any extra seats are billed monthly in advance through the checkout
          provider. Taxes may be added at checkout.
        </p>
      </LegalSection>
      <LegalSection heading="Your content">
        <p>
          Estimates, proposals, photos, videos, and customer records you add stay yours. You give Scopepipe permission
          to store and display that content so the product can run, including showing a proposal to the customer you
          send it to. You are responsible for having the right to upload that content.
        </p>
      </LegalSection>
      <LegalSection heading="Acceptable use">
        <p>
          Do not use Scopepipe to break the law, send spam, or attempt to access another company&apos;s book. Scopepipe
          may suspend an account that does so.
        </p>
      </LegalSection>
      <LegalSection heading="Cancellation">
        <p>
          You can cancel a paid subscription before the next billing date. Access continues through the period already
          paid. The refund rules are on the Refund Policy.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
