import { expect, test } from "@playwright/test"

test("Help Center provides searchable, categorized step-by-step guides with in-app links", async ({
  browser,
}) => {
  const stamp = `help-center-${Date.now()}`

  // 1. Desktop context
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Help Guide Tester")
  await page.getByLabel("Company name").fill("Help Paint Co")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // 2. Open Help Center from header
  const helpLink = page.getByTestId("nav-help")
  await expect(helpLink).toBeVisible()
  await helpLink.click()
  await expect(page).toHaveURL(/\/help$/)

  // Verify Help Center title
  await expect(page.getByRole("heading", { name: "Help Center" })).toBeVisible()

  // 3. Verify all 11 guide sections exist
  const expectedSections = [
    "quick-start",
    "estimating",
    "proposals",
    "sketch-notes",
    "voice-notes",
    "paint-buy-lists",
    "sales-pipeline",
    "work-orders",
    "spanish-crew",
    "team-management",
    "billing-plans",
  ]

  for (const id of expectedSections) {
    await expect(page.getByTestId(`guide-section-${id}`)).toBeVisible()
  }

  // 4. Test live search filtering
  const searchInput = page.getByTestId("help-search-input")
  await expect(searchInput).toBeVisible()

  // Search for "voice" -> Only voice-notes guide matches
  await searchInput.fill("voice")
  await expect(page.getByTestId("guide-section-voice-notes")).toBeVisible()
  await expect(page.getByTestId("guide-section-quick-start")).toBeHidden()
  await expect(page.getByText(/matching "voice"/i)).toBeVisible()

  // Search for "sketch" -> Shows sketch-notes
  await searchInput.fill("sketch")
  await expect(page.getByTestId("guide-section-sketch-notes")).toBeVisible()
  await expect(page.getByTestId("guide-section-estimating")).toBeHidden()

  // Clear search restores all
  await page.getByTitle("Clear search").click()
  await expect(page.getByTestId("guide-section-quick-start")).toBeVisible()
  await expect(page.getByTestId("guide-section-estimating")).toBeVisible()

  // 5. Test category filter chips
  await page.getByTestId("help-category-spanish-crew-sheets").click()
  await expect(page.getByTestId("guide-section-spanish-crew")).toBeVisible()
  await expect(page.getByTestId("guide-section-quick-start")).toBeHidden()

  // Reset category filter
  await page.getByTestId("help-category-all").click()
  await expect(page.getByTestId("guide-section-quick-start")).toBeVisible()

  // 6. Test in-app link from Sketches screen
  await page.goto("/sketches")
  const sketchGuideLink = page.getByTitle("View Sketch & Notes Guide")
  await expect(sketchGuideLink).toBeVisible()
  await sketchGuideLink.click()
  await expect(page).toHaveURL(/\/help#sketch-notes$/)
  await expect(page.getByTestId("guide-section-sketch-notes")).toBeVisible()

  // 7. Mobile responsiveness verification
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const cookies = await context.cookies()
  await mobileContext.addCookies(cookies)
  const mobilePage = await mobileContext.newPage()

  await mobilePage.goto("/help")
  await expect(mobilePage.getByRole("heading", { name: "Help Center" })).toBeVisible()
  await expect(mobilePage.getByTestId("help-search-input")).toBeVisible()

  // Test mobile search
  await mobilePage.getByTestId("help-search-input").fill("paddle")
  await expect(mobilePage.getByTestId("guide-section-billing-plans")).toBeVisible()

  await mobileContext.close()
  await context.close()
})
