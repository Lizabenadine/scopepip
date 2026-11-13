export const runtime = "nodejs"

interface AddressSuggestion {
  id: string
  label: string
  street?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

// In-memory cache for fast repeated queries and usage limits
const CACHE = new Map<string, { timestamp: number; results: AddressSuggestion[] }>()
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes
const MAX_CACHE_SIZE = 500

function getCached(query: string): AddressSuggestion[] | null {
  const item = CACHE.get(query)
  if (!item) return null
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    CACHE.delete(query)
    return null
  }
  return item.results
}

function setCached(query: string, results: AddressSuggestion[]) {
  if (CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = CACHE.keys().next().value
    if (firstKey) CACHE.delete(firstKey)
  }
  CACHE.set(query, { timestamp: Date.now(), results })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim()

  if (q.length < 3) {
    return Response.json({ suggestions: [] })
  }

  const queryKey = q.toLowerCase()
  const cached = getCached(queryKey)
  if (cached) {
    return Response.json({ suggestions: cached })
  }

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY

  // 1. If Google Maps / Places API key is configured, use Google Places Autocomplete
  if (googleApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        q,
      )}&types=address&key=${googleApiKey}`
      const response = await fetch(url, { headers: { Accept: "application/json" } })
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data.predictions) && data.predictions.length > 0) {
          const suggestions: AddressSuggestion[] = data.predictions.map(
            (p: { place_id: string; description: string; structured_formatting?: { main_text?: string; secondary_text?: string } }) => ({
              id: p.place_id,
              label: p.description,
              street: p.structured_formatting?.main_text,
              city: p.structured_formatting?.secondary_text,
            }),
          )
          setCached(queryKey, suggestions)
          return Response.json({ suggestions })
        }
      }
    } catch {
      // Fallback to secondary provider if Google request encounters error
    }
  }

  // 2. High-precision OpenStreetMap / Photon Geocoder fallback (no API key required, reliable & global)
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "ScopepipeEstimator/1.0" },
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data.features)) {
        const suggestions: AddressSuggestion[] = []
        const seen = new Set<string>()

        for (const feature of data.features) {
          const p = feature.properties
          if (!p) continue

          const house = p.housenumber ? `${p.housenumber} ` : ""
          const street = p.street ? `${house}${p.street}` : p.name || ""
          const city = p.city || p.town || p.village || p.district || ""
          const state = p.state || ""
          const postcode = p.postcode || ""
          const country = p.country || ""

          // Build a clean, US/standard formatted address string
          const parts: string[] = []
          if (street) parts.push(street)
          if (city) parts.push(city)
          if (state && postcode) parts.push(`${state} ${postcode}`)
          else if (state) parts.push(state)
          else if (postcode) parts.push(postcode)
          if (country && country !== "United States") parts.push(country)

          const label = parts.join(", ")
          if (label && !seen.has(label)) {
            seen.add(label)
            suggestions.push({
              id: `${p.osm_type || ""}_${p.osm_id || Math.random()}`,
              label,
              street: street || undefined,
              city: city ? `${city}${state ? `, ${state}` : ""}` : undefined,
              state: state || undefined,
              postalCode: postcode || undefined,
              country: country || undefined,
            })
          }
        }

        setCached(queryKey, suggestions)
        return Response.json({ suggestions })
      }
    }
  } catch {
    // If external geocoder fails, return empty so manual entry is used seamlessly
  }

  return Response.json({ suggestions: [] })
}
