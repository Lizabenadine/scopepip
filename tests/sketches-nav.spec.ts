import { expect, test } from "@playwright/test"

test("Daily Sketch & Notes tab is visible in navigation on desktop and mobile and opens /sketches", async ({
  browser,
}) => {
  const stamp = `sketches-nav-${Date.now()}`

  // Desktop verification
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await desktopContext.newPage()

  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Sketch Nav Tester")
  await page.getByLabel("Company name").fill("Sketch Paint Co")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // 1. Desktop: "Daily Sketch & Notes" tab is clearly visible in the main navigation bar
  const desktopTab = page.locator("[data-nav-root='bar'] a[href='/sketches']")
  await expect(desktopTab).toBeVisible()
  await expect(desktopTab).toHaveText("Daily Sketch & Notes")

  // 2. Click opens /sketches
  await desktopTab.click()
  await expect(page).toHaveURL(/\/sketches$/)
  await expect(page.getByRole("heading", { name: "Daily Sketch & Notes" })).toBeVisible()
  await expect(page.getByRole("button", { name: /new sketch/i }).first()).toBeVisible()

  // Mobile verification
  const cookies = await desktopContext.cookies()
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await mobileContext.addCookies(cookies)
  const mobilePage = await mobileContext.newPage()

  await mobilePage.goto("/dashboard")

  // 3. Mobile dock: tab is visible and links directly to /sketches
  const mobileDockTab = mobilePage.locator("[data-nav-root='dock'] a[href='/sketches']")
  await expect(mobileDockTab).toBeVisible()
  await expect(mobileDockTab).toContainText("Sketches")

  // 4. Mobile: tapping the tab navigates to /sketches
  await mobileDockTab.click()
  await expect(mobilePage).toHaveURL(/\/sketches$/)
  await expect(mobilePage.getByRole("heading", { name: "Daily Sketch & Notes" })).toBeVisible()

  // 5. Also verify inside the Daily menu on mobile
  await mobilePage.goto("/dashboard")
  await mobilePage.locator("[data-nav-root='dock'] [data-testid='nav-section-daily']").click()
  const dailyMenuItem = mobilePage.locator("[data-nav-root='dock'] [role='menu'] a[href='/sketches']")
  await expect(dailyMenuItem).toBeVisible()
  await expect(dailyMenuItem).toHaveText("Daily Sketch & Notes")
  await dailyMenuItem.click()
  await expect(mobilePage).toHaveURL(/\/sketches$/)

  await mobileContext.close()
})
