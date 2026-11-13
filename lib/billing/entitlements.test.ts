import assert from "node:assert/strict"
import test from "node:test"
import { maxSeatsForPlan, planHasFeatureAccess } from "./entitlement.ts"

test("plan seat limits reflect tier allowances", () => {
  assert.equal(maxSeatsForPlan("starter"), 1)
  assert.equal(maxSeatsForPlan("pro"), 3)
  assert.equal(maxSeatsForPlan("business"), 5)
  // Business with extra paid seats
  assert.equal(maxSeatsForPlan("business", 2), 7)
  assert.equal(maxSeatsForPlan("business", 5), 10)
  // Starter and Pro do not accept extra seats
  assert.equal(maxSeatsForPlan("starter", 2), 1)
  assert.equal(maxSeatsForPlan("pro", 2), 3)
})

test("all plans have access to core estimating, proposals, buy lists, pipeline, spanish crew sheets, and sketch & notes", () => {
  for (const tier of ["starter", "pro", "business"] as const) {
    assert.equal(planHasFeatureAccess(tier, "mobileEstimating", "active").allowed, true)
    assert.equal(planHasFeatureAccess(tier, "proposals", "active").allowed, true)
    assert.equal(planHasFeatureAccess(tier, "paintBuyLists", "active").allowed, true)
    assert.equal(planHasFeatureAccess(tier, "salesPipeline", "active").allowed, true)
    assert.equal(planHasFeatureAccess(tier, "bilingualWorkOrders", "active").allowed, true)
    assert.equal(planHasFeatureAccess(tier, "sketchAndNotes", "active").allowed, true)
  }
})

test("video proposals is permitted on Pro and Business, but gated on Starter", () => {
  assert.equal(planHasFeatureAccess("starter", "videoProposals", "active").allowed, false)
  assert.equal(planHasFeatureAccess("starter", "videoProposals", "active").requiredPlan, "pro")
  assert.equal(planHasFeatureAccess("pro", "videoProposals", "active").allowed, true)
  assert.equal(planHasFeatureAccess("business", "videoProposals", "active").allowed, true)
})

test("voice notes, smart follow-ups, and facebook messenger are gated to Business plan", () => {
  // Starter
  assert.equal(planHasFeatureAccess("starter", "voiceNotes", "active").allowed, false)
  assert.equal(planHasFeatureAccess("starter", "smartFollowUps", "active").allowed, false)
  assert.equal(planHasFeatureAccess("starter", "facebookMessenger", "active").allowed, false)

  // Pro
  assert.equal(planHasFeatureAccess("pro", "voiceNotes", "active").allowed, false)
  assert.equal(planHasFeatureAccess("pro", "smartFollowUps", "active").allowed, false)
  assert.equal(planHasFeatureAccess("pro", "facebookMessenger", "active").allowed, false)

  // Business
  assert.equal(planHasFeatureAccess("business", "voiceNotes", "active").allowed, true)
  assert.equal(planHasFeatureAccess("business", "smartFollowUps", "active").allowed, true)
  assert.equal(planHasFeatureAccess("business", "facebookMessenger", "active").allowed, true)
})

test("trial accounts have full access to all features during 14-day evaluation", () => {
  assert.equal(planHasFeatureAccess("starter", "voiceNotes", "trialing").allowed, true)
  assert.equal(planHasFeatureAccess("starter", "smartFollowUps", "trialing").allowed, true)
  assert.equal(planHasFeatureAccess("starter", "facebookMessenger", "trialing").allowed, true)
  assert.equal(planHasFeatureAccess("starter", "videoProposals", "trialing").allowed, true)
})
