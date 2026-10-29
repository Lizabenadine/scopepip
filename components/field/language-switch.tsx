"use client"

import { useFieldLanguage } from "@/hooks/use-field-language"
import { cn } from "@/lib/utils"

export function FieldLanguageSwitch() {
  const { language, setLanguage } = useFieldLanguage()

  return (
    <div
      role="group"
      aria-label={language === "es" ? "Idioma" : "Language"}
      data-testid="field-language"
      className="inline-flex rounded-full bg-slate-100 p-0.5"
    >
      <LanguageButton active={language === "en"} label="English" testId="field-language-en" onClick={() => setLanguage("en")} />
      <LanguageButton active={language === "es"} label="Español" testId="field-language-es" onClick={() => setLanguage("es")} />
    </div>
  )
}

function LanguageButton({
  active,
  label,
  testId,
  onClick,
}: {
  active: boolean
  label: string
  testId: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-sm font-medium",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
      )}
    >
      {label}
    </button>
  )
}
