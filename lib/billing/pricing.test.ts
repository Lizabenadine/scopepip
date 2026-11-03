import assert from "node:assert/strict"
import test from "node:test"
import { readPricingCatalog, visitorCountry } from "./pricing.ts"

const token = "live_exampletoken"
const prices = {
  PADDLE_PRICE_STARTER_MONTH: "pri_startermonth",
  PADDLE_PRICE_STARTER_YEAR: "pri_starteryear1",
  PADDLE_PRICE_PRO_MONTH: "pri_promonthprice",
  PADDLE_PRICE_PRO_YEAR: "pri_proyearprice1",
  PADDLE_PRICE_ADVANCED_MONTH: "pri_advancedmon",
  PADDLE_PRICE_ADVANCED_YEAR: "pri_advancedyear",
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

test("pricing catalog only asks for the plans that are on the page", () => {
  const result = readPricingCatalog({ PADDLE_ENV: "live", PADDLE_CLIENT_TOKEN: token })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.message, /PADDLE_PRICE_PRO_MONTH/)
    assert.match(result.message, /PADDLE_PRICE_PRO_YEAR/)
    assert.doesNotMatch(result.message, /PADDLE_PRICE_STARTER_MONTH/)
    assert.doesNotMatch(result.message, /PADDLE_PRICE_ADVANCED_YEAR/)
  }
})

test("pricing catalog shows Pro while Starter and Advanced stay off the page", () => {
  const result = readPricingCatalog({ PADDLE_ENV: "live", PADDLE_CLIENT_TOKEN: token, ...prices })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.catalog.environment, "production")
    assert.deepEqual(
      result.catalog.tiers.map((tier) => tier.name),
      ["Pro"],
    )
    assert.equal(result.catalog.tiers[0]?.priceId.year, prices.PADDLE_PRICE_PRO_YEAR)
  }
})
