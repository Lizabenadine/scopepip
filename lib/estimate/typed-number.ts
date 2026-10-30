/** Keep a typed percent such as 10, or 10%, as digits until the field blurs. */
export function cleanTypedNumber(value: string, allowNegative = false): string {
  const negative = allowNegative && value.trim().startsWith("-")
  const cleaned = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
  return negative ? `-${cleaned}` : cleaned
}

export function readTypedNumber(value: string): number {
  if (value === "" || value === "." || value === "-" || value === "-.") return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
