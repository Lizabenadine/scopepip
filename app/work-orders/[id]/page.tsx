import type { Metadata } from "next"
import { WorkOrderView } from "@/components/work-orders/work-order-view"

export const metadata: Metadata = {
  title: "Subcontractor work order",
}

export default async function WorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <WorkOrderView id={id} />
}
