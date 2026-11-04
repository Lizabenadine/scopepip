export interface MapAddress {
  house_number?: string
  road?: string
  city?: string
  town?: string
  village?: string
  hamlet?: string
  suburb?: string
  state?: string
  postcode?: string
}

/** Street, city, state, and postal code, so a map match is the whole address. */
export function mailingAddress(address: MapAddress, fallback = ""): string {
  const street = [address.house_number, address.road].filter(Boolean).join(" ").trim()
  const city = address.city || address.town || address.village || address.hamlet || address.suburb || ""
  const region = [address.state, address.postcode].filter(Boolean).join(" ").trim()
  const line = [street, city, region].filter(Boolean).join(", ")
  return line || fallback.trim()
}
