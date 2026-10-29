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
  initialTime = "",
  kind = "job",
  language = "en",
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  clientName: string
  initialDate: string | null
  initialTime?: string
  kind?: "job" | "visit"
  language?: FieldLanguage
  onOpenChange: (open: boolean) => void
  onConfirm: (date: string, time?: string) => void
}) {
  const say = (text: string) => officeLabel(text, language)
  const [date, setDate] = useState(initialDate || tomorrow())
  const [time, setTime] = useState(initialTime)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDate(initialDate || tomorrow())
          setTime(initialTime)
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
              : say("Pick the day you're on site. You can change it from the estimate.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="schedule-date">{kind === "visit" ? "Visit day" : say("On site")}</Label>
            <Input
              id="schedule-date"
              data-testid="schedule-date"
              type="date"
              value={date}
              onValueChange={setDate}
              className="h-11"
            />
          </div>
          {kind === "visit" ? (
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
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            className="h-11"
            data-testid="schedule-confirm"
            disabled={kind === "visit" ? !date || !time : !date}
            onClick={() => onConfirm(date, kind === "visit" ? time : undefined)}
          >
            {kind === "visit" ? "Book visit" : say("Schedule job")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
