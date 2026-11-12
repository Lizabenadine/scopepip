"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BrandLogo } from "@/components/brand/brand-logo"
import { SiteFooter } from "@/components/marketing/site-footer"
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  HelpCircle,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react"

interface AffiliateData {
  affiliate: {
    id: string
    name: string
    email: string
    code: string
    payoutMethod: string
    payoutEmail: string
  }
  stats: {
    totalSignups: number
    activePaying: number
    pendingCommission: number
    paidCommission: number
    totalEarned: number
  }
  referrals: Array<{ id: string; email: string; status: string; createdAt: string }>
  commissions: Array<{
    id: string
    subscriptionAmount: number
    commissionAmount: number
    status: string
    createdAt: string
    paidAt?: string
  }>
}

export default function AffiliatesPage() {
  const [authMode, setAuthMode] = useState<"register" | "login">("register")
  const [data, setData] = useState<AffiliateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [payoutMethod, setPayoutMethod] = useState<"paypal" | "wise" | "ach">("paypal")
  const [payoutEmail, setPayoutEmail] = useState("")
  const [customCode, setCustomCode] = useState("")

  useEffect(() => {
    fetchSession()
  }, [])

  async function fetchSession() {
    setLoading(true)
    try {
      const res = await fetch("/api/affiliates")
      const json = (await res.json()) as { ok?: boolean; authenticated?: boolean } & AffiliateData
      if (res.ok && json.authenticated && json.affiliate) {
        setData(json)
      } else {
        setData(null)
      }
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      const payload =
        authMode === "register"
          ? { action: "register", name, email, password, payoutMethod, payoutEmail: payoutEmail || email, customCode }
          : { action: "login", email, password }

      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = (await res.json()) as { ok?: boolean; reason?: string }
      if (res.ok && result.ok) {
        await fetchSession()
      } else {
        setError(result.reason || "Unable to complete request. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    await fetch("/api/affiliates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    })
    setData(null)
  }

  function copyLink() {
    if (!data?.affiliate?.code) return
    const url = `https://www.scopepipe.com?ref=${data.affiliate.code}`
    void navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#02182F]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-6">
          <BrandLogo href="/" />
          <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
            <Link href="/#features" className="hover:text-white">
              Features
            </Link>
            <Link href="/#pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="/#proposal-demo" className="hover:text-white">
              Sample proposal
            </Link>
            <Link href="/affiliates" className="text-cyan-400 font-medium">
              Affiliates
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md transition-all hover:bg-cyan-400"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-12 md:px-6 md:py-20">
        <div className="mx-auto max-w-5xl">
          {/* Hero Section */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-300">
              <BadgeDollarSign className="size-3.5" />
              Official Scopepipe Partner Program
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Earn <span className="text-cyan-400">25% Recurring</span> Commission Every Month
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              Refer painting contractors to Scopepipe. Earn <strong>$12.25 every single month</strong> for every active
              paying subscriber you bring—for as long as they stay subscribed.
            </p>
          </div>

          {/* Value Props Grid */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <RefreshCw className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">25% Lifetime Recurring</h3>
              <p className="mt-1 text-xs text-slate-400">
                Receive $12.25/mo per customer on our standard $49/mo plan ($147/year per contractor).
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">Paddle Confirmed Settlement</h3>
              <p className="mt-1 text-xs text-slate-400">
                Commissions unlock automatically once Paddle confirms payment settlement. No commission on free trials.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">Same-Day Payouts</h3>
              <p className="mt-1 text-xs text-slate-400">
                Payouts processed same-day upon approval via PayPal, Wise, or ACH once funds settle.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Lock className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">Independent Accounts</h3>
              <p className="mt-1 text-xs text-slate-400">
                Affiliate credentials stay completely separate from contractor CRM workspaces. Self-referrals blocked.
              </p>
            </div>
          </div>

          {/* Main Affiliate Portal Section */}
          <div className="mt-14 rounded-3xl border border-white/10 bg-[#0F172A] p-6 shadow-xl md:p-10">
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="size-7 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              </div>
            ) : data ? (
              /* Logged In Dashboard View */
              <div>
                <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Affiliate Portal</span>
                    <h2 className="text-2xl font-bold text-white">Welcome back, {data.affiliate.name}</h2>
                    <p className="text-xs text-slate-400">Logged in as {data.affiliate.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </button>
                </div>

                {/* Referral Link Copy Bar */}
                <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                  <p className="text-xs font-semibold text-cyan-300">Your Unique Referral Link</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      readOnly
                      value={`https://www.scopepipe.com?ref=${data.affiliate.code}`}
                      className="h-10 flex-1 rounded-xl border border-white/15 bg-[#0B0F17] px-3 font-mono text-xs text-slate-200 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
                    >
                      {copied ? (
                        <>
                          <Check className="size-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Cookie window: 30 days. When contractors start a 14-day trial and convert to paid, 25% recurring
                    commissions attach automatically.
                  </p>
                </div>

                {/* Stat Cards */}
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-[#0B0F17] p-4">
                    <p className="text-xs font-medium text-slate-400">Total Signups</p>
                    <p className="mt-1 text-2xl font-bold text-white">{data.stats.totalSignups}</p>
                    <span className="text-[10px] text-slate-500">Free trials & active</span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0B0F17] p-4">
                    <p className="text-xs font-medium text-slate-400">Paying Subscribers</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-400">{data.stats.activePaying}</p>
                    <span className="text-[10px] text-slate-500">Active monthly recurring</span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0B0F17] p-4">
                    <p className="text-xs font-medium text-slate-400">Pending Settlement</p>
                    <p className="mt-1 text-2xl font-bold text-amber-400">${data.stats.pendingCommission.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-500">Awaiting payout</span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0B0F17] p-4">
                    <p className="text-xs font-medium text-slate-400">Total Paid Out</p>
                    <p className="mt-1 text-2xl font-bold text-cyan-400">${data.stats.paidCommission.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-500">Disbursed to date</span>
                  </div>
                </div>

                {/* Referrals & Commissions Tables */}
                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#0B0F17] p-4">
                    <h3 className="text-sm font-semibold text-white">Referred Customers ({data.referrals.length})</h3>
                    {data.referrals.length === 0 ? (
                      <p className="mt-4 text-xs text-slate-500">No referrals yet. Share your link to start earning!</p>
                    ) : (
                      <div className="mt-3 divide-y divide-white/5 overflow-x-auto text-xs">
                        {data.referrals.map((r) => (
                          <div key={r.id} className="flex items-center justify-between py-2">
                            <div>
                              <p className="font-mono text-slate-300">{r.email}</p>
                              <span className="text-[10px] text-slate-500">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                r.status === "active_paid"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {r.status === "active_paid" ? "Active Paying" : "14-Day Trial"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0B0F17] p-4">
                    <h3 className="text-sm font-semibold text-white">Commission Ledger</h3>
                    {data.commissions.length === 0 ? (
                      <p className="mt-4 text-xs text-slate-500">
                        Commissions appear once referred users complete their trial and settle their first $49 payment.
                      </p>
                    ) : (
                      <div className="mt-3 divide-y divide-white/5 overflow-x-auto text-xs">
                        {data.commissions.map((c) => (
                          <div key={c.id} className="flex items-center justify-between py-2">
                            <div>
                              <p className="font-semibold text-white">+${c.commissionAmount.toFixed(2)} USD</p>
                              <span className="text-[10px] text-slate-500">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                c.status === "paid"
                                  ? "bg-cyan-500/10 text-cyan-400"
                                  : c.status === "refunded"
                                    ? "bg-rose-500/10 text-rose-400"
                                    : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {c.status === "paid" ? "Paid" : c.status === "refunded" ? "Refunded" : "Pending"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">Payout Destination:</p>
                  <p className="mt-0.5">
                    Method: <span className="uppercase font-mono text-cyan-400">{data.affiliate.payoutMethod}</span> |
                    Account: <span className="font-mono text-slate-200">{data.affiliate.payoutEmail}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Commissions are reviewed and disbursed same-day upon payment settlement via PayPal, Wise, or ACH.
                  </p>
                </div>
              </div>
            ) : (
              /* Registration / Login View */
              <div className="mx-auto max-w-md">
                <div className="flex border-b border-white/10 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register")
                      setError("")
                    }}
                    className={`flex-1 pb-3 text-center transition-colors ${
                      authMode === "register"
                        ? "border-b-2 border-cyan-400 text-cyan-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Join Program (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login")
                      setError("")
                    }}
                    className={`flex-1 pb-3 text-center transition-colors ${
                      authMode === "login"
                        ? "border-b-2 border-cyan-400 text-cyan-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Affiliate Sign In
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {authMode === "register" ? (
                    <>
                      <div>
                        <label className="text-xs font-medium text-slate-300">Your Full Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Doe"
                          className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#0B0F17] px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-300">Email Address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@example.com"
                          className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#0B0F17] px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-300">Password (min 6 chars)</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#0B0F17] px-3 text-sm text-white outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-300">Payout Method</label>
                          <select
                            value={payoutMethod}
                            onChange={(e) => setPayoutMethod(e.target.value as "paypal" | "wise" | "ach")}
                            className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#0B0F17] px-2 text-xs text-white outline-none focus:border-cyan-400"
                          >
                            <option value="paypal">PayPal</option>
                            <option value="wise">Wise</option>
                            <option value="ach">Direct ACH</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-300">Payout Email / Account</label>
                          <input
                            type="text"
                            value={payoutEmail}
                            onChange={(e) => setPayoutEmail(e.target.value)}
                            placeholder="Same as email"
                            className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#0B0F17] px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-300">
                          Custom Referral Slug <span className="text-slate-500">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value)}
                          placeholder="e.g. painterpro"
                          className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#0B0F17] px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-medium text-slate-300">Affiliate Email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@example.com"
                          className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#0B0F17] px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-300">Password</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-[#0B0F17] px-3 text-sm text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </>
                  )}

                  {error ? (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5 text-xs text-rose-300">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    ) : authMode === "register" ? (
                      <>
                        <span>Create Affiliate Account</span>
                        <ArrowRight className="size-4" />
                      </>
                    ) : (
                      <span>Sign In to Dashboard</span>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-slate-400">
                    By participating, you agree to our affiliate terms: 25% recurring commission, Paddle settlement
                    verification, same-day payouts upon clearance, and prohibition of self-referrals.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
