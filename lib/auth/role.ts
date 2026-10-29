export const USER_ROLES = ["owner", "project_manager"] as const

export type UserRole = (typeof USER_ROLES)[number]

const STORAGE_KEY = "scopepipe.userRole"

export function readUserRole(): UserRole {
  if (typeof window === "undefined") return "owner"
  return window.localStorage.getItem(STORAGE_KEY) === "project_manager" ? "project_manager" : "owner"
}

export function writeUserRole(role: UserRole) {
  window.localStorage.setItem(STORAGE_KEY, role)
}

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value)
}

export function homeForRole(role: UserRole): string {
  return role === "project_manager" ? "/dispatch" : "/dashboard"
}

export function roleSignInReason(role: UserRole): string {
  return role === "project_manager" ? "That login is a project manager." : "That login is the owner."
}
