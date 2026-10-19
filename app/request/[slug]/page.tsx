import type { Metadata } from "next"
import { RequestEstimateForm } from "@/components/leads/request-form"

export const metadata: Metadata = {
  title: "Request an estimate",
}

export default async function CompanyRequestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <RequestEstimateForm slug={slug} />
}
