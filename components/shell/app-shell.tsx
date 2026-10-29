"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChevronDown, ClipboardList, FileText, Funnel, LayoutDashboard, Plus, Receipt, Settings, X } from "lucide-react"
import { AuthForm } from "@/components/auth/auth-form"
import { FieldLanguageSwitch } from "@/components/field/language-switch"
import { FollowUpRunner } from "@/components/follow-ups/follow-up-runner"
import { BrandLogo } from "@/components/brand/brand-logo"
import { buttonVariants } from "@/components/ui/button"
import type { UserRole } from "@/lib/auth/role"
import { useScope } from "@/lib/data/store"
import { homeForRole } from "@/lib/auth/role"
import { useFieldLanguage } from "@/hooks/use-field-language"
import type { FieldLanguage } from "@/lib/field/language"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { managerCanOpen, navigationSections, type OfficeSection } from "@/lib/shell/navigation"
import { cn } from "@/lib/utils"

const SECTION_ICONS = {
  Dashboard: LayoutDashboard,
  Sales: Funnel,
  Jobs: ClipboardList,
  Daily: CalendarDays,
  Documents: FileText,
  Invoices: Receipt,
  Settings: Settings,
} as const

function navIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  if (href === "/estimate") return pathname === "/estimate" || pathname.startsWith("/estimate/") || pathname.startsWith("/estimates")
  if (href === "/proposal") return pathname === "/proposal" || pathname.startsWith("/proposal/")
  return pathname === href || pathname.startsWith(`${href}/`)
}

function roleLabel(role: UserRole, language: FieldLanguage): string {
  return officeLabel(role === "project_manager" ? "Project manager" : "Owner", language)
}

async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" })
  window.location.assign("/login")
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { notice, dismissNotice, ready, session } = useScope()
  const { copy, language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const sections = navigationSections(session?.role ?? "owner")
  const managerLimited = session?.role === "project_manager" && !managerCanOpen(pathname)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const crewCopy = /^\/work-orders\/.+/.test(pathname)
  const marketingPage = pathname === "/innova" || pathname.startsWith("/innova/")
  const publicProposal =
    marketingPage ||
    pathname.startsWith("/p/") ||
    pathname.endsWith("/pay") ||
    pathname === "/request" ||
    pathname.startsWith("/request/") ||
    pathname.startsWith("/book/") ||
    pathname === "/login" ||
    pathname === "/signup"

  useEffect(() => {
    setOpenSection(null)
  }, [pathname])

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target
      if (target instanceof Element && target.closest("[data-nav-root]")) return
      setOpenSection(null)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenSection(null)
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  if (marketingPage) return children

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
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo href={homeForRole(session.role)} />
          <nav className="hidden min-w-0 items-center gap-0.5 md:flex" aria-label="Primary" data-nav-root="bar">
            {sections.map((section) => (
              <SectionControl
                key={section.name}
                section={section}
                pathname={pathname}
                open={openSection === section.name}
                onOpen={() => setOpenSection(openSection === section.name ? null : section.name)}
                onClose={() => setOpenSection(null)}
                placement="bar"
                language={language}
              />
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3">
          <div className="hidden items-center gap-2 lg:flex">
            <p className="text-sm text-slate-700" data-testid="signed-in-name">
              {session.name}
            </p>
            <p className="text-xs text-slate-500" data-testid="signed-in-role">
              {roleLabel(session.role, language)}
            </p>
          </div>
          <FieldLanguageSwitch />
          <button type="button" data-testid="sign-out" className="text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => void signOut()}>
            {say("Sign out")}
          </button>
          {crewCopy ? (
            <p className="hidden text-xs text-slate-500 xl:block">{copy.crewCopy}</p>
          ) : null}
          {session.role === "project_manager" ? null : (
            <Link href="/estimate" className={cn(buttonVariants({ size: "lg" }), "h-9 shrink-0")}>
              <Plus />
              <span className="hidden sm:inline">{say("New estimate")}</span>
            </Link>
          )}
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
              aria-label={say("Dismiss notice")}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-4 pb-24 md:px-8 md:py-8 md:pb-8">
          {managerLimited ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
              <h1 className="text-xl font-semibold">{say("This login stays on the job")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {say("A project manager can open progress jobs, work orders, and invoices.")}
              </p>
            </div>
          ) : (
            children
          )}
        </main>
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
          aria-label="Primary"
          data-nav-root="dock"
        >
          {openSection ? (
            <div className="px-2 pb-2">
              <SectionMenu
                section={sections.find((section) => section.name === openSection)}
                pathname={pathname}
                onNavigate={() => setOpenSection(null)}
                language={language}
                wide
              />
            </div>
          ) : null}
          <div className="flex h-16">
            {sections.map((section) => (
              <SectionControl
                key={section.name}
                section={section}
                pathname={pathname}
                open={openSection === section.name}
                onOpen={() => setOpenSection(openSection === section.name ? null : section.name)}
                onClose={() => setOpenSection(null)}
                placement="dock"
                language={language}
              />
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}

function sectionIsActive(pathname: string, section: OfficeSection): boolean {
  if (section.href && navIsActive(pathname, section.href)) return true
  return section.links.some((link) => navIsActive(pathname, link.href))
}

function linkTestId(href: string): string {
  return `nav-${href === "/" ? "dashboard" : href.slice(1)}`
}

function SectionControl({
  section,
  pathname,
  open,
  onOpen,
  onClose,
  placement,
  language,
}: {
  section: OfficeSection
  pathname: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  placement: "bar" | "dock"
  language: FieldLanguage
}) {
  const say = (text: string) => officeLabel(text, language)
  const active = sectionIsActive(pathname, section)
  const Icon = SECTION_ICONS[section.name as keyof typeof SECTION_ICONS]
  if (!section.links.length && section.href) {
    const className =
      placement === "bar"
        ? cn(
            "shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium",
            active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          )
        : cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
            active ? "text-primary" : "text-muted-foreground",
          )
    return (
      <Link
        href={section.href}
        aria-current={active ? "page" : undefined}
        data-testid={linkTestId(section.href)}
        className={className}
      >
        {placement === "dock" ? <Icon className="size-5" /> : null}
        {placement === "dock" ? say(section.short) : say(section.name)}
      </Link>
    )
  }

  return (
    <div className={cn("relative", placement === "dock" && "flex flex-1")}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={say(section.name === "Daily" ? "Daily Operations" : section.name)}
        data-testid={`nav-section-${section.name.toLowerCase()}`}
        onClick={onOpen}
        className={cn(
          placement === "bar"
            ? "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium"
            : "flex w-full flex-col items-center justify-center gap-1 text-xs font-medium",
          placement === "bar"
            ? active || open
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            : active || open
              ? "text-primary"
              : "text-muted-foreground",
        )}
      >
        {placement === "dock" ? <Icon className="size-5" /> : null}
        {placement === "dock" ? say(section.short) : say(section.name)}
        {placement === "bar" ? <ChevronDown className="size-3.5" /> : null}
      </button>
      {placement === "bar" && open ? (
        <div className="absolute left-0 top-full z-30 mt-2">
          <SectionMenu section={section} pathname={pathname} onNavigate={onClose} language={language} />
        </div>
      ) : null}
    </div>
  )
}

function SectionMenu({
  section,
  pathname,
  onNavigate,
  language,
  wide = false,
}: {
  section: OfficeSection | undefined
  pathname: string
  onNavigate: () => void
  language: FieldLanguage
  wide?: boolean
}) {
  const say = (text: string) => officeLabel(text, language)
  if (!section || section.links.length === 0) return null
  return (
    <div role="menu" className={cn("min-w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg", wide && "w-full")}>
      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
        {say(section.name === "Daily" ? "Daily Operations" : section.name)}
      </p>
      {section.links.map((link) => {
        const active = navIsActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            role="menuitem"
            aria-current={active ? "page" : undefined}
            data-testid={linkTestId(link.href)}
            onClick={(event) => {
              event.stopPropagation()
              window.setTimeout(onNavigate, 0)
            }}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50",
            )}
          >
            {say(link.name)}
          </Link>
        )
      })}
    </div>
  )
}
