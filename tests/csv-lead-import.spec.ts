import { expect, test } from "@playwright/test"

test("CSV Lead Import: preview, duplicate detection, and batch import to Sales Pipeline", async ({
  browser,
}) => {
  const stamp = `csv-import-${Date.now()}`
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  // 1. Sign up a new contractor account
  await page.goto("/signup")
  await page.getByLabel("Your name").fill("CSV Lead Tester")
  await page.getByLabel("Company name").fill("Apex Painting Co")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // 2. Add an existing lead to test duplicate detection later
  await page.goto("/sales-pipeline")
  const newLeadBtn = page.getByTestId("new-lead")
  await expect(newLeadBtn).toBeVisible()
  await newLeadBtn.click()
  await page.getByTestId("lead-name").fill("Existing Homeowner")
  await page.getByTestId("lead-phone").fill("5035550199")
  await page.getByTestId("lead-email").fill("existing@example.com")
  await page.getByTestId("lead-address").fill("999 Willow Rd, Portland, OR")
  await page.getByRole("button", { name: "Save lead" }).click()
  await expect(page.getByText("Existing Homeowner")).toBeVisible()

  // 3. Verify Import Leads button is visible on /sales-pipeline and /leads
  const importBtn = page.getByTestId("import-leads")
  await expect(importBtn).toBeVisible()

  // Test /leads route as well
  await page.goto("/leads")
  await expect(page.getByTestId("import-leads")).toBeVisible()
  await page.getByTestId("import-leads").click()

  // 4. Test CSV input via paste textarea
  await page.getByRole("button", { name: /Paste CSV text instead/i }).click()
  const textarea = page.getByTestId("csv-paste-textarea")
  await expect(textarea).toBeVisible()

  const sampleCsv = `Full Name,Phone Number,Email Address,Street Address,Notes
Michael Jordan,503-555-2323,mj@bulls.test,23 United Center Dr,Full interior repaint
Dup Phone Guy,(503) 555-0199,different@example.com,101 Oak St,Duplicate phone number
Dup Email Gal,503-555-7777,existing@example.com,202 Pine St,Duplicate email address
In-File Repeat,503-555-2323,another@test.com,303 Maple St,Repeated phone in file
Missing Contact, , ,404 Nowhere Rd,No phone or email
,,orphan@test.com,505 Empty St,Missing name`

  await textarea.fill(sampleCsv)
  await page.getByTestId("csv-paste-submit").click()

  // 5. Verify Preview screen & Duplicate Detection
  await expect(page.getByTestId("preview-total-count")).toHaveText("6")
  await expect(page.getByTestId("preview-valid-count")).toHaveText("1") // only Michael Jordan
  await expect(page.getByTestId("preview-duplicate-count")).toHaveText("3") // Dup Phone, Dup Email, In-File Repeat
  await expect(page.getByTestId("preview-invalid-count")).toHaveText("2") // Missing Contact, Missing name

  // Check column mapping display
  await expect(page.getByText("Name ← Full Name")).toBeVisible()
  await expect(page.getByText("Phone ← Phone Number")).toBeVisible()
  await expect(page.getByText("Email ← Email Address")).toBeVisible()

  // 6. Confirm import
  const confirmBtn = page.getByTestId("confirm-import-leads")
  await expect(confirmBtn).toBeVisible()
  await expect(confirmBtn).toHaveText(/Import 1 Leads/i)
  await confirmBtn.click()

  // 7. Verify Results screen
  await expect(page.getByText("Leads Successfully Imported!")).toBeVisible()
  await expect(page.getByTestId("result-imported-count")).toHaveText("1 leads")
  await expect(page.getByTestId("result-skipped-count")).toHaveText("3 leads")
  await expect(page.getByTestId("result-failed-count")).toHaveText("2 rows")
  await expect(page.getByTestId("result-total-count")).toHaveText("6 rows")

  // 8. Close dialog and verify lead appears in Pipeline
  await page.getByTestId("close-import-dialog").click()
  await expect(page.getByText("Michael Jordan")).toBeVisible()
  await expect(page.getByText("23 United Center Dr")).toBeVisible()

  // 9. Verify Settings -> Integrations link
  await page.goto("/settings?tab=integrations")
  const sheetsAction = page.getByTestId("integration-action-google-sheets")
  await expect(sheetsAction).toBeVisible()
  await sheetsAction.click()

  await expect(page.getByTestId("export-csv-leads")).toBeVisible()
  const settingsImportBtn = page.getByRole("button", { name: "Import Leads CSV" })
  await expect(settingsImportBtn).toBeVisible()
  await settingsImportBtn.click()
  await expect(page.getByRole("heading", { name: "Import Leads from CSV" })).toBeVisible()

  await context.close()
})
