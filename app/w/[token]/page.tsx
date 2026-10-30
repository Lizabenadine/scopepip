import type { Metadata } from "next"
import { SubcontractorOfferPage } from "@/components/work-orders/subcontractor-offer-page"

export const metadata: Metadata = {
  title: "Work order",
  robots: { index: false, follow: false },
}

export default async function WorkOrderOfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <SubcontractorOfferPage token={token} />
}
