import type { Metadata } from "next"
import { LandingPage } from "@/components/marketing/landing-page"

export const metadata: Metadata = {
  title: { absolute: "Scopepipe | Contractor Estimating & Proposal Software" },
}

export default function HomePage() {
  return <LandingPage />
}
