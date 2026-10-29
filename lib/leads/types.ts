import type { LeadSource } from "../types.ts"

export interface InboundLead {
  id: string
  source: LeadSource
  name: string
  phone: string
  email: string
  address: string
  message: string
  createdAt: string
  companyId?: string
}

export interface ParsedInbound {
  ok: true
  leads: InboundLead[]
}

export interface RejectedInbound {
  ok: false
  reason: string
}
