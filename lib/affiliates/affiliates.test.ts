import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, it } from "node:test"

const dir = mkdtempSync(path.join(tmpdir(), "scopepipe-affiliates-"))
process.env.AFFILIATES_PATH = path.join(dir, "accounts.json")
process.env.REFERRALS_PATH = path.join(dir, "referrals.json")
process.env.COMMISSIONS_PATH = path.join(dir, "commissions.json")
process.env.AUTH_SECRET = "test-affiliate-secret"

const {
  registerAffiliate,
  loginAffiliate,
  signAffiliateSession,
  readAffiliateSession,
  trackReferralSignup,
  recordCommissionFromPaddle,
  processPaddleRefund,
  markCommissionPaid,
  getAffiliateDashboardData,
} = await import("./affiliate-store.ts")

describe("affiliates", () => {
  let affId = ""
  let affCode = ""

  it("registers an affiliate account and generates unique referral code", async () => {
    const res = await registerAffiliate({
      name: "Jordan Painter",
      email: "jordan@partner.test",
      password: "secretpassword123",
      customCode: "jordanp",
    })
    assert.equal(res.ok, true)
    if (!res.ok) return
    assert.equal(res.affiliate.email, "jordan@partner.test")
    assert.equal(res.affiliate.code, "jordanp")
    affId = res.affiliate.id
    affCode = res.affiliate.code

    // Duplicate email rejected
    const dup = await registerAffiliate({
      name: "Jordan Duplicate",
      email: "jordan@partner.test",
      password: "secretpassword123",
    })
    assert.equal(dup.ok, false)
    assert.match(dup.reason, /already exists/i)
  })

  it("authenticates affiliate login and generates valid session", async () => {
    const success = await loginAffiliate("jordan@partner.test", "secretpassword123")
    assert.equal(success.ok, true)
    if (!success.ok) return
    assert.equal(success.affiliate.id, affId)

    const badPass = await loginAffiliate("jordan@partner.test", "wrongpassword")
    assert.equal(badPass.ok, false)

    const token = signAffiliateSession(affId)
    const verifiedId = readAffiliateSession(token)
    assert.equal(verifiedId, affId)
    assert.equal(readAffiliateSession("invalid.token.here"), null)
  })

  it("blocks self-referrals when contractor email matches affiliate email", async () => {
    const selfRef = await trackReferralSignup(affCode, "company-self", "jordan@partner.test")
    assert.equal(selfRef.ok, false)
    assert.match(selfRef.reason || "", /self-referral/i)
  })

  it("tracks valid contractor referral signup", async () => {
    const valid = await trackReferralSignup(affCode, "company-client-1", "contractor1@example.test")
    assert.equal(valid.ok, true)

    // Duplicate referral for same company / email is rejected
    const dup = await trackReferralSignup(affCode, "company-client-1", "contractor1@example.test")
    assert.equal(dup.ok, false)
    assert.match(dup.reason || "", /already linked/i)
  })

  it("awards 25% recurring commission on paid subscription settlement ($49 -> $12.25)", async () => {
    // $0 free trial payment produces no commission
    const trialComm = await recordCommissionFromPaddle({
      transactionId: "txn_trial_001",
      amount: 0,
      customerEmail: "contractor1@example.test",
      companyId: "company-client-1",
    })
    assert.equal(trialComm, null)

    // Paid subscription payment of $49.00 earns 25% ($12.25)
    const comm = await recordCommissionFromPaddle({
      transactionId: "txn_paid_001",
      amount: 49.0,
      customerEmail: "contractor1@example.test",
      companyId: "company-client-1",
      subscriptionId: "sub_123",
    })
    assert.ok(comm)
    if (!comm) return
    assert.equal(comm.affiliateId, affId)
    assert.equal(comm.subscriptionAmount, 49.0)
    assert.equal(comm.commissionAmount, 12.25)
    assert.equal(comm.status, "pending")

    // Duplicate transaction ID does not double-award commission
    const dupComm = await recordCommissionFromPaddle({
      transactionId: "txn_paid_001",
      amount: 49.0,
      customerEmail: "contractor1@example.test",
      companyId: "company-client-1",
    })
    assert.equal(dupComm, null)
  })

  it("invalidates pending commission upon Paddle refund", async () => {
    const refundRes = await processPaddleRefund("txn_paid_001")
    assert.equal(refundRes, true)

    // Non-existent transaction returns false
    const invalidRefund = await processPaddleRefund("txn_unknown")
    assert.equal(invalidRefund, false)
  })

  it("supports admin payout workflow marking eligible commission as paid", async () => {
    // Record second month payment
    const comm2 = await recordCommissionFromPaddle({
      transactionId: "txn_paid_002",
      amount: 49.0,
      customerEmail: "contractor1@example.test",
      companyId: "company-client-1",
    })
    assert.ok(comm2)
    if (!comm2) return
    assert.equal(comm2.commissionAmount, 12.25)
    assert.equal(comm2.status, "pending")

    // Admin marks commission as paid
    const payoutRes = await markCommissionPaid(comm2.id)
    assert.equal(payoutRes, true)

    // Check dashboard statistics
    const dash = await getAffiliateDashboardData(affId)
    assert.ok(dash)
    if (!dash) return
    assert.equal(dash.stats.totalSignups, 1)
    assert.equal(dash.stats.activePaying, 1)
    assert.equal(dash.stats.paidCommission, 12.25)
    assert.equal(dash.stats.pendingCommission, 0)
    assert.equal(dash.commissions.length, 2)
  })
})
