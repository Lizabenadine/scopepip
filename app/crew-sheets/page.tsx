import type { Metadata } from "next"
import { ProductPage } from "@/components/marketing/product-page"

export const metadata: Metadata = {
  title: "Crew sheets",
  description:
    "Painting crew sheets in English or Spanish, with rooms, coats, gallons, and hours. Prices stay off the sheet.",
}

export default function CrewSheetsPage() {
  return (
    <ProductPage
      kicker="Crew sheets"
      title="Hand the crew the work, not the price."
      lede="The crew sheet lists the rooms, the surfaces, the coats, the gallons, and the hours. Prices, costs, and margins stay off the page."
      sections={[
        {
          heading: "English or Spanish",
          body: "The same work order opens in either language. The crew picks the language at the top of the sheet.",
        },
        {
          heading: "A buy list for the paint counter",
          body: "Gallons are grouped by product and rounded up to whole cans. The store list names the rooms that use each product.",
        },
        {
          heading: "Start date and crew",
          body: "Assign the crew and the start date on the crew board. A deposit records the payment. It does not pick the day the crew shows up.",
        },
      ]}
    />
  )
}
