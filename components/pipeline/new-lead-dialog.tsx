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
  const [reachedBy, setReachedBy] = useState<LeadReach>("call")
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const saved = createLead({ name, phone, email, address, reachedBy })
    if (!saved.ok) {
      setError(saved.reason)
      return
    }
    setName("")
    setPhone("")
    setEmail("")
    setAddress("")
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
            {say("Someone called or texted. Save their name and how to reach them.")}
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
            <Label htmlFor="lead-address">{say("Address")}</Label>
            <Input id="lead-address" data-testid="lead-address" value={address} className="h-11" onValueChange={setAddress} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="lead-reach-call"
              className={cn(
                "h-10 rounded-full px-4 text-sm",
                reachedBy === "call" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
              onClick={() => setReachedBy("call")}
            >
              {say("Call")}
            </button>
            <button
              type="button"
              data-testid="lead-reach-text"
              className={cn(
                "h-10 rounded-full px-4 text-sm",
                reachedBy === "text" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
              onClick={() => setReachedBy("text")}
            >
              {say("Text")}
            </button>
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
