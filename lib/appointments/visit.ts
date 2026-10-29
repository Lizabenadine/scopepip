const DAY = /^(\d{4})-(\d{2})-(\d{2})$/
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/

function instantMs(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

/** UTC ISO instant for a visit booked as a local calendar day plus HH:MM. */
export function visitStartInstant(visitDay: string, visitTime: string): string | null {
  const day = DAY.exec(visitDay)
  const clock = CLOCK.exec(visitTime)
  if (!day || !clock) return null
  const year = Number(day[1])
  const month = Number(day[2])
  const date = Number(day[3])
  const hours = Number(clock[1])
  const minutes = Number(clock[2])
  const local = new Date(year, month - 1, date, hours, minutes, 0, 0)
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== date ||
    local.getHours() !== hours ||
    local.getMinutes() !== minutes
  ) {
    return null
  }
  return local.toISOString()
}

export function localDayOfInstant(value: string | null | undefined): string | null {
  const ms = instantMs(value)
  if (ms === null) return null
  const date = new Date(ms)
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function localVisitClock(value: string | null | undefined): string {
  const ms = instantMs(value)
  if (ms === null) return ""
  const date = new Date(ms)
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")
  return `${hours}:${minutes}`
}

export function visitTimeLabel(value: string | null | undefined): string | null {
  const ms = instantMs(value)
  if (ms === null) return null
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(ms)
}

export function appointmentLabel(visitDay: string, estimateVisitAt: string | null | undefined): string {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${visitDay}T12:00:00`))
  const time = visitTimeLabel(estimateVisitAt)
  return time ? `${day} · ${time}` : day
}

export function visitReminderPhrase(
  visitDay: string | null,
  estimateVisitAt: string | null | undefined,
  language: "en" | "es" = "en",
): string {
  const locale = language === "es" ? "es-US" : "en-US"
  const ms = instantMs(estimateVisitAt)
  if (ms !== null) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(ms)
  }
  if (visitDay && DAY.test(visitDay)) {
    const [year, month, date] = visitDay.split("-").map(Number)
    const noon = Date.UTC(year, month - 1, date, 12)
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(noon)
  }
  return language === "es" ? "el día programado" : "the scheduled day"
}
