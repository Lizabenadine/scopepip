"use client"

import { useState } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { useScope } from "@/lib/data/store"
import type { LeadReach } from "@/lib/leads/office-lead"
import { cn } from "@/lib/utils"

export function NewLeadButton({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" data-testid="new-lead" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <NewLeadDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function NewLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { createLead } = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [service, setService] = useState("")
  const [reachedBy, setReachedBy] = useState<LeadReach>("call")
  const [error, setError] = useState<string | null>(null)

  const SERVICES = [
    "Interior Painting",
    "Exterior Painting",
    "Cabinet Refinishing",
    "Commercial Painting",
  ]

  const save = () => {
    const saved = createLead({ name, phone, email, address, reachedBy, service })
    if (!saved.ok) {
      setError(saved.reason)
      return
    }
    setName("")
    setPhone("")
    setEmail("")
    setAddress("")
    setService("")
    setReachedBy("call")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{say("New lead")}</DialogTitle>
          <DialogDescription>
            {say("Save customer details, service requested, and how they reached out.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="lead-name">{say("Customer name")}</Label>
            <Input id="lead-name" data-testid="lead-name" value={name} className="h-11" onValueChange={setName} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="lead-phone">{say("Phone")}</Label>
            <Input id="lead-phone" data-testid="lead-phone" value={phone} inputMode="tel" className="h-11" onValueChange={setPhone} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="lead-email">{say("Email")}</Label>
            <Input id="lead-email" data-testid="lead-email" value={email} inputMode="email" autoComplete="email" className="h-11" onValueChange={setEmail} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="lead-service">{say("Service requested")}</Label>
            <Input
              id="lead-service"
              data-testid="lead-service"
              placeholder={say("e.g. Interior Repaint, Exterior, Cabinets")}
              value={service}
              className="h-11"
              onValueChange={setService}
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                    service === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                  )}
                  onClick={() => setService(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="lead-address">
              {say("Property address")}{" "}
              <span className="text-xs font-normal text-muted-foreground">({say("optional")})</span>
            </Label>
            <Input
              id="lead-address"
              data-testid="lead-address"
              placeholder={say("Optional — can add when scheduling estimate")}
              value={address}
              className="h-11"
              onValueChange={setAddress}
            />
          </div>
          <div className="grid gap-1">
            <Label>{say("Reached by")}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="lead-reach-call"
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium",
                  reachedBy === "call" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
                onClick={() => setReachedBy("call")}
              >
                {say("Call")}
              </button>
              <button
                type="button"
                data-testid="lead-reach-text"
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium",
                  reachedBy === "text" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
                onClick={() => setReachedBy("text")}
              >
                {say("Text")}
              </button>
            </div>
          </div>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" data-testid="lead-save" onClick={save}>
            {say("Save lead")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function newLeadButtonClass(): string {
  return cn(buttonVariants(), "h-9")
}
