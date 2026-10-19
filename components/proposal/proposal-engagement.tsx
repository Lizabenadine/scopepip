"use client"

import { useEffect } from "react"

const reported = new Set<string>()

export function ProposalEngagement({ proposalId }: { proposalId: string }) {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-proposal-section]")
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const sectionName = entry.target.getAttribute("data-proposal-section")
          if (!sectionName) continue
          postOnce(`${proposalId}:view_section:${sectionName}`, proposalId, sectionName)
        }
      },
      { threshold: 0.45 },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [proposalId])

  return null
}

function postOnce(key: string, proposalId: string, sectionName: string) {
  if (reported.has(key)) return
  reported.add(key)
  void send(proposalId, sectionName)
}

function send(proposalId: string, sectionName: string) {
  return fetch(`/api/proposals/${encodeURIComponent(proposalId)}/engagement`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType: "view_section", sectionName }),
  }).catch(() => undefined)
}
