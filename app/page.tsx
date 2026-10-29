import type { Metadata } from "next"
import { LandingPage } from "@/components/marketing/landing-page"

export const metadata: Metadata = {
  title: { absolute: "Scopepipe" },
  description:
    "Fast estimating, interactive proposals with line-item video, and bilingual crew sheets for painting contractors.",
}

export default function HomePage() {
  return <LandingPage />
}
