"use client"

import { useEffect, useState, useTransition } from "react"
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Key,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  CheckSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminUserView } from "@/lib/auth/directory"

function isSuspectedTestAccount(user: AdminUserView): boolean {
  if (user.role === "super_admin" || user.email.toLowerCase() === "nadieshda@aol.com") return false
  const email = user.email.toLowerCase()
  return (
    email.endsWith("@example.com") ||
    email.endsWith(".test") ||
    email.includes("@hale.test") ||
    email.includes("@scopepipe.test") ||
    email.includes(".local") ||
    email.startsWith("voice-live-") ||
    email.startsWith("prod-live-") ||
    email.startsWith("live-voice-") ||
    email.startsWith("sync.") ||
    (user.name.toLowerCase().includes("contractor") && email.includes("test"))
  )
}

export function MasterAdminPanel() {
  const [users, setUsers] = useState<AdminUserView[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionUserId, setActionUserId] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const selectableUsers = users.filter((u) => u.role !== "super_admin" && u.email.toLowerCase() !== "nadieshda@aol.com")
  const allSelectableSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedUserIds.has(u.id))
  const suspectedTestUsers = users.filter(isSuspectedTestAccount)

  function handleToggleSelectAll() {
    if (allSelectableSelected) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(selectableUsers.map((u) => u.id)))
    }
  }

  function handleSelectTestAccounts() {
    const testIds = suspectedTestUsers.map((u) => u.id)
    setSelectedUserIds(new Set(testIds))
  }

  function handleToggleSelectUser(id: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleConfirmDelete() {
    setError(null)
    setSuccessMessage(null)
    const userIdsToDelete = Array.from(selectedUserIds)
    if (userIdsToDelete.length === 0) return

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/lifetime-access", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: userIdsToDelete }),
        })
        const data = await res.json()
        if (data.ok) {
          setSelectedUserIds(new Set())
          setShowDeleteConfirm(false)
          setSuccessMessage(`Successfully removed ${data.deletedCount} account${data.deletedCount === 1 ? "" : "s"} and test data.`)
          if (Array.isArray(data.users)) {
            setUsers(data.users)
          } else {
            await loadUsers()
          }
        } else {
          setError(data.error || "Failed to delete selected accounts.")
        }
      } catch {
        setError("Network error when deleting accounts.")
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
              <h2 className="text-xl font-bold text-slate-900">Master Admin: Accounts & Lifetime Access</h2>
              <p className="text-sm text-slate-500">
                Manage accounts, clean up test records, or grant permanent lifetime access without billing restrictions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={loading || isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Directory
            </Button>
          </div>
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

        {/* Toolbar: Search, Select Helpers, and Delete Selected Button */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name, email, or company..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {suspectedTestUsers.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectTestAccounts}
                className="text-xs border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium"
              >
                <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                Select Suspected Test Accounts ({suspectedTestUsers.length})
              </Button>
            )}

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedUserIds.size === 0 || isPending || loading}
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete Selected ({selectedUserIds.size})
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            {selectedUserIds.size} of {selectableUsers.length} selectable accounts selected
          </span>
          <span>
            {filteredUsers.length} of {users.length} accounts visible
          </span>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all accounts"
                    checked={allSelectableSelected}
                    onChange={handleToggleSelectAll}
                    disabled={selectableUsers.length === 0}
                    className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                </th>
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
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No accounts found matching &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isLifetime = user.subscriptionStatus === "lifetime"
                  const isSuper = user.role === "super_admin"
                  const isFounder = user.email.toLowerCase() === "nadieshda@aol.com" || isSuper
                  const isTest = isSuspectedTestAccount(user)
                  const isWorking = isPending && actionUserId === user.id
                  const isSelected = selectedUserIds.has(user.id)

                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors ${
                        isSelected ? "bg-red-50/50 hover:bg-red-50/80" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="w-10 px-4 py-3">
                        {isFounder ? (
                          <span title="Master Admin founder account is permanently protected" className="text-purple-600 text-xs">
                            🔒
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            aria-label={`Select ${user.email}`}
                            checked={isSelected}
                            onChange={() => handleToggleSelectUser(user.id)}
                            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{user.name || "Unnamed"}</span>
                          {isTest && (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              Test Account
                            </span>
                          )}
                        </div>
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
                            disabled={isWorking || isPending}
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

      {/* Confirmation Modal before permanent deletion */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirm Permanent Account Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              You are about to permanently delete <strong>{selectedUserIds.size}</strong> account{selectedUserIds.size === 1 ? "" : "s"} and remove all associated test data:
            </p>

            <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 divide-y divide-slate-200/60 text-xs">
              {users
                .filter((u) => selectedUserIds.has(u.id))
                .map((u) => (
                  <div key={u.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{u.name || "Unnamed"}</span>
                      <span className="ml-1.5 text-slate-500">({u.email})</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{u.companyName}</span>
                  </div>
                ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  `Yes, Delete ${selectedUserIds.size} Account${selectedUserIds.size === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
