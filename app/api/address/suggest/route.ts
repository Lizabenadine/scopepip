import { sessionFromRequest } from "@/lib/auth/request"
import { mailingAddress, type MapAddress } from "@/lib/address/format"

export const runtime = "nodejs"

interface MapHit {
  display_name?: string
  address?: MapAddress
}

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ suggestions: [] }, { status: 401 })
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (query.length < 3) return Response.json({ suggestions: [] })
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", query)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("limit", "5")
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "ScopePipe (support@scopepipe.com)",
      },
    })
    if (!response.ok) return Response.json({ suggestions: [] })
    const rows = (await response.json()) as MapHit[]
    const suggestions = rows
      .map((row) => mailingAddress(row.address ?? {}, row.display_name ?? ""))
      .filter((label, index, all) => label.length > 0 && all.indexOf(label) === index)
      .slice(0, 5)
    return Response.json({ suggestions })
  } catch {
    return Response.json({ suggestions: [] })
  }
}
