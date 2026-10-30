import type { Metadata } from "next"
import { StoreListView } from "@/components/estimate/store-list-view"

export const metadata: Metadata = {
  title: "Store list",
}

export default async function StoreListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StoreListView id={id} />
}
