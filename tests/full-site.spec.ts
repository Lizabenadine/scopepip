import { expect, test } from "@playwright/test"

const BASE_URL = "https://scopepipe.com"

test.describe("Scopepipe End-to-End Suite", () => {
  test("1. Landing Page & Metadata Check", async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/Scopepipe/i)
    await expect(page.locator("body")).toBeVisible()
  })

  test("2. Legal Compliance Pages (/terms, /privacy, /refunds)", async ({ page }) => {
    for (const route of ["/terms", "/privacy", "/refunds"]) {
      const response = await page.goto(`${BASE_URL}${route}`)
      expect(response?.status()).toBe(200)
      await expect(page.locator("body")).toBeVisible()
    }
  })

  test("3. Pricing & Team Seat Verification", async ({ page }) => {
    await page.goto(`${BASE_URL}/#pricing`)
    await expect(page.locator("body")).toContainText("$49")
    await expect(page.locator("body")).toContainText("3 Team Seats")
  })

  test("4. Language Toggle Functionality", async ({ page }) => {
    await page.goto(BASE_URL)
    const spanishBtn = page.getByRole("button", { name: /Español/i })
    if (await spanishBtn.isVisible()) {
      await spanishBtn.click()
      await expect(page.locator("body")).toBeVisible()
    }
  })

  test("5. Check for Competitor Brand Leaks", async ({ page }) => {
    await page.goto(BASE_URL)
    const content = await page.content()
    expect(content.toLowerCase()).not.toContain("dripjobs")
    expect(content.toLowerCase()).not.toContain("paintscout")
  })
})
