"use client"

import { useSyncExternalStore } from "react"

function subscribe() {
  return () => {}
}

let anchorMs = 0

function readAnchor() {
  if (anchorMs === 0) anchorMs = Date.now()
  return anchorMs
}

function readNoAnchor() {
  return 0
}

/** A client clock. The server render stays empty so the markup matches hydration. */
export function useClientNow(): number | null {
  const value = useSyncExternalStore(subscribe, readAnchor, readNoAnchor)
  return value === 0 ? null : value
}

let pageOrigin = ""

function readOrigin() {
  if (!pageOrigin) pageOrigin = window.location.origin
  return pageOrigin
}

function readNoOrigin() {
  return ""
}

export function usePageOrigin(): string {
  return useSyncExternalStore(subscribe, readOrigin, readNoOrigin)
}
