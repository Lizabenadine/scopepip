import type { Metadata } from "next"
import { LegalDocument, LegalSection } from "@/components/marketing/legal-document"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Scopepipe stores about an account and the jobs in it.",
}

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy">
      <LegalSection heading="Who this covers">
        <p>
          This policy describes information Scopepipe stores to run the product for a painting company. The contractor
          decides what customer details to put in an estimate or proposal.
        </p>
      </LegalSection>
      <LegalSection heading="Account information">
        <p>
          Creating a login stores the owner&apos;s name, company name, email, and a password hash. A project manager login
          stores that person&apos;s name, email, and password hash, tied to the same company.
        </p>
      </LegalSection>
      <LegalSection heading="Job information">
        <p>
          The product stores the estimates, proposals, crew sheets, messages, photos, and videos the company adds.
          A public proposal link shows the customer the proposal the company sent. Crew sheets leave prices off the
          sheet the crew opens.
        </p>
      </LegalSection>
      <LegalSection heading="Payment information">
        <p>
          Card numbers are handled by the checkout provider. Scopepipe stores the subscription status needed to keep
          the office open, such as whether the plan is in a trial, active, or canceled. Scopepipe does not store a
          full card number.
        </p>
      </LegalSection>
      <LegalSection heading="How it is used">
        <p>
          The information is used to provide the product, send a proposal or follow-up the company asks to send, and
          keep the account signed in. Scopepipe does not sell account or customer lists.
        </p>
      </LegalSection>
      <LegalSection heading="How long it stays">
        <p>
          Account and job records stay while the company uses Scopepipe. A canceled subscription keeps the book until
          the company asks for it to be deleted or the account is removed.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
