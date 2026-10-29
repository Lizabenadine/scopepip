export interface CalendarDay {
  iso: string
  inMonth: boolean
}

export function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function startOfWeek(date: Date): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() - next.getDay())
  return next
}

export function weekDays(anchor: Date): string[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return isoDate(day)
  })
}

export function monthGrid(anchor: Date): CalendarDay[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return {
      iso: isoDate(day),
      inMonth: day.getMonth() === anchor.getMonth(),
    }
  })
}

export function shiftMonth(anchor: Date, delta: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1)
}

export function shiftWeek(anchor: Date, delta: number): Date {
  const next = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  next.setDate(next.getDate() + delta * 7)
  return next
}

export function monthLabel(anchor: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(anchor)
}

export function weekdayLabel(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(parseIsoDate(iso))
}

export function dayNumber(iso: string): string {
  return String(parseIsoDate(iso).getDate())
}
