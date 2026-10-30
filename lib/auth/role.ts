export const USER_ROLES = ["owner", "project_manager", "estimator"] as const

export type UserRole = (typeof USER_ROLES)[number]

const STORAGE_KEY = "scopepipe.userRole"

export function readUserRole(): UserRole {
  if (typeof window === "undefined") return "owner"
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value && isUserRole(value) ? value : "owner"
}

export function writeUserRole(role: UserRole) {
  window.localStorage.setItem(STORAGE_KEY, role)
}

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value)
}

export function homeForRole(role: UserRole): string {
  return role === "project_manager" ? "/work-orders" : "/dashboard"
}

export function roleSignInReason(role: UserRole): string {
  if (role === "project_manager") return "That login is a project manager."
  if (role === "estimator") return "That login is an estimator."
  return "That login is the owner."
}
