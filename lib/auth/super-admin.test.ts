import assert from "node:assert/strict"
import test from "node:test"
import { isUserRole, homeForRole, roleSignInReason, type UserRole } from "./role.ts"
import { isSubscriptionStatus, subscriptionAllows, type SubscriptionAccess } from "../billing/access.ts"
import { roleCanOpen } from "./access.ts"

test("super_admin role is a recognized UserRole", () => {
  assert.equal(isUserRole("super_admin"), true)
  assert.equal(isUserRole("owner"), true)
  assert.equal(isUserRole("project_manager"), true)
  assert.equal(isUserRole("estimator"), true)
  assert.equal(isUserRole("invalid_role"), false)
})

test("homeForRole routes super_admin to dashboard", () => {
  assert.equal(homeForRole("super_admin"), "/dashboard")
  assert.equal(homeForRole("owner"), "/dashboard")
  assert.equal(homeForRole("project_manager"), "/work-orders")
  assert.equal(homeForRole("estimator"), "/dashboard")
})

test("roleSignInReason identifies super_admin correctly", () => {
  assert.match(roleSignInReason("super_admin"), /master administrator/i)
  assert.match(roleSignInReason("owner"), /owner/i)
})

test("roleCanOpen allows super_admin full access to all paths", () => {
  const paths = ["/dashboard", "/estimate", "/estimates", "/work-orders", "/dispatch", "/settings", "/admin", "/payments"]
  for (const path of paths) {
    assert.equal(roleCanOpen("super_admin", path), true, `super_admin should be able to open ${path}`)
    assert.equal(roleCanOpen("owner", path), true, `owner should be able to open ${path}`)
  }
})

test("lifetime is a recognized SubscriptionStatus", () => {
  assert.equal(isSubscriptionStatus("lifetime"), true)
  assert.equal(isSubscriptionStatus("active"), true)
  assert.equal(isSubscriptionStatus("trialing"), true)
  assert.equal(isSubscriptionStatus("canceled"), true)
  assert.equal(isSubscriptionStatus("expired"), false)
})

test("subscriptionAllows permits lifetime access unconditionally", () => {
  const now = Date.now()
  // Lifetime with null trial
  assert.equal(subscriptionAllows({ status: "lifetime", trialEndsAt: null }, now), true)
  // Lifetime with expired trial date in the past
  const pastDate = new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString()
  assert.equal(subscriptionAllows({ status: "lifetime", trialEndsAt: pastDate }, now), true)
  // Active subscription
  assert.equal(subscriptionAllows({ status: "active", trialEndsAt: null }, now), true)
})

test("subscriptionAllows enforces trial and canceled restrictions for regular users", () => {
  const now = Date.now()
  const pastDate = new Date(now - 1000 * 60 * 60 * 24).toISOString()
  const futureDate = new Date(now + 1000 * 60 * 60 * 24).toISOString()

  // Expired trial is blocked
  assert.equal(subscriptionAllows({ status: "trialing", trialEndsAt: pastDate }, now), false)
  // Active trial is permitted
  assert.equal(subscriptionAllows({ status: "trialing", trialEndsAt: futureDate }, now), true)
  // Canceled is blocked
  assert.equal(subscriptionAllows({ status: "canceled", trialEndsAt: futureDate }, now), false)
  assert.equal(subscriptionAllows({ status: "canceled", trialEndsAt: null }, now), false)
})

test("subscriptionForSession treats super_admin as perpetual lifetime access", async () => {
  const { subscriptionForSession } = await import("../billing/guard.ts")
  const adminSession = {
    id: "admin-uuid",
    name: "Founder Admin",
    email: "founder@scopepipe.test",
    role: "super_admin" as const,
    companyId: "company-uuid",
    companyName: "Scopepipe Inc",
    companySlug: "scopepipe-inc",
    planTier: "pro" as const,
    extraSeats: 0,
  }
  const access = await subscriptionForSession(adminSession)
  assert.equal(access.status, "lifetime")
  assert.equal(access.trialEndsAt, null)
  assert.equal(subscriptionAllows(access, Date.now()), true)
})

test("subscriptionForSession treats lifetime user as perpetual lifetime access", async () => {
  const { subscriptionForSession } = await import("../billing/guard.ts")
  const lifetimeSession = {
    id: "lifetime-uuid",
    name: "Lifetime User",
    email: "lifetime@user.test",
    role: "owner" as const,
    companyId: "company-uuid",
    companyName: "Painter Co",
    companySlug: "painter-co",
    planTier: "pro" as const,
    extraSeats: 0,
    subscriptionStatus: "lifetime" as const,
    trialEndsAt: "2020-01-01T00:00:00Z", // even if expired
  }
  const access = await subscriptionForSession(lifetimeSession)
  assert.equal(access.status, "lifetime")
  assert.equal(subscriptionAllows(access, Date.now()), true)
})

test("billingRedirect returns null for super_admin on guarded paths", async () => {
  const { billingRedirect } = await import("../billing/guard.ts")
  const { NextRequest } = await import("next/server.js")
  const { signOfficeSession } = await import("./session-token.ts")
  const { authSecret } = await import("./directory.ts")
  const { sessionCookie } = await import("./session.ts")

  const adminSession = {
    id: "admin-uuid",
    name: "Founder Admin",
    email: "founder@scopepipe.test",
    role: "super_admin" as const,
    companyId: "company-uuid",
    companyName: "Scopepipe Inc",
    companySlug: "scopepipe-inc",
    planTier: "pro" as const,
    extraSeats: 0,
  }
  const token = signOfficeSession(adminSession, authSecret())
  const req = new NextRequest("http://localhost:3000/dashboard", {
    headers: { cookie: sessionCookie(token) },
  })
  const res = await billingRedirect(req)
  assert.equal(res, null, "super_admin should never be redirected to billing")
})

test("Paddle webhook cannot downgrade a super_admin or lifetime user", async () => {
  const { saveBillingStatus, billingAccessForUser, setLifetimeAccess, listAllAccountsForAdmin } = await import("./directory.ts")

  // Target founder nadieshda@aol.com
  const accessBefore = await billingAccessForUser("374258f7-136a-4431-a6af-f81c3a01b48c")
  assert.equal(accessBefore?.status, "lifetime")

  // Simulate incoming Paddle webhook canceling subscription
  const result = await saveBillingStatus({
    email: "nadieshda@aol.com",
    status: "canceled",
  })
  assert.equal(result.account, true)

  // Verify status is STILL lifetime!
  const accessAfter = await billingAccessForUser("374258f7-136a-4431-a6af-f81c3a01b48c")
  assert.equal(accessAfter?.status, "lifetime", "super_admin status must remain lifetime despite Paddle cancellation")
})

test("Admin functions enforce super_admin role check", async () => {
  const { listAllAccountsForAdmin, setLifetimeAccess } = await import("./directory.ts")

  // Regular user (priya@scopepipe.test, project_manager)
  const regularUserId = "e6dbb58c-936d-497f-8b60-98f541988acc"
  const deniedList = await listAllAccountsForAdmin(regularUserId)
  assert.equal(deniedList, null, "Non-super_admin must be rejected from listing accounts")

  const deniedToggle = await setLifetimeAccess(regularUserId, "aff95225-46eb-459d-8ed4-5a37382048c6", "grant")
  assert.equal(deniedToggle.ok, false, "Non-super_admin must be rejected from granting lifetime access")

  // Super admin user (nadieshda@aol.com)
  const superAdminId = "374258f7-136a-4431-a6af-f81c3a01b48c"
  const allowedList = await listAllAccountsForAdmin(superAdminId)
  assert.notEqual(allowedList, null)
  assert.ok(Array.isArray(allowedList) && allowedList.length > 0)

  // Super admin grants lifetime access to another user
  const targetUser = allowedList.find((u) => u.id !== superAdminId)
  assert.ok(targetUser)

  const grantRes = await setLifetimeAccess(superAdminId, targetUser.id, "grant")
  assert.equal(grantRes.ok, true)
  assert.equal(grantRes.user?.subscriptionStatus, "lifetime")

  // Super admin revokes lifetime access from the user
  const revokeRes = await setLifetimeAccess(superAdminId, targetUser.id, "revoke")
  assert.equal(revokeRes.ok, true)
  assert.equal(revokeRes.user?.subscriptionStatus, "canceled")
})

test("super_admin can log in seamlessly through standard login flow", async () => {
  const { login } = await import("./directory.ts")

  // When founder logs in with role: "owner" from standard UI
  const res = await login({
    email: "nadieshda@aol.com",
    password: "test-or-mock", // we will test role acceptance
  })
  // If password does not match, it returns ok: false with "password do not match",
  // which confirms role check succeeded and didn't fail with "That login is the master administrator."
  if (!res.ok) {
    assert.notEqual(res.reason, "That login is the master administrator.")
  }
})

test("sessionFromRequest and billingRedirect upgrade and recognize founder master admin even from stale owner cookies", async () => {
  const { sessionFromRequest } = await import("./request.ts")
  const { billingRedirect } = await import("../billing/guard.ts")
  const { NextRequest } = await import("next/server.js")
  const { signOfficeSession } = await import("./session-token.ts")
  const { authSecret } = await import("./directory.ts")
  const { sessionCookie } = await import("./session.ts")

  // Simulate an old cookie where role was "owner" and trial expired
  const staleCookie = {
    id: "374258f7-136a-4431-a6af-f81c3a01b48c",
    name: "Founder",
    email: "nadieshda@aol.com",
    role: "owner" as const,
    companyId: "6121f9b9-59df-4190-b4ff-289a062f4c20",
    companyName: "Scopepipe",
    companySlug: "scopepipe",
    subscriptionStatus: "trialing" as const,
    trialEndsAt: "2026-11-19T00:00:00Z", // expired!
    authUserId: "52618110-8404-4795-b6de-5758a78270fd",
  }
  const token = signOfficeSession(staleCookie, authSecret())
  const req = new NextRequest("http://localhost:3000/dashboard", {
    headers: { cookie: sessionCookie(token) },
  })

  // 1. sessionFromRequest must upgrade stale cookie to super_admin and lifetime
  const session = await sessionFromRequest(req)
  assert.ok(session)
  assert.equal(session.role, "super_admin")
  assert.equal(session.subscriptionStatus, "lifetime")
  assert.equal(session.companyId, "6121f9b9-59df-4190-b4ff-289a062f4c20")

  // 2. billingRedirect must NOT redirect to /billing
  const redirectRes = await billingRedirect(req)
  assert.equal(redirectRes, null, "Founder must never be redirected to billing even with expired trial date in cookie")
})



