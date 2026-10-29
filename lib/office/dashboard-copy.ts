import { fieldJobDate } from "../field/copy.ts"
import type { FieldLanguage } from "../field/language.ts"
import { translatePainting } from "../field/terms.ts"
import type { StageSlug } from "../types.ts"

const LABELS: Record<string, string> = {
  Dashboard: "Tablero",
  Sales: "Ventas",
  Jobs: "Trabajos",
  Daily: "Diario",
  Documents: "Documentos",
  Docs: "Docs",
  Settings: "Ajustes",
  Invoices: "Facturas",
  "Sales Pipeline": "Pipeline de ventas",
  Estimator: "Estimador",
  Clients: "Clientes",
  "Work Orders": "Órdenes de trabajo",
  "Dispatch & Map": "Despacho y mapa",
  "Progress jobs": "Trabajos en proceso",
  Appointments: "Citas",
  Inbox: "Bandeja",
  "Follow-ups": "Seguimientos",
  Proposals: "Propuestas",
  "Invoices & Payments": "Facturas y pagos",
  "Daily Operations": "Operaciones del día",
  "Sign out": "Salir",
  "New estimate": "Nuevo estimado",
  "Project manager": "Gerente de proyecto",
  Owner: "Dueño",
  "This login stays on the job": "Esta cuenta se queda en el trabajo",
  "A project manager can open progress jobs, work orders, and invoices.":
    "Un gerente de proyecto puede abrir trabajos en proceso, órdenes de trabajo y facturas.",
  "Dismiss notice": "Cerrar aviso",
  "Search clients or streets": "Buscar clientes o calles",
  "Search jobs": "Buscar trabajos",
  All: "Todos",
  Export: "Exportar",
  "The book is empty. Price a room to start a lead.":
    "El libro está vacío. Cotiza un cuarto para empezar un prospecto.",
  "Deposit Paid / Scheduled": "Depósito pagado / Programado",
  Accepted: "Aceptado",
  Declined: "Rechazado",
  "Missing client": "Cliente faltante",
  "No address yet": "Todavía no hay dirección",
  "No areas yet": "Todavía no hay áreas",
  Closed: "Cerrado",
  "Crew sheet": "Hoja de cuadrilla",
  Open: "Abrir",
  "Schedule job": "Programar trabajo",
  "On site": "En el sitio",
  "Pick the day you're on site. You can change it from the estimate.":
    "Elige el día en el sitio. Puedes cambiarlo desde el estimado.",
  "+ New Lead": "+ Nuevo prospecto",
  "+ New Proposal": "+ Nueva propuesta",
  "Lead Source": "Origen",
  "Date Range": "Fechas",
  "All sources": "Todos los orígenes",
  "Any date": "Cualquier fecha",
  "Last 30 days": "Últimos 30 días",
  "Last 90 days": "Últimos 90 días",
  "This year": "Este año",
  Salesperson: "Vendedor",
  Everyone: "Todos",
  "Website form": "Formulario del sitio",
  Rename: "Renombrar",
  Remove: "Quitar",
  Interior: "Interior",
  Exterior: "Exterior",
  Cabinets: "Gabinetes",
  Estimate: "Estimado",
  "Work order": "Orden de trabajo",
  Company: "Empresa",
  Brand: "Marca",
  Email: "Correo",
  Proposal: "Propuesta",
  App: "App",
  Calendar: "Calendario",
  Templates: "Plantillas",
  Notifications: "Avisos",
  Payments: "Pagos",
  Integrations: "Integraciones",
  Portal: "Portal",
  "Add-ons": "Complementos",
  Language: "Idioma",
  "Copy Spanish link": "Copiar enlace en español",
  "Messages in": "Mensajes en",
}

const STAGES: Record<StageSlug, string> = {
  lead: "Prospecto",
  estimate_sent: "Estimado enviado",
  scheduled: "Programado",
  completed: "Terminado",
}

const EMPTY_STAGES: Record<StageSlug, string> = {
  lead: "No hay visitas pendientes.",
  estimate_sent: "Nada está esperando aprobación.",
  scheduled: "No hay días en el calendario.",
  completed: "Los trabajos terminados llegan aquí.",
}

const NEXT_ACTIONS: Record<StageSlug, string | null> = {
  lead: "Marcar enviado",
  estimate_sent: "Programar",
  scheduled: "Terminar",
  completed: null,
}

export function officeLabel(text: string, language: FieldLanguage): string {
  if (language === "en") return text
  return LABELS[text] ?? text
}

export function officeStageName(slug: StageSlug, name: string, language: FieldLanguage): string {
  if (language === "en") return name
  return STAGES[slug] ?? name
}

export function officeEmptyStage(slug: StageSlug, english: string, language: FieldLanguage): string {
  if (language === "en") return english
  return EMPTY_STAGES[slug] ?? english
}

export function officeNextAction(
  slug: StageSlug,
  english: string | null,
  language: FieldLanguage,
): string | null {
  if (language === "en") return english
  return NEXT_ACTIONS[slug]
}

export function officeInView(count: number, priced: string, language: FieldLanguage): string {
  if (language === "en") return `${count} in view · ${priced} priced`
  return `${count} a la vista · ${priced} con precio`
}

export function officeNoMatch(query: string, language: FieldLanguage): string {
  if (language === "en") return `No jobs match “${query}”.`
  return `Ningún trabajo coincide con “${query}”.`
}

export function officeAreas(names: string[], language: FieldLanguage): string {
  if (names.length === 0) return officeLabel("No areas yet", language)
  return names.map((name) => translatePainting(name, language)).join(" · ")
}

export function officeOnSite(isoDate: string, language: FieldLanguage): string {
  const date = fieldJobDate(isoDate, language)
  return language === "es" ? `En el sitio ${date}` : `On site ${date}`
}

export function officeScheduleTitle(clientName: string, language: FieldLanguage): string {
  return language === "es" ? `Programar ${clientName}` : `Schedule ${clientName}`
}

export function officeSalesNote(language: FieldLanguage): string {
  if (language === "en") {
    return ". The website form, Thumbtack, Angi, Google Local Services, and Facebook open a Cold Leads card and start that sequence."
  }
  return ". El formulario del sitio, Thumbtack, Angi, Google Local Services y Facebook abren una tarjeta de prospectos fríos y empiezan esa secuencia."
}

export function officeCount(count: number, language: FieldLanguage): string {
  return language === "es" ? `${count} a la vista` : `${count} in view`
}
