import type { Metadata } from "next"
import { ProductPage } from "@/components/marketing/product-page"

export const metadata: Metadata = {
  title: "Painting estimates",
  description:
    "Room-by-room painting estimates with wall area, coats, gallons, and labor hours. Scopepipe prices the job from the measurements.",
}

export default function EstimatingPage() {
  return (
    <ProductPage
      kicker="Estimating"
      title="Price the rooms from the measurements."
      lede="Enter each room once. Scopepipe turns the length, width, and height into paintable area, gallons, and labor hours, then prices the job."
      sections={[
        {
          heading: "Walls, ceilings, and trim",
          body: "Each surface keeps its own coats, primer, and production rate. A bedroom, a hallway, and the exterior siding can sit on the same estimate.",
        },
        {
          heading: "Gallons and hours",
          body: "Paint quantity follows coverage and coat count. Labor hours follow the production rate for that surface. The customer total is that work plus materials, tax, and the deposit percent you set.",
        },
        {
          heading: "One estimate for the whole job",
          body: "The proposal, the deposit, and the crew sheet all read this estimate. You do not copy the rooms into a second bid.",
        },
      ]}
    />
  )
}
