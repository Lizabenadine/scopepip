import type { Metadata } from "next"
import { SketchesScreen } from "@/components/sketches/sketches-screen"

export const metadata: Metadata = {
  title: "Sketch & Notes",
  description: "Phone-first room layouts, photo markup, and job notes available on the go.",
}

export default function SketchesPage() {
  return <SketchesScreen />
}
