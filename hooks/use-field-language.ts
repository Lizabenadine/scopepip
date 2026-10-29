"use client"

import { useEffect, useState } from "react"
import { fieldCopy, type FieldCopy } from "@/lib/field/copy"
import { readFieldLanguage, writeFieldLanguage, type FieldLanguage } from "@/lib/field/language"

export function useFieldLanguage(): {
  language: FieldLanguage
  setLanguage: (language: FieldLanguage) => void
  copy: FieldCopy
} {
  const [language, setLanguageState] = useState<FieldLanguage>("en")

  useEffect(() => {
    const sync = () => setLanguageState(readFieldLanguage())
    sync()
    window.addEventListener("storage", sync)
    window.addEventListener("scopepipe-field-language", sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("scopepipe-field-language", sync)
    }
  }, [])

  return {
    language,
    setLanguage: (next) => {
      writeFieldLanguage(next)
      setLanguageState(next)
      void fetch("/api/account/language", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: next }),
      }).catch(() => undefined)
    },
    copy: fieldCopy(language),
  }
}
