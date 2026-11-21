"use client"

import { useEffect, useState, useTransition } from "react"
import { ShieldCheck, UserCheck, UserX, Search, RefreshCw, Key, CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminUserView } from "@/lib/auth/directory"

export function MasterAdminPanel() {
  const [users, setUsers] = useState<AdminUserView[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionUserId, setActionUserId] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/lifetime-access")
      if (!res.ok) {
        if (res.status === 403) {
          setError("Access denied: You do not have Master Admin permissions.")
        } else {
          setError("Failed to fetch user directory.")
        }
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.ok && Array.isArray(data.users)) {
        setUsers(data.users)
      } else {
        setError(data.error || "Failed to load users.")
      }
    } catch {
      setError("An unexpected error occurred while loading users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function handleToggleLifetime(userId: string, currentStatus: string) {
    const action = currentStatus === "lifetime" ? "revoke" : "grant"
    setActionUserId(userId)
    setError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/lifetime-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, action }),
        })
        const data = await res.json()
        if (data.ok && data.user) {
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, subscriptionStatus: data.user.subscriptionStatus } : u))
          )
          setSuccessMessage(
            action === "grant"
              ? `Granted lifetime access to ${data.user.email}`
              : `Revoked lifetime access for ${data.user.email}`
          )
        } else {
          setError(data.error || "Failed to update access.")
        }
      } catch {
        setError("Network error when updating lifetime access.")
      } finally {
        setActionUserId(null)
      }
    })
  }

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      u.companyName.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Master Admin: Lifetime Access</h2>
              <p className="text-sm text-slate-500">
                Grant or revoke permanent, non-expiring access for selected users without Paddle or trial limitations.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading || isPending}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Directory
          </Button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name, email, or company..."
              className="pl-9"
            />
          </div>
          <span className="text-xs text-slate-400">
            {filteredUsers.length} of {users.length} accounts
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">User & Company</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Access Status</th>
                <th className="px-4 py-3">Trial Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No accounts found matching &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isLifetime = user.subscriptionStatus === "lifetime"
                  const isSuper = user.role === "super_admin"
                  const isWorking = isPending && actionUserId === user.id

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{user.name || "Unnamed"}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{user.companyName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isSuper
                              ? "bg-purple-100 text-purple-800"
                              : user.role === "owner"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isSuper && <Key className="h-3 w-3" />}
                          {isSuper ? "Super Admin" : user.role === "owner" ? "Owner" : user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isLifetime ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Lifetime Free
                          </span>
                        ) : user.subscriptionStatus === "active" ? (
                          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            Active Paid
                          </span>
                        ) : user.subscriptionStatus === "trialing" ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            Trialing
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {user.subscriptionStatus || "Canceled"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {isLifetime || isSuper
                          ? "Never expires"
                          : user.trialEndsAt
                          ? new Date(user.trialEndsAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isSuper ? (
                          <span className="text-xs font-medium text-purple-600">Master Account</span>
                        ) : (
                          <Button
                            size="sm"
                            variant={isLifetime ? "outline" : "default"}
                            disabled={isWorking}
                            onClick={() => handleToggleLifetime(user.id, user.subscriptionStatus)}
                            className={
                              isLifetime
                                ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }
                          >
                            {isWorking ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : isLifetime ? (
                              <>
                                <UserX className="mr-1.5 h-3.5 w-3.5" /> Revoke Lifetime
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Grant Lifetime
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
