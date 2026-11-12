import { expect, test } from "@playwright/test"

test("dashboard summary and metric cards navigate cleanly on desktop and mobile with keyboard support", async ({
  browser,
}) => {
  const stamp = `dash-links-${Date.now()}`

  // Sign up once in a desktop context to seed an authenticated account.
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await desktopContext.newPage()

  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Dashboard Tester")
  await page.getByLabel("Company name").fill("Dash Paint Co")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByTestId("dashboard-overview")).toBeVisible()

  // Both large summary cards navigate cleanly.
  await expect(page.getByTestId("summary-card-sales-pipeline")).toHaveAttribute("href", "/sales-pipeline")
  await expect(page.getByTestId("summary-card-jobs-pipeline")).toHaveAttribute("href", "/dispatch")

  await page.getByTestId("summary-card-sales-pipeline").click()
  await expect(page).toHaveURL(/\/sales-pipeline$/)
  await expect(page.getByTestId("sales-pipeline")).toBeVisible()

  await page.goto("/dashboard")
  await page.getByTestId("summary-card-jobs-pipeline").click()
  await expect(page).toHaveURL(/\/dispatch$/)
  await expect(page.getByTestId("jobs-pipeline")).toBeVisible()

  // Verify keyboard activation + direct stage navigation and desktop column highlighting for all 6 metric cards.
  const cases = [
    { card: "new_leads", url: /\/sales-pipeline\?stage=cold$/, stage: "cold" },
    { card: "estimates_sent", url: /\/sales-pipeline\?stage=proposal_sent$/, stage: "proposal_sent" },
    { card: "accepted", url: /\/dispatch\?stage=project_accepted$/, stage: "project_accepted" },
    { card: "scheduled", url: /\/dispatch\?stage=project_scheduled$/, stage: "project_scheduled" },
    { card: "completed", url: /\/dispatch\?stage=project_completed$/, stage: "project_completed" },
    { card: "revenue", url: /\/dispatch\?stage=project_accepted$/, stage: "project_accepted" },
  ] as const

  for (const item of cases) {
    await page.goto("/dashboard")
    const card = page.getByTestId(`metric-card-${item.card}`)
    await expect(card).toBeVisible()
    await card.focus()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(item.url)
    const column = page.getByTestId(`column-${item.stage}`)
    await expect(column).toBeVisible()
    await expect(column).toHaveAttribute("data-highlighted", "true")
  }

  // Mobile single-stage verification across both Sales and Jobs pipelines.
  const cookies = await desktopContext.cookies()
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await mobileContext.addCookies(cookies)
  const mobilePage = await mobileContext.newPage()

  await mobilePage.goto("/dashboard")
  await mobilePage.getByTestId("metric-card-estimates_sent").click()
  await expect(mobilePage).toHaveURL(/\/sales-pipeline\?stage=proposal_sent$/)
  await expect(mobilePage.getByTestId("mobile-stage-tab-proposal_sent")).toHaveAttribute("aria-selected", "true")
  await expect(mobilePage.getByTestId("column-proposal_sent")).toBeVisible()
  await expect(mobilePage.getByTestId("column-cold")).toBeHidden()

  await mobilePage.goto("/dashboard")
  await mobilePage.getByTestId("metric-card-scheduled").click()
  await expect(mobilePage).toHaveURL(/\/dispatch\?stage=project_scheduled$/)
  await expect(mobilePage.getByTestId("mobile-stage-tab-project_scheduled")).toHaveAttribute("aria-selected", "true")
  await expect(mobilePage.getByTestId("column-project_scheduled")).toBeVisible()
  await expect(mobilePage.getByTestId("column-project_accepted")).toBeHidden()

  await mobileContext.close()
})
