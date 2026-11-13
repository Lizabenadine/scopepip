"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { MapPin, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddressSuggestion {
  id: string
  label: string
  street?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export interface AddressAutocompleteProps {
  id?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export function AddressAutocomplete({
  id = "job-address",
  value = "",
  onChange,
  placeholder = "Street, city, state, zip",
  className,
  disabled,
  required,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Keep internal input in sync if parent updates value directly
  useEffect(() => {
    setInputValue(value || "")
  }, [value])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [])

  function fetchSuggestions(query: string) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/address/autocomplete?q=${encodeURIComponent(trimmed)}`)
        if (response.ok) {
          const data = (await response.json()) as { suggestions?: AddressSuggestion[] }
          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setSuggestions(data.suggestions)
            setIsOpen(true)
            setHighlightedIndex(-1)
          } else {
            setSuggestions([])
            setIsOpen(false)
          }
        }
      } catch {
        // Fallback silently to manual entry
        setSuggestions([])
        setIsOpen(false)
      } finally {
        setIsLoading(false)
      }
    }, 250)
  }

  function handleInputChange(text: string) {
    setInputValue(text)
    onChange(text) // Always save manual typing immediately
    fetchSuggestions(text)
  }

  function handleSelectSuggestion(suggestion: AddressSuggestion) {
    setInputValue(suggestion.label)
    onChange(suggestion.label)
    setIsOpen(false)
    setSuggestions([])
    inputRef.current?.focus()
  }

  function handleClear() {
    setInputValue("")
    onChange("")
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true)
        setHighlightedIndex(0)
        event.preventDefault()
      }
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (event.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        event.preventDefault()
        handleSelectSuggestion(suggestions[highlightedIndex])
      }
    } else if (event.key === "Escape") {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="street-address"
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          data-testid="address-autocomplete-input"
          className={cn(
            "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none",
            "placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : inputValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              title="Clear address"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Google Maps-style Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 ? (
        <ul
          role="listbox"
          aria-label="Address suggestions"
          data-testid="address-suggestions-list"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          {suggestions.map((suggestion, index) => {
            const isHighlighted = index === highlightedIndex
            return (
              <li
                key={suggestion.id}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent blur before click
                  handleSelectSuggestion(suggestion)
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors select-none",
                  isHighlighted
                    ? "bg-cyan-50 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-100"
                    : "hover:bg-slate-50 text-slate-800 dark:hover:bg-slate-800/60 dark:text-slate-200",
                )}
                data-testid={`address-suggestion-${index}`}
              >
                <MapPin className="size-4 shrink-0 text-cyan-600 mt-0.5 dark:text-cyan-400" aria-hidden="true" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-xs leading-snug truncate">
                    {suggestion.street || suggestion.label.split(",")[0]}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight truncate">
                    {suggestion.city || suggestion.label}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
