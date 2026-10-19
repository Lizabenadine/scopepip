const usdExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

export function money(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  const whole = Math.abs(safe - Math.round(safe)) < 0.005
  return (whole ? usdWhole : usdExact).format(safe)
}

export function moneyExact(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)
}

export function compactNumber(value: number): string {
  return numberFormat.format(Number.isFinite(value) ? value : 0)
}

export function percent(margin: number): string {
  return `${Math.round(margin * 100)}%`
}

export function hoursLabel(value: number): string {
  return `${compactNumber(value)} hr`
}

const gallonFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })

export function gallonsLabel(value: number): string {
  return `${gallonFormat.format(Number.isFinite(value) ? value : 0)} gal`
}

export function jobDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`)
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function scopeSummary(input: { areas: { name: string }[] }): string {
  if (input.areas.length === 0) return "No areas yet"
  return input.areas.map((area) => area.name).join(" · ")
}
