"use client"

import { useRef, useState } from "react"
import { cleanTypedNumber, readTypedNumber } from "@/lib/estimate/typed-number"

export function useTypedNumber(
  value: number,
  onChange: (value: number) => void,
  allowNegative = false,
) {
  const [text, setText] = useState<string | null>(null)
  const editing = useRef(false)
  const latest = useRef(String(value))

  return {
    value: text ?? String(value),
    onFocus() {
      // A phone fires focus again after the first digit and was putting the field back to 0.
      if (editing.current) return
      editing.current = true
      const initial = value === 0 ? "" : String(value)
      latest.current = initial
      setText(initial)
    },
    onBlur() {
      editing.current = false
      onChange(readTypedNumber(latest.current))
      setText(null)
    },
    onValueChange(next: string) {
      const shown = cleanTypedNumber(next, allowNegative)
      latest.current = shown
      setText(shown)
      onChange(readTypedNumber(shown))
    },
  }
}
