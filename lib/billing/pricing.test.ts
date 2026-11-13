import assert from "node:assert/strict"
import test from "node:test"
import { isExtraSeatPriceId, planTierFromPriceId, readPricingCatalog, visitorCountry } from "./pricing.ts"

const token = "live_exampletoken"
const prices = {
  PADDLE_PRICE_STARTER_MONTH: "pri_startermonth",
  PADDLE_PRICE_STARTER_YEAR: "pri_starteryear1",
  PADDLE_PRICE_PRO_MONTH: "pri_promonthprice",
  PADDLE_PRICE_PRO_YEAR: "pri_proyearprice1",
  PADDLE_PRICE_BUSINESS_MONTH: "pri_businessmonth",
  PADDLE_PRICE_BUSINESS_YEAR: "pri_businessyear1",
}

test("visitor country stays off the Paddle request when the header is missing or a sentinel", () => {
  assert.equal(visitorCountry(null), undefined)
  assert.equal(visitorCountry(""), undefined)
  assert.equal(visitorCountry("OTHERS"), undefined)
  assert.equal(visitorCountry("us"), "US")
})

test("pricing catalog fails when the Paddle environment is unset", () => {
  const result = readPricingCatalog({ PADDLE_CLIENT_TOKEN: token, ...prices })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /PADDLE_ENV/)
})

test("a live environment rejects a sandbox token", () => {
  const result = readPricingCatalog({ PADDLE_ENV: "live", PADDLE_CLIENT_TOKEN: "test_exampletoken", ...prices })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /live_/)
})

test("pricing catalog validates all restored plans when prices are missing", () => {
  const result = readPricingCatalog({ PADDLE_ENV: "live", PADDLE_CLIENT_TOKEN: token })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.message, /PADDLE_PRICE_STARTER_MONTH/)
    assert.match(result.message, /PADDLE_PRICE_PRO_MONTH/)
    assert.match(result.message, /PADDLE_PRICE_BUSINESS_MONTH/)
  }
})

test("pricing catalog shows all three restored tiers: Starter, Pro, and Business", () => {
  const result = readPricingCatalog({ PADDLE_ENV: "live", PADDLE_CLIENT_TOKEN: token, ...prices })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.catalog.environment, "production")
    assert.deepEqual(
      result.catalog.tiers.map((tier) => tier.name),
      ["Starter", "Pro", "Business"],
    )
    assert.equal(result.catalog.tiers[0]?.monthlyPrice, 29)
    assert.equal(result.catalog.tiers[1]?.monthlyPrice, 49)
    assert.equal(result.catalog.tiers[2]?.monthlyPrice, 79)
    assert.equal(result.catalog.tiers[1]?.popular, true)
    assert.equal(result.catalog.tiers[2]?.extraSeatAvailable, true)
  }
})

test("rejects Pro fallback price when reused for Starter or Business", () => {
  const proFallbackPrices = {
    PADDLE_PRICE_STARTER_MONTH: "pri_promonthprice",
    PADDLE_PRICE_STARTER_YEAR: "pri_proyearprice1",
    PADDLE_PRICE_PRO_MONTH: "pri_promonthprice",
    PADDLE_PRICE_PRO_YEAR: "pri_proyearprice1",
    PADDLE_PRICE_BUSINESS_MONTH: "pri_promonthprice",
    PADDLE_PRICE_BUSINESS_YEAR: "pri_proyearprice1",
  }
  const result = readPricingCatalog({ PADDLE_ENV: "live", PADDLE_CLIENT_TOKEN: token, ...proFallbackPrices })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.message, /cannot reuse Pro price/)
  }
})

test("planTierFromPriceId resolves correct plan tier from price IDs", () => {
  assert.equal(planTierFromPriceId("pri_startermonth", prices), "starter")
  assert.equal(planTierFromPriceId("pri_starteryear1", prices), "starter")
  assert.equal(planTierFromPriceId("pri_promonthprice", prices), "pro")
  assert.equal(planTierFromPriceId("pri_proyearprice1", prices), "pro")
  assert.equal(planTierFromPriceId("pri_businessmonth", prices), "business")
  assert.equal(planTierFromPriceId("pri_businessyear1", prices), "business")
  assert.equal(planTierFromPriceId("pri_unknown", prices), undefined)
})

test("isExtraSeatPriceId recognizes extra seat prices", () => {
  const envWithSeat = {
    ...prices,
    PADDLE_PRICE_EXTRA_SEAT_MONTH: "pri_extraseatmo",
    PADDLE_PRICE_EXTRA_SEAT_YEAR: "pri_extraseatyr",
  }
  assert.equal(isExtraSeatPriceId("pri_extraseatmo", envWithSeat), true)
  assert.equal(isExtraSeatPriceId("pri_extraseatyr", envWithSeat), true)
  assert.equal(isExtraSeatPriceId("pri_promonthprice", envWithSeat), false)
})
