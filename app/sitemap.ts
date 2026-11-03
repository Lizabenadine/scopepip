import type { MetadataRoute } from "next"

const PATHS = [
  "",
  "/estimating",
  "/proposals",
  "/crew-sheets",
  "/pricing",
  "/sample-proposal",
  "/terms",
  "/privacy",
  "/refunds",
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: `https://www.scopepipe.com${path}`,
    lastModified: "2026-11-01",
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }))
}
