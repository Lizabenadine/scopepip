import type { PhotoTag } from "../types.ts"
import { fieldLocale, type FieldLanguage } from "./language.ts"

const TASKS: Record<string, string> = {
  "Cover floors, furniture, and fixtures": "Cubrir pisos, muebles y accesorios",
  "Patch, sand, and caulk": "Resanar, lijar y sellar juntas",
  "Walk the punch list": "Revisar la lista de detalles",
  "Clean up and haul trash": "Limpiar y sacar la basura",
}

const PHOTO_TAGS: Record<PhotoTag, string> = {
  before: "Antes",
  in_progress: "En proceso",
  after: "Después",
  prep_concern: "Problema de preparación",
  touch_up: "Retoque",
}

const PREP_LEVELS: Record<string, string> = {
  "Light prep": "Preparación ligera",
  "Standard prep": "Preparación estándar",
  "Heavy prep": "Preparación fuerte",
}

const numberFormat = {
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }),
  es: new Intl.NumberFormat("es-US", { maximumFractionDigits: 1 }),
}

const gallonFormat = {
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
  es: new Intl.NumberFormat("es-US", { maximumFractionDigits: 2 }),
}

export function fieldChecklistLabel(label: string, language: FieldLanguage): string {
  if (language === "en") return label
  const exact = TASKS[label]
  if (exact) return exact
  const paint = /^Paint (.+)$/.exec(label)
  if (paint) return `Pintar ${paint[1]}`
  return label
}

export function fieldHours(value: number, language: FieldLanguage): string {
  const safe = Number.isFinite(value) ? value : 0
  return language === "es" ? `${numberFormat.es.format(safe)} h` : `${numberFormat.en.format(safe)} hr`
}

export function fieldGallons(value: number, language: FieldLanguage): string {
  const safe = Number.isFinite(value) ? value : 0
  return `${gallonFormat[language].format(safe)} gal`
}

export function fieldJobDate(isoDate: string, language: FieldLanguage): string {
  const date = new Date(`${isoDate}T12:00:00`)
  return new Intl.DateTimeFormat(fieldLocale(language), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function fieldSignedWhen(iso: string, language: FieldLanguage): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(fieldLocale(language), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function fieldUnit(unit: string, language: FieldLanguage): string {
  if (language === "en") return unit
  if (unit === "Job") return "Trabajo"
  if (unit === "hr") return "h"
  if (unit === "Ea") return "c/u"
  return unit
}

export function fieldPhotoTag(tag: string, language: FieldLanguage): string {
  if (language === "en") {
    if (tag === "before") return "Before"
    if (tag === "in_progress") return "In progress"
    if (tag === "after") return "After"
    if (tag === "prep_concern") return "Prep concern"
    if (tag === "touch_up") return "Touch-up"
    return "In progress"
  }
  if (tag === "before" || tag === "in_progress" || tag === "after" || tag === "prep_concern" || tag === "touch_up") {
    return PHOTO_TAGS[tag]
  }
  return "En proceso"
}

export function fieldPhotoLinkLabel(label: string, language: FieldLanguage): string {
  if (language === "en") return label
  if (label.startsWith("Prep · ")) return `Preparación · ${label.slice("Prep · ".length)}`
  if (label === "Prep notes") return "Notas de preparación"
  if (label === "Whole job") return "Todo el trabajo"
  if (label === "Touch-up") return "Retoque"
  if (label === "Line item") return "Partida"
  if (label === "Not specified") return "Sin especificar"
  return label
}

export function fieldPhotoDetail(detail: string, language: FieldLanguage): string {
  if (language === "en" || !detail) return detail
  if (detail === "No prep note yet.") return "Todavía no hay nota de preparación."
  if (detail === "No line item on this job.") return "No hay partida en este trabajo."
  for (const [english, spanish] of Object.entries(PREP_LEVELS)) {
    if (detail === english) return spanish
    if (detail.startsWith(`${english} · `)) return `${spanish} · ${detail.slice(english.length + 3)}`
  }
  return detail
}

export type FieldCopy = {
  hours: (value: number) => string
  gallons: (value: number) => string
  jobDate: (isoDate: string) => string
  signedWhen: (iso: string) => string
  checklistLabel: (label: string) => string
  unit: (unit: string) => string
  photoTag: (tag: string) => string
  photoLink: (label: string) => string
  photoDetail: (detail: string) => string
  workOrdersTitle: string
  acceptedEmpty: string
  acceptedCount: (count: number) => string
  noActiveJobs: string
  status: Record<"unscheduled" | "scheduled" | "in_progress" | "complete", string>
  crewSheetWaits: string
  crewSheetWaitsDetail: string
  backToWorkOrders: string
  openEstimate: string
  missingOrder: string
  backToJobs: string
  workOrders: string
  jobs: string
  crewProduction: string
  onSiteNow: string
  onSite: string
  targetHours: string
  showAllHours: string
  hideItemHours: string
  hideAllHours: string
  paintSpec: string
  primer: (count: number) => string
  finish: (count: number) => string
  lineItems: string
  pendingWork: string
  approvedChanges: string
  signed: string
  checklist: string
  checklistProgress: (done: number, total: number) => string
  subOrder: string
  customer: string
  phone: string
  salesRep: string
  generated: string
  jobPhotos: string
  openCompanyCam: string
  colors: string
  fromEstimate: string
  noPaint: string
  scopePrep: string
  scopePlaceholder: string
  surfacePrep: string
  noPrep: string
  includedAreas: string
  noAreas: string
  exclusions: string
  noneListed: string
  installerItems: string
  noInstallerItems: string
  signOff: string
  subCopy: string
  signOffBody: string
  acceptedSigned: string
  signedBy: string
  printedName: string
  crewLeadName: string
  date: string
  acceptSign: string
  notSpecified: string
  dispatch: string
  dispatchSummary: (count: number) => string
  calendarLink: string
  crewLeads: string
  columnEmpty: Record<"unscheduled" | "scheduled" | "in_progress" | "complete", string>
  notified: string
  statusLabel: string
  statusFor: (name: string) => string
  crewLead: string
  crewFor: (name: string) => string
  unassigned: string
  startDate: string
  startDateFor: (name: string) => string
  calendarTitle: string
  dispatchBoard: string
  rangeLabel: string
  week: string
  month: string
  previous: string
  today: string
  next: string
  crewColors: string
  nextJob: string
  more: (count: number) => string
  customerSignsPending: string
  pendingTitle: string
  pendingBody: string
  createChange: string
  changeTitle: string
  changeBody: string
  scopeReason: string
  changePlaceholder: string
  additionalAmount: string
  cancel: string
  applying: string
  signAndApply: string
  changeError: string
  changeFailed: string
  companyCam: string
  companyCamLinked: string
  companyCamUnlinked: string
  lastSync: string
  syncing: string
  syncCompanyCam: string
  sitePhotos: string
  noSitePhotos: string
  tag: string
  photoTagAria: string
  linksTo: string
  photoLinkAria: string
  caption: string
  captionPlaceholder: string
  uploading: string
  takePhoto: string
  photoLibrary: string
  siteUpdate: string
  sitePhoto: string
  photosButton: (count: number) => string
  photosEmptyTitle: string
  photosCount: (count: number) => string
  photosEmptyBody: string
  crewCopy: string
}

const english: FieldCopy = {
  hours: (value) => fieldHours(value, "en"),
  gallons: (value) => fieldGallons(value, "en"),
  jobDate: (isoDate) => fieldJobDate(isoDate, "en"),
  signedWhen: (iso) => fieldSignedWhen(iso, "en"),
  checklistLabel: (label) => fieldChecklistLabel(label, "en"),
  unit: (unit) => fieldUnit(unit, "en"),
  photoTag: (tag) => fieldPhotoTag(tag, "en"),
  photoLink: (label) => fieldPhotoLinkLabel(label, "en"),
  photoDetail: (detail) => fieldPhotoDetail(detail, "en"),
  workOrdersTitle: "Work Orders",
  acceptedEmpty: "Accepted work shows up here.",
  acceptedCount: (count) => `${count} accepted ${count === 1 ? "job" : "jobs"}`,
  noActiveJobs: "No active jobs yet.",
  status: {
    unscheduled: "Unscheduled",
    scheduled: "Scheduled",
    in_progress: "In progress",
    complete: "Complete",
  },
  crewSheetWaits: "Crew sheet opens after this job is scheduled",
  crewSheetWaitsDetail: "Hours, dimensions, prep notes, and paint specs come from the scheduled estimate.",
  backToWorkOrders: "Back to work orders",
  openEstimate: "Open the estimate",
  missingOrder: "This work order isn't on this device",
  backToJobs: "Back to jobs",
  workOrders: "Work orders",
  jobs: "Jobs",
  crewProduction: "Crew production",
  onSiteNow: "On site now",
  onSite: "On site",
  targetHours: "Target labor hours",
  showAllHours: "Show all hours",
  hideItemHours: "Hide item hours",
  hideAllHours: "Hide all hours",
  paintSpec: "Paint spec",
  primer: (count) => `${count} primer`,
  finish: (count) => `${count} finish`,
  lineItems: "Line items",
  pendingWork: "Pending additional work",
  approvedChanges: "Approved on-site change orders",
  signed: "Signed",
  checklist: "Checklist",
  checklistProgress: (done, total) => `${done} of ${total}`,
  subOrder: "Subcontractor Work Order",
  customer: "Customer",
  phone: "Phone",
  salesRep: "Sales Rep",
  generated: "Generated",
  jobPhotos: "Job photos and site documentation: view progress and prep photos in CompanyCam.",
  openCompanyCam: "Open CompanyCam",
  colors: "Paint colors and finishes",
  fromEstimate: "From the estimate",
  noPaint: "No paint products on this estimate.",
  scopePrep: "Scope of work and preparation",
  scopePlaceholder: "Enter detailed scope, prep notes, or painting instructions...",
  surfacePrep: "Surface preparation",
  noPrep: "No prep steps on this work order.",
  includedAreas: "Included application areas",
  noAreas: "No areas on this work order.",
  exclusions: "Explicit exclusions",
  noneListed: "None listed on this work order.",
  installerItems: "Installer line items and deliverables",
  noInstallerItems: "No installer line items on this work order.",
  signOff: "Subcontractor acceptance sign-off",
  subCopy: "Subcontractor copy",
  signOffBody:
    "By signing below, the crew lead acknowledges receipt of this work order, confirms review of the color schedule and surface preparation, and agrees to perform the work in the outlined scope.",
  acceptedSigned: "Work order accepted and signed",
  signedBy: "Signed by",
  printedName: "Subcontractor / crew lead printed name",
  crewLeadName: "Crew lead name",
  date: "Date",
  acceptSign: "Accept and sign subcontractor copy",
  notSpecified: "Not specified",
  dispatch: "Dispatch",
  dispatchSummary: (count) =>
    `${count} accepted ${count === 1 ? "job" : "jobs"}. Drag a card or pick a crew lead.`,
  calendarLink: "Calendar",
  crewLeads: "Crew leads",
  columnEmpty: {
    unscheduled: "Accepted jobs land here until a crew and a day are set.",
    scheduled: "Drop a job to put it on the calendar.",
    in_progress: "Drop a job when the crew is on site.",
    complete: "Finished jobs stay here.",
  },
  notified: "notified",
  statusLabel: "Status",
  statusFor: (name) => `Status for ${name}`,
  crewLead: "Crew lead",
  crewFor: (name) => `Crew for ${name}`,
  unassigned: "Unassigned",
  startDate: "Start date",
  startDateFor: (name) => `Start date for ${name}`,
  calendarTitle: "Calendar",
  dispatchBoard: "Dispatch board",
  rangeLabel: "Calendar range",
  week: "Week",
  month: "Month",
  previous: "Previous",
  today: "Today",
  next: "Next",
  crewColors: "Crew colors",
  nextJob: "Next",
  more: (count) => `+${count} more`,
  customerSignsPending: "Customer signs pending work",
  pendingTitle: "Pending additional work",
  pendingBody: "The customer signs the extra work. A reduction becomes a credit, and this sheet keeps the price off.",
  createChange: "Create on-site change order",
  changeTitle: "On-site change order",
  changeBody: "The client signs the extra work. The invoice updates, and this sheet keeps the price off.",
  scopeReason: "Scope / reason",
  changePlaceholder: "Extra wood rot repair on fascia",
  additionalAmount: "Additional amount",
  cancel: "Cancel",
  applying: "Applying",
  signAndApply: "Sign and apply",
  changeError: "Add the scope, the amount, and the client's signature.",
  changeFailed: "Could not apply the change order.",
  companyCam: "CompanyCam sync",
  companyCamLinked: "Pulls the matching project and its photos. The saved link on this job is separate.",
  companyCamUnlinked: "Pulls the matching project and its photos. A saved link is not this sync.",
  lastSync: "Last sync",
  syncing: "Syncing...",
  syncCompanyCam: "Sync CompanyCam",
  sitePhotos: "Site photos",
  noSitePhotos: "No site photos yet. Take one before you start, and another when the room is done.",
  tag: "Tag",
  photoTagAria: "Photo tag",
  linksTo: "Links to",
  photoLinkAria: "Photo link",
  caption: "Caption",
  captionPlaceholder: "North wall, first coat",
  uploading: "Uploading…",
  takePhoto: "Take photo",
  photoLibrary: "Photo library",
  siteUpdate: "Site update",
  sitePhoto: "Site photo",
  photosButton: (count) => (count > 0 ? `Site photos (${count})` : "Site photos"),
  photosEmptyTitle: "Nothing from the job site yet.",
  photosCount: (count) => `${count} from this work order.`,
  photosEmptyBody: "Photos the crew takes on the work order show up here, tagged to the room, the prep note, or a line item.",
  crewCopy: "Crew copy. Prices stay on the estimate.",
}

const spanish: FieldCopy = {
  hours: (value) => fieldHours(value, "es"),
  gallons: (value) => fieldGallons(value, "es"),
  jobDate: (isoDate) => fieldJobDate(isoDate, "es"),
  signedWhen: (iso) => fieldSignedWhen(iso, "es"),
  checklistLabel: (label) => fieldChecklistLabel(label, "es"),
  unit: (unit) => fieldUnit(unit, "es"),
  photoTag: (tag) => fieldPhotoTag(tag, "es"),
  photoLink: (label) => fieldPhotoLinkLabel(label, "es"),
  photoDetail: (detail) => fieldPhotoDetail(detail, "es"),
  workOrdersTitle: "Órdenes de trabajo",
  acceptedEmpty: "El trabajo aceptado aparece aquí.",
  acceptedCount: (count) => `${count} ${count === 1 ? "trabajo aceptado" : "trabajos aceptados"}`,
  noActiveJobs: "Todavía no hay trabajos activos.",
  status: {
    unscheduled: "Sin programar",
    scheduled: "Programado",
    in_progress: "En proceso",
    complete: "Terminado",
  },
  crewSheetWaits: "La hoja de la cuadrilla se abre cuando el trabajo está programado",
  crewSheetWaitsDetail: "Las horas, medidas, notas de preparación y la pintura salen del estimado programado.",
  backToWorkOrders: "Volver a órdenes de trabajo",
  openEstimate: "Abrir el estimado",
  missingOrder: "Esta orden de trabajo no está en este aparato",
  backToJobs: "Volver a trabajos",
  workOrders: "Órdenes de trabajo",
  jobs: "Trabajos",
  crewProduction: "Producción de la cuadrilla",
  onSiteNow: "En el sitio ahora",
  onSite: "En el sitio",
  targetHours: "Horas de trabajo",
  showAllHours: "Ver todas las horas",
  hideItemHours: "Ocultar horas por partida",
  hideAllHours: "Ocultar todas las horas",
  paintSpec: "Pintura",
  primer: (count) => (count === 1 ? `${count} imprimación` : `${count} imprimaciones`),
  finish: (count) => (count === 1 ? `${count} acabado` : `${count} acabados`),
  lineItems: "Partidas",
  pendingWork: "Trabajo adicional pendiente",
  approvedChanges: "Órdenes de cambio aprobadas en el sitio",
  signed: "Firmado",
  checklist: "Tareas del día",
  checklistProgress: (done, total) => `${done} de ${total}`,
  subOrder: "Orden de trabajo del subcontratista",
  customer: "Cliente",
  phone: "Teléfono",
  salesRep: "Vendedor",
  generated: "Generada",
  jobPhotos: "Fotos del trabajo y del sitio: ve el avance y la preparación en CompanyCam.",
  openCompanyCam: "Abrir CompanyCam",
  colors: "Colores y acabados",
  fromEstimate: "Del estimado",
  noPaint: "Este estimado no tiene productos de pintura.",
  scopePrep: "Alcance y preparación",
  scopePlaceholder: "Escribe el alcance, las notas de preparación o las instrucciones de pintura...",
  surfacePrep: "Preparación de superficies",
  noPrep: "Esta orden no tiene pasos de preparación.",
  includedAreas: "Áreas incluidas",
  noAreas: "Esta orden no tiene áreas.",
  exclusions: "Exclusiones",
  noneListed: "No hay exclusiones en esta orden.",
  installerItems: "Partidas del instalador",
  noInstallerItems: "Esta orden no tiene partidas del instalador.",
  signOff: "Firma de aceptación del subcontratista",
  subCopy: "Copia del subcontratista",
  signOffBody:
    "Al firmar, el líder de cuadrilla confirma que recibió esta orden, revisó los colores y la preparación, y acepta hacer el trabajo del alcance.",
  acceptedSigned: "Orden aceptada y firmada",
  signedBy: "Firmado por",
  printedName: "Nombre del subcontratista o líder de cuadrilla",
  crewLeadName: "Nombre del líder",
  date: "Fecha",
  acceptSign: "Aceptar y firmar la copia del subcontratista",
  notSpecified: "Sin especificar",
  dispatch: "Despacho",
  dispatchSummary: (count) =>
    `${count} ${count === 1 ? "trabajo aceptado" : "trabajos aceptados"}. Arrastra una tarjeta o elige un líder de cuadrilla.`,
  calendarLink: "Calendario",
  crewLeads: "Líderes de cuadrilla",
  columnEmpty: {
    unscheduled: "Los trabajos aceptados llegan aquí hasta asignar cuadrilla y día.",
    scheduled: "Suelta un trabajo para ponerlo en el calendario.",
    in_progress: "Suelta un trabajo cuando la cuadrilla está en el sitio.",
    complete: "Los trabajos terminados se quedan aquí.",
  },
  notified: "avisado",
  statusLabel: "Estado",
  statusFor: (name) => `Estado de ${name}`,
  crewLead: "Líder de cuadrilla",
  crewFor: (name) => `Cuadrilla de ${name}`,
  unassigned: "Sin asignar",
  startDate: "Fecha de inicio",
  startDateFor: (name) => `Fecha de inicio de ${name}`,
  calendarTitle: "Calendario",
  dispatchBoard: "Tablero de despacho",
  rangeLabel: "Rango del calendario",
  week: "Semana",
  month: "Mes",
  previous: "Anterior",
  today: "Hoy",
  next: "Siguiente",
  crewColors: "Colores de cuadrilla",
  nextJob: "Siguiente",
  more: (count) => `+${count} más`,
  customerSignsPending: "El cliente firma el trabajo pendiente",
  pendingTitle: "Trabajo adicional pendiente",
  pendingBody: "El cliente firma el trabajo extra. Una reducción queda como crédito, y esta hoja no muestra el precio.",
  createChange: "Crear orden de cambio en el sitio",
  changeTitle: "Orden de cambio en el sitio",
  changeBody: "El cliente firma el trabajo extra. La factura se actualiza, y esta hoja no muestra el precio.",
  scopeReason: "Alcance / motivo",
  changePlaceholder: "Reparación extra de madera podrida en el fascia",
  additionalAmount: "Monto adicional",
  cancel: "Cancelar",
  applying: "Aplicando",
  signAndApply: "Firmar y aplicar",
  changeError: "Agrega el alcance, el monto y la firma del cliente.",
  changeFailed: "No se pudo aplicar la orden de cambio.",
  companyCam: "Sincronizar CompanyCam",
  companyCamLinked: "Trae el proyecto que coincide y sus fotos. El enlace guardado de este trabajo es aparte.",
  companyCamUnlinked: "Trae el proyecto que coincide y sus fotos. Un enlace guardado no es esta sincronización.",
  lastSync: "Última sincronización",
  syncing: "Sincronizando...",
  syncCompanyCam: "Sincronizar CompanyCam",
  sitePhotos: "Fotos del sitio",
  noSitePhotos: "Todavía no hay fotos. Toma una antes de empezar y otra cuando el cuarto esté listo.",
  tag: "Etiqueta",
  photoTagAria: "Etiqueta de la foto",
  linksTo: "Se vincula a",
  photoLinkAria: "Vínculo de la foto",
  caption: "Descripción",
  captionPlaceholder: "Pared norte, primera mano",
  uploading: "Subiendo…",
  takePhoto: "Tomar foto",
  photoLibrary: "Fotos del teléfono",
  siteUpdate: "Actualización del sitio",
  sitePhoto: "Foto del sitio",
  photosButton: (count) => (count > 0 ? `Fotos del sitio (${count})` : "Fotos del sitio"),
  photosEmptyTitle: "Todavía no hay fotos del sitio.",
  photosCount: (count) => `${count} de esta orden de trabajo.`,
  photosEmptyBody: "Las fotos que la cuadrilla toma en la orden aparecen aquí, ligadas al cuarto, la nota de preparación o una partida.",
  crewCopy: "Copia para la cuadrilla. Los precios se quedan en el estimado.",
}

const JOB_HEADINGS: Record<string, { label: string; empty: string }> = {
  "Project Accepted": { label: "Proyecto aceptado", empty: "Los proyectos aceptados llegan aquí." },
  "Project Scheduled": { label: "Proyecto programado", empty: "Nada está en el calendario." },
  "Project In Progress": { label: "Proyecto en proceso", empty: "Ninguna cuadrilla está en el sitio." },
  "Project Completed": { label: "Proyecto terminado", empty: "Los proyectos terminados llegan aquí." },
  "Jobs Pipeline": { label: "Trabajos", empty: "" },
  "Progress jobs": { label: "Trabajos en proceso", empty: "" },
  "Crew board": { label: "Tablero de cuadrilla", empty: "" },
  "No address yet": { label: "Todavía no hay dirección", empty: "" },
  "Not priced": { label: "Sin precio", empty: "" },
  "Sales Pipeline": { label: "Pipeline de ventas", empty: "" },
  "Cold Leads": { label: "Prospectos fríos", empty: "No hay prospectos fríos en esta vista." },
  "Warm Leads": { label: "Prospectos tibios", empty: "No hay prospectos tibios en esta vista." },
  "Estimate Requested": { label: "Estimado solicitado", empty: "No hay solicitudes de estimado en esta vista." },
  "Estimate Scheduled": { label: "Visita programada", empty: "No hay visitas agendadas." },
  "Proposal Sent": { label: "Propuesta enviada", empty: "No hay propuestas afuera." },
}

export function fieldJobHeading(label: string, language: FieldLanguage): string {
  if (language === "en") return label
  return JOB_HEADINGS[label]?.label ?? label
}

export function fieldJobEmpty(label: string, empty: string, language: FieldLanguage): string {
  if (language === "en") return empty
  return JOB_HEADINGS[label]?.empty || empty
}

export function fieldCopy(language: FieldLanguage): FieldCopy {
  return language === "es" ? spanish : english
}
