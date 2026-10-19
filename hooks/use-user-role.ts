"use client"

import { useEffect, useState } from "react"
import { readUserRole, writeUserRole, type UserRole } from "@/lib/auth/role"

export function useUserRole(): [UserRole, (role: UserRole) => void] {
  const [userRole, setUserRole] = useState<UserRole>("owner")

  useEffect(() => {
    setUserRole(readUserRole())
  }, [])

  const update = (role: UserRole) => {
    writeUserRole(role)
    setUserRole(role)
  }

  return [userRole, update]
}
