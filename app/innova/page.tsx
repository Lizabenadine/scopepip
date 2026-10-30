import type { Metadata } from "next"
import { InnovaDemo } from "@/components/marketing/innova-demo"

export const metadata: Metadata = {
  title: { absolute: "Innova Pro Painting" },
  description: "Interior and exterior painting in San Diego. Licensed and insured. Call for a free quote.",
  robots: { index: false, follow: false },
}

export default function InnovaPage() {
  return <InnovaDemo />
}
