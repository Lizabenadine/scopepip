import type { Metadata } from "next"
import { ProductPage } from "@/components/marketing/product-page"

export const metadata: Metadata = {
  title: "Painting proposals",
  description:
    "Send a painting proposal the customer can open, watch, and sign. Optional upgrades change the total before they accept.",
}

export default function ProposalsPage() {
  return (
    <ProductPage
      kicker="Proposals"
      title="Send the proposal. The customer signs it."
      lede="Email the link. The customer opens one page, plays a short video on a line, chooses optional work, and signs. They do not need an account."
      sections={[
        {
          heading: "The same price as the estimate",
          body: "The proposal total, the deposit, and the balance come from the estimate. A change in a room updates that price before you send it.",
        },
        {
          heading: "Color and sheen on the page",
          body: "Each room can show the color and the sheen the customer is accepting. That is the spec the crew later sees.",
        },
        {
          heading: "A signed copy",
          body: "When the customer accepts, Scopepipe keeps that scope for the crew sheet. Extra work after the signature is a change order.",
        },
      ]}
    />
  )
}
