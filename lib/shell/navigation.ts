import type { UserRole } from "../auth/role.ts"

export type OfficeLink = { name: string; href: string }

export type OfficeSection = {
  name: string
  short: string
  href?: string
  links: OfficeLink[]
}

const MANAGER_PATHS = ["/dispatch", "/work-orders", "/payments"]

export function managerCanOpen(pathname: string): boolean {
  return MANAGER_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/** Office pages grouped the way a painting CRM splits the day: sales, jobs, daily work, and documents. */
export function navigationSections(userRole: UserRole): OfficeSection[] {
  if (userRole === "project_manager") {
    return [
      {
        name: "Jobs",
        short: "Jobs",
        links: [
          { name: "Progress jobs", href: "/dispatch" },
          { name: "Work Orders", href: "/work-orders" },
        ],
      },
      { name: "Invoices", short: "Invoices", href: "/payments", links: [] },
    ]
  }
  return [
    { name: "Dashboard", short: "Dashboard", href: "/", links: [] },
    {
      name: "Sales",
      short: "Sales",
      links: [
        { name: "Sales Pipeline", href: "/sales-pipeline" },
        { name: "Estimator", href: "/estimate" },
        { name: "Clients", href: "/clients" },
      ],
    },
    {
      name: "Jobs",
      short: "Jobs",
      links: [
        { name: "Work Orders", href: "/work-orders" },
        { name: "Dispatch & Map", href: "/dispatch" },
      ],
    },
    {
      name: "Daily",
      short: "Daily",
      links: [
        { name: "Appointments", href: "/appointments" },
        { name: "Inbox", href: "/inbox" },
        { name: "Follow-ups", href: "/follow-ups" },
      ],
    },
    {
      name: "Documents",
      short: "Docs",
      links: [
        { name: "Proposals", href: "/proposal" },
        { name: "Invoices & Payments", href: "/payments" },
      ],
    },
    { name: "Settings", short: "Settings", href: "/settings", links: [] },
  ]
}
