import type { ChecklistItem, Estimate, WorkOrder } from "../types.ts"

function item(id: string, label: string): ChecklistItem {
  return { id, label, done: false }
}

export function defaultChecklist(estimate: Estimate): ChecklistItem[] {
  const checklist = [
    item(`${estimate.id}:cover`, "Cover floors, furniture, and fixtures"),
    item(`${estimate.id}:prep`, "Patch, sand, and caulk"),
  ]
  for (const area of estimate.areas) {
    checklist.push(item(`${estimate.id}:${area.id}`, `Paint ${area.name}`))
  }
  checklist.push(
    item(`${estimate.id}:punch`, "Walk the punch list"),
    item(`${estimate.id}:clean`, "Clean up and haul trash"),
  )
  return checklist
}

export function createWorkOrder(estimate: Estimate): WorkOrder {
  return {
    estimateId: estimate.id,
    prepNotes: estimate.crewNote || estimate.notes,
    prepNotesEs: estimate.crewNote.trim() ? estimate.crewNoteEs : estimate.notesEs,
    hourDisplay: "all",
    checklist: defaultChecklist(estimate),
    photos: [],
    status: "unscheduled",
    assignedCrewId: null,
    scheduledStartDate: null,
    notifiedAt: null,
  }
}
