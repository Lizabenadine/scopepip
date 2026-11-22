import type { ChecklistItem, Estimate, WorkOrder } from "../types.ts"

function item(id: string, label: string): ChecklistItem {
  return { id, label, done: false }
}

export function defaultChecklist(estimate: Estimate): ChecklistItem[] {
  const checklist: ChecklistItem[] = []

  // Flooring tasks
  if (estimate.flooringScope?.rooms && estimate.flooringScope.rooms.length > 0) {
    checklist.push(item(`${estimate.id}:floor-prep`, "Inspect subfloor, check moisture level, and vacuum/level"))
    for (const room of estimate.flooringScope.rooms) {
      checklist.push(item(`${estimate.id}:floor-${room.id}`, `Install ${room.materialType || "flooring"} in ${room.name}`))
    }
    checklist.push(item(`${estimate.id}:floor-trim`, "Install transition strips, thresholds, baseboards, and quarter round"))
  }

  // Drywall tasks
  if (estimate.drywallScope?.rooms && estimate.drywallScope.rooms.length > 0) {
    checklist.push(item(`${estimate.id}:drywall-hang-prep`, "Inspect framing, install backing, and verify sheet layout"))
    for (const room of estimate.drywallScope.rooms) {
      checklist.push(item(`${estimate.id}:drywall-hang-${room.id}`, `Hang drywall sheets in ${room.name}`))
      checklist.push(item(`${estimate.id}:drywall-finish-${room.id}`, `Tape and finish Level ${room.finishLevel} mud coats in ${room.name}`))
    }
    checklist.push(item(`${estimate.id}:drywall-sand`, "Final sand drywall, check for flaws under light, and wipe clean"))
  }

  // Painting tasks
  if (estimate.areas && estimate.areas.length > 0) {
    checklist.push(
      item(`${estimate.id}:cover`, "Cover floors, furniture, and fixtures"),
      item(`${estimate.id}:prep`, "Patch, sand, and caulk"),
    )
    for (const area of estimate.areas) {
      checklist.push(item(`${estimate.id}:${area.id}`, `Paint ${area.name}`))
    }
  }

  // Default fallback if no rooms yet
  if (checklist.length === 0) {
    checklist.push(
      item(`${estimate.id}:setup`, "Jobsite staging and surface protection"),
      item(`${estimate.id}:production`, "Execute scope of work per proposal specifications"),
    )
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
