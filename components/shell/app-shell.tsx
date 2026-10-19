"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calculator, CalendarDays, ClipboardList, FileText, Funnel, LayoutDashboard, Map, MessageSquare, MessagesSquare, Plus, Receipt, Settings, Users, X } from "lucide-react"
import { AuthForm } from "@/components/auth/auth-form"
import { FollowUpRunner } from "@/components/follow-ups/follow-up-runner"
import { BrandLogo } from "@/components/brand/brand-logo"
import { buttonVariants } from "@/components/ui/button"
import type { UserRole } from "@/lib/auth/role"
import { PLAN_PRICE } from "@/lib/defaults"
import { useScope } from "@/lib/data/store"
import { navigationLinks } from "@/lib/shell/navigation"
import { cn } from "@/lib/utils"

const NAV_ICONS = {
  "/": LayoutDashboard,
  "/estimate": Calculator,
  "/proposal": FileText,
  "/sales-pipeline": Funnel,
  "/appointments": CalendarDays,
  "/follow-ups": MessageSquare,
  "/inbox": MessagesSquare,
  "/work-orders": ClipboardList,
  "/dispatch": Map,
  "/clients": Users,
  "/payments": Receipt,
  "/settings": Settings,
} as const

function navItems(userRole: UserRole) {
  return navigationLinks(userRole).map((link) => ({
    ...link,
    icon: NAV_ICONS[link.href as keyof typeof NAV_ICONS],
  }))
}

function navIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  if (href === "/estimate") return pathname === "/estimate" || pathname.startsWith("/estimate/") || pathname.startsWith("/estimates")
  if (href === "/proposal") return pathname === "/proposal" || pathname.startsWith("/proposal/")
  return pathname === href || pathname.startsWith(`${href}/`)
}

function roleLabel(role: UserRole): string {
  return role === "project_manager" ? "Project manager" : "Owner"
}

async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" })
  window.location.assign("/login")
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { notice, dismissNotice, ready, session } = useScope()
  const items = navItems(session?.role ?? "owner")
  const crewCopy = /^\/work-orders\/.+/.test(pathname)
  const publicProposal =
    pathname.startsWith("/p/") ||
    pathname.endsWith("/pay") ||
    pathname === "/request" ||
    pathname.startsWith("/request/") ||
    pathname.startsWith("/book/") ||
    pathname === "/login" ||
    pathname === "/signup"

  if (publicProposal) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-28 md:px-8 md:py-10">{children}</main>
      </div>
    )
  }

  if (!ready) return <div className="min-h-dvh bg-background" />

  if (!session) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <main className="mx-auto w-full max-w-md px-4 py-10">
          <AuthForm mode="login" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <FollowUpRunner />
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <BrandLogo />
        <div className="flex min-w-0 items-center justify-end gap-3">
          <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex" aria-label="Primary">
            {items.map((item) => {
              const active = navIsActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  data-testid={`nav-${item.href === "/" ? "dashboard" : item.href.slice(1)}`}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium",
                    active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <p className="text-sm text-slate-700" data-testid="signed-in-name">
              {session.name}
            </p>
            <p className="text-xs text-slate-500" data-testid="signed-in-role">
              {roleLabel(session.role)}
            </p>
          </div>
          <button type="button" data-testid="sign-out" className="text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => void signOut()}>
            Sign out
          </button>
          {crewCopy ? (
            <p className="hidden text-xs text-slate-500 xl:block">Crew copy. Prices stay on the estimate.</p>
          ) : (
            <p className="hidden text-sm text-slate-500 xl:block">${PLAN_PRICE}/mo</p>
          )}
          <Link href="/estimate" className={cn(buttonVariants({ size: "lg" }), "h-9 shrink-0")}>
            <Plus />
            <span className="hidden sm:inline">New estimate</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-4.5rem)] min-w-0 flex-col">
        {notice ? (
          <div className="flex items-start justify-between gap-3 border-b border-border bg-amber-100 px-4 py-3 text-sm text-amber-950">
            <p>{notice}</p>
            <button
              type="button"
              onClick={dismissNotice}
              className="rounded-md p-1 hover:bg-amber-200"
              aria-label="Dismiss notice"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-4 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
        <nav
          className="fixed inset-x-0 bottom-0 z-30 flex h-16 overflow-x-auto border-t border-border bg-background/95 backdrop-blur md:hidden"
          aria-label="Primary"
        >
          {items.map((item) => {
            const active = navIsActive(pathname, item.href)
            const Icon = item.icon
            const short =
              item.name === "Invoices & Payments"
                ? "Payments"
                : item.name === "Dispatch & Map"
                  ? "Dispatch"
                  : item.name === "Sales Pipeline"
                    ? "Sales"
                    : item.name === "Appointments"
                      ? "Visits"
                      : item.name === "Follow-ups"
                      ? "Follow"
                      : item.name === "Inbox"
                        ? "Inbox"
                        : item.name === "Settings"
                          ? "Settings"
                          : item.name
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {short}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
