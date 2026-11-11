"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import type { FieldLanguage } from "@/lib/field/language"
import { officeLabel, officeScheduleTitle } from "@/lib/office/dashboard-copy"
import type { CrewLead } from "@/lib/types"

function tomorrow(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function ScheduleDialog({
  open,
  clientName,
  initialDate,
  initialCrewId = null,
  crews = [],
  initialTime = "",
  initialAddress = "",
  kind = "job",
  language = "en",
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  clientName: string
  initialDate: string | null
  initialCrewId?: string | null
  crews?: CrewLead[]
  initialTime?: string
  initialAddress?: string
  kind?: "job" | "visit"
  language?: FieldLanguage
  onOpenChange: (open: boolean) => void
  onConfirm: (date: string, time?: string, address?: string, crewId?: string | null) => void
}) {
  const say = (text: string) => officeLabel(text, language)
  const [date, setDate] = useState(kind === "visit" ? (initialDate || tomorrow()) : (initialDate ?? ""))
  const [crewId, setCrewId] = useState(initialCrewId ?? "")
  const [time, setTime] = useState(initialTime)
  const [address, setAddress] = useState(initialAddress)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDate(kind === "visit" ? (initialDate || tomorrow()) : (initialDate ?? ""))
          setCrewId(initialCrewId ?? "")
          setTime(initialTime)
          setAddress(initialAddress)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kind === "visit" ? `Estimate visit for ${clientName}` : officeScheduleTitle(clientName, language)}</DialogTitle>
          <DialogDescription>
            {kind === "visit"
              ? "Pick the day and the start time. The reminder is counted back from that start."
              : say("Pick the start date and assigned crew for this job.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="schedule-date">{kind === "visit" ? "Visit day" : say("On site")}</Label>
              {kind === "job" && date ? (
                <button
                  type="button"
                  onClick={() => setDate("")}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear date
                </button>
              ) : null}
            </div>
            <Input
              id="schedule-date"
              data-testid="schedule-date"
              type="date"
              value={date}
              onValueChange={setDate}
              className="h-11"
            />
          </div>
          {kind === "job" && crews.length > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="schedule-crew">{say("Assigned crew")}</Label>
              <select
                id="schedule-crew"
                data-testid="schedule-crew"
                value={crewId}
                onChange={(event) => setCrewId(event.target.value)}
                className="h-11 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Unassigned</option>
                {crews.map((crew) => (
                  <option key={crew.id} value={crew.id}>
                    {crew.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {kind === "visit" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="schedule-time">Start time</Label>
                <Input
                  id="schedule-time"
                  data-testid="schedule-time"
                  type="time"
                  value={time}
                  onValueChange={setTime}
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="schedule-address">{say("Property address")}</Label>
                <Input
                  id="schedule-address"
                  data-testid="schedule-address"
                  placeholder={say("123 Main St, City, ST")}
                  value={address}
                  onValueChange={setAddress}
                  className="h-11"
                />
              </div>
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            className="h-11"
            data-testid="schedule-confirm"
            disabled={kind === "visit" ? !date || !time : !date && !crewId && !initialDate && !initialCrewId}
            onClick={() => onConfirm(date, kind === "visit" ? time : undefined, address, crewId || null)}
          >
            {kind === "visit" ? "Book visit" : say("Schedule job")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
