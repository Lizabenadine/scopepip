import type { UserRole } from "../auth/role.ts"

export function navigationLinks(userRole: UserRole) {
  return [
    { name: "Dashboard", href: "/" },
    { name: "Estimator", href: "/estimate" },
    { name: "Proposals", href: "/proposal" },
    { name: "Sales Pipeline", href: "/sales-pipeline" },
    { name: "Appointments", href: "/appointments" },
    { name: "Follow-ups", href: "/follow-ups" },
    { name: "Inbox", href: "/inbox" },
    { name: "Work Orders", href: "/work-orders" },
    { name: "Dispatch & Map", href: "/dispatch" },
    ...(userRole !== "project_manager" ? [{ name: "Clients", href: "/clients" }] : []),
    { name: "Invoices & Payments", href: "/payments" },
    { name: "Settings", href: "/settings" },
  ]
}
